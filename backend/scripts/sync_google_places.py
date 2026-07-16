#!/usr/bin/env python3
"""
Sync Google Places (New) reviews + photos into the Siya public website CMS.

Prerequisites
-------------
1. Enable **Places API (New)** for your GCP project:
   https://console.cloud.google.com/apis/library/places.googleapis.com
2. Restrict the API key (HTTP referrers for frontend keys; IP for server keys).
3. Put the key in backend/.env:
   GOOGLE_PLACES_API_KEY=...

Usage
-----
  cd backend
  source .venv/bin/activate
  python scripts/sync_google_places.py

What it does
------------
- Finds each clinic on Google by name/address (or google_place_id if set)
- Pulls rating, review count, up to 5 reviews, and up to 8 photos
- Saves photos under frontend/public/brand/google/
- Upserts site_theme rating fields + site_testimonials + gallery_images
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# backend/ is cwd or parent of scripts/
ROOT = Path(__file__).resolve().parents[1]
FRONTEND_PUBLIC = ROOT.parent / "frontend" / "public" / "brand" / "google"
ENV_FILE = ROOT / ".env"

# Known queries for the two Rourkela branches (override via DB google_place_id)
CLINIC_QUERIES = {
    "a1111111-1111-1111-1111-111111111111": {
        "label": "Daily Market",
        "query": "Siya Dental Care Daily Market Udit Nagar Rourkela",
        "maps_uri_hint": "https://maps.app.goo.gl/154btrueSouxXoRQ6",
    },
    "b2222222-2222-2222-2222-222222222222": {
        "label": "Jhirpani",
        "query": "Siya Dental Care Jhirpani Rourkela Wonder Medicine Complex",
        "maps_uri_hint": None,
    },
}


def load_env() -> dict:
    env = dict(os.environ)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def http_json(method: str, url: str, headers: dict | None = None, body: dict | None = None) -> dict:
    data = None
    hdrs = dict(headers or {})
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"raw": err_body}
        raise RuntimeError(f"HTTP {e.code} {url}: {parsed}") from e


def search_place(api_key: str, text_query: str) -> dict | None:
    data = http_json(
        "POST",
        "https://places.googleapis.com/v1/places:searchText",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": ",".join(
                [
                    "places.id",
                    "places.displayName",
                    "places.formattedAddress",
                    "places.location",
                    "places.rating",
                    "places.userRatingCount",
                    "places.googleMapsUri",
                    "places.nationalPhoneNumber",
                    "places.internationalPhoneNumber",
                ]
            ),
        },
        body={"textQuery": text_query, "maxResultCount": 3},
    )
    places = data.get("places") or []
    return places[0] if places else None


def get_place_details(api_key: str, place_id: str) -> dict:
    # place_id may already be "places/ChIJ..." or bare "ChIJ..."
    resource = place_id if place_id.startswith("places/") else f"places/{place_id}"
    field_mask = ",".join(
        [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "googleMapsUri",
            "nationalPhoneNumber",
            "internationalPhoneNumber",
            "reviews",
            "photos",
            "regularOpeningHours",
            "websiteUri",
        ]
    )
    return http_json(
        "GET",
        f"https://places.googleapis.com/v1/{resource}",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": field_mask,
        },
    )


def download_photo(api_key: str, photo_name: str, dest: Path, max_width: int = 1200) -> bool:
    """photo_name like places/XXX/photos/YYY — media endpoint."""
    url = (
        f"https://places.googleapis.com/v1/{photo_name}/media"
        f"?maxWidthPx={max_width}&key={urllib.parse.quote(api_key)}"
    )
    try:
        req = urllib.request.Request(url, headers={"X-Goog-Api-Key": api_key})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
        return dest.stat().st_size > 500
    except Exception as e:
        print(f"  photo download failed: {e}")
        return False


def main() -> int:
    env = load_env()
    api_key = env.get("GOOGLE_PLACES_API_KEY") or env.get("GOOGLE_MAPS_API_KEY") or ""
    if not api_key:
        print("ERROR: Set GOOGLE_PLACES_API_KEY in backend/.env")
        return 1

    # DB via psycopg if available, else subprocess psql
    try:
        import psycopg2  # type: ignore
        from urllib.parse import urlparse

        db_url = env.get("DATABASE_URL", "")
        # postgresql+asyncpg://user@host/db → postgresql://...
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"ERROR: need psycopg2 and DATABASE_URL ({e})")
        print("pip install psycopg2-binary")
        return 1

    FRONTEND_PUBLIC.mkdir(parents=True, exist_ok=True)

    def explain_api_error(msg: str) -> None:
        print("\n❌ Google Places API call failed.\n")
        print(msg[:900])
        if "SERVICE_DISABLED" in msg or "not been used" in msg or "PERMISSION_DENIED" in msg:
            print(
                """
────────────────────────────────────────────────────────────
ENABLE THE API (one-time, ~2 minutes)
────────────────────────────────────────────────────────────
1. Open:
   https://console.cloud.google.com/apis/library/places.googleapis.com
2. Select the project that owns this API key
3. Click **Enable**
4. Billing must be on (Places has free monthly credit)
5. Wait 1–2 minutes, then re-run:
   python scripts/sync_google_places.py

Also recommended — restrict the key:
  Google Cloud Console → APIs & Services → Credentials → your key
  Application restrictions: None (local dev) or server IP
  API restrictions: Places API (New) only
────────────────────────────────────────────────────────────
"""
            )

    # Probe API once
    try:
        probe = search_place(api_key, "Siya Dental Care Rourkela")
    except RuntimeError as e:
        explain_api_error(str(e))
        return 2

    if not probe:
        print("No places found for Siya Dental Care Rourkela — try refining queries.")
    else:
        print("Probe OK:", (probe.get("displayName") or {}).get("text"), probe.get("id"))

    all_reviews: list[dict] = []
    best_rating = None
    best_count = 0
    best_maps_uri = None
    photo_count = 0
    any_ok = False

    for clinic_id, meta in CLINIC_QUERIES.items():
        print(f"\n=== {meta['label']} ===")
        cur.execute("SELECT google_place_id, address FROM clinics WHERE id = %s", (clinic_id,))
        row = cur.fetchone()
        place_id = (row[0] if row else None) or None
        details = None

        if place_id:
            try:
                details = get_place_details(api_key, place_id)
            except Exception as e:
                print(f"  stored place_id failed ({e}); searching…")
                place_id = None
                details = None

        if not details:
            try:
                place_summary = search_place(api_key, meta["query"])
            except RuntimeError as e:
                print(f"  search failed: {e}")
                # fallback: use probe result for first clinic only
                if probe and not any_ok:
                    place_summary = probe
                    print("  using probe match as fallback")
                else:
                    continue
            if not place_summary:
                print("  no match")
                continue
            place_id = place_summary.get("id")
            try:
                details = get_place_details(api_key, place_id)
            except RuntimeError as e:
                print(f"  details failed: {e}")
                # Use summary fields only
                details = place_summary

        if not details:
            continue
        any_ok = True

        name = (details.get("displayName") or {}).get("text") or meta["label"]
        rating = details.get("rating")
        count = details.get("userRatingCount") or 0
        maps_uri = details.get("googleMapsUri") or meta.get("maps_uri_hint")
        address = details.get("formattedAddress")
        loc = details.get("location") or {}
        lat, lng = loc.get("latitude"), loc.get("longitude")
        phone = details.get("internationalPhoneNumber") or details.get("nationalPhoneNumber")

        print(f"  {name}")
        print(f"  rating={rating} reviews={count}")
        print(f"  place_id={place_id}")

        # Update clinic place metadata (do NOT put API key into public embed URLs)
        cur.execute(
            """
            UPDATE clinics SET
              google_place_id = %s,
              google_maps_link = COALESCE(%s, google_maps_link),
              latitude = COALESCE(%s, latitude),
              longitude = COALESCE(%s, longitude),
              updated_at = now()
            WHERE id = %s
            """,
            (place_id, maps_uri, lat, lng, clinic_id),
        )

        if rating is not None and (best_rating is None or count >= best_count):
            best_rating = rating
            best_count = count
            best_maps_uri = maps_uri

        # Reviews — public marketing site only imports 4–5★ (honest; negatives stay on Google)
        for rev in details.get("reviews") or []:
            author = (rev.get("authorAttribution") or {}).get("displayName") or "Google user"
            text = (rev.get("text") or {}).get("text") or rev.get("originalText", {}).get("text") or ""
            stars = int(rev.get("rating") or 5)
            if not text.strip() or stars < 4:
                continue
            all_reviews.append(
                {
                    "patient_name": author[:100],
                    "rating": stars,
                    "text": text.strip()[:2000],
                    "treatment_type": None,
                    "source": "google",
                    "clinic": meta["label"],
                }
            )

        # Photos
        for i, photo in enumerate((details.get("photos") or [])[:8]):
            pname = photo.get("name")
            if not pname:
                continue
            slug = meta["label"].lower().replace(" ", "-")
            dest = FRONTEND_PUBLIC / f"{slug}-{i+1}.jpg"
            if download_photo(api_key, pname, dest):
                rel = f"/brand/google/{dest.name}"
                cur.execute(
                    """
                    INSERT INTO gallery_images (clinic_id, category, title, caption, image_url, order_idx, is_active)
                    SELECT %s, 'clinic', %s, %s, %s, %s, TRUE
                    WHERE NOT EXISTS (
                      SELECT 1 FROM gallery_images WHERE image_url = %s AND is_active = TRUE
                    )
                    """,
                    (
                        clinic_id,
                        f"{meta['label']} photo {i+1}",
                        f"From Google Business · {name}",
                        rel,
                        i,
                        rel,
                    ),
                )
                photo_count += 1
                print(f"  photo → {rel}")

    # Theme rating (best of branches / primary)
    if best_rating is not None:
        cur.execute(
            """
            UPDATE site_theme SET
              google_rating = %s,
              google_review_count = %s,
              google_reviews_url = COALESCE(%s, google_reviews_url),
              updated_at = now()
            WHERE id = 1
            """,
            (str(best_rating), str(best_count) + ("+" if best_count else ""), best_maps_uri),
        )
        print(f"\nTheme rating → {best_rating} ({best_count} reviews)")

    # Testimonials: replace previous google-sourced ones, keep manual
    if all_reviews:
        cur.execute("DELETE FROM site_testimonials WHERE source = 'google'")
        for idx, r in enumerate(all_reviews[:12]):
            cur.execute(
                """
                INSERT INTO site_testimonials
                  (patient_name, rating, text, treatment_type, source, is_featured, is_active, order_idx,
                   google_synced_at, google_publish_time, google_author_url, google_review_url,
                   google_flag_url, patient_photo_url)
                VALUES (%s, %s, %s, %s, 'google', %s, TRUE, %s,
                        now(), %s, %s, %s, %s, %s)
                """,
                (
                    r["patient_name"],
                    r["rating"],
                    r["text"],
                    r.get("clinic"),
                    idx < 3,
                    idx,
                    r.get("publish_time") or r.get("google_publish_time"),
                    r.get("author_url") or r.get("google_author_url"),
                    r.get("review_url") or r.get("google_review_url"),
                    r.get("flag_url") or r.get("google_flag_url"),
                    r.get("photo_url") or r.get("patient_photo_url"),
                ),
            )
        print(f"Testimonials inserted: {min(len(all_reviews), 12)}")

    cur.close()
    conn.close()
    if not any_ok:
        print("\nNo clinics synced. Enable Places API (New) and re-run.")
        return 2
    print(f"\n✅ Done. Photos: {photo_count}. Reviews: {len(all_reviews)}. Refresh the public website.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
