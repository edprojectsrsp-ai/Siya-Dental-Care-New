"""Fetch the current Google Places review sample for public clinic locations."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings

logger = logging.getLogger("siya.google_reviews")
PLACES_BASE_URL = "https://places.googleapis.com/v1"
DETAIL_FIELDS = "id,displayName,rating,userRatingCount,googleMapsUri,reviews"
SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.googleMapsUri"


def _review_text(review: dict[str, Any]) -> str:
    translated = (review.get("text") or {}).get("text")
    original = (review.get("originalText") or {}).get("text")
    return str(translated or original or "").strip()


def _review_time(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _place_search_query(clinic: dict[str, Any]) -> str:
    label = str(clinic.get("label") or clinic.get("name") or "").strip()
    address = str(clinic.get("address") or "").strip()
    parts = [part for part in [label, address, "Rourkela"] if part]
    return " ".join(parts)


async def sync_google_reviews(db: AsyncSession) -> dict[str, Any]:
    """Upsert the latest Google reviews without discarding older stored review history."""
    settings = get_settings()
    if not settings.GOOGLE_PLACES_API_KEY:
        return {"status": "disabled", "reason": "GOOGLE_PLACES_API_KEY is not configured"}

    # Prevent multiple API workers from billing and writing the same refresh concurrently.
    lock_acquired = (await db.execute(
        sql_text("SELECT pg_try_advisory_xact_lock(2026071601)")
    )).scalar()
    if not lock_acquired:
        await db.rollback()
        return {"status": "busy"}

    clinics = (await db.execute(sql_text("""
        SELECT id, name, COALESCE(short_name, name) AS label, address, google_place_id
        FROM clinics
        WHERE show_on_public_site = TRUE
          AND COALESCE(is_active, TRUE) = TRUE
        ORDER BY display_order, name
    """))).mappings().all()
    if not clinics:
        return {"status": "skipped", "reason": "No public clinic is enabled for the website"}

    synced_at = datetime.now(timezone.utc)
    fetched_reviews: list[dict[str, Any]] = []
    rating_total = 0.0
    rating_count = 0
    review_count = 0
    primary_maps_url: str | None = None
    successful_branches = 0
    errors: list[str] = []

    headers = {
        "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": DETAIL_FIELDS,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        for clinic in clinics:
            place_id = str(clinic["google_place_id"] or "").removeprefix("places/")
            if not place_id:
                query = _place_search_query(clinic)
                try:
                    search_response = await client.post(
                        f"{PLACES_BASE_URL}/places:searchText",
                        headers={
                            "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
                            "X-Goog-FieldMask": SEARCH_FIELDS,
                        },
                        json={"textQuery": query, "maxResultCount": 1},
                    )
                    search_response.raise_for_status()
                    places = (search_response.json().get("places") or [])
                    if not places:
                        errors.append(f"{clinic['label']}: no search match")
                        continue
                    place_id = str(places[0].get("id") or "").removeprefix("places/")
                    if not place_id:
                        errors.append(f"{clinic['label']}: missing place id in search result")
                        continue
                    await db.execute(sql_text("""
                        UPDATE clinics
                        SET google_place_id = :place_id,
                            updated_at = now()
                        WHERE id = :clinic_id
                    """), {"place_id": place_id, "clinic_id": clinic["id"]})
                except (httpx.HTTPError, ValueError) as exc:
                    errors.append(f"{clinic['label']}: search {type(exc).__name__}")
                    logger.warning("Google place discovery failed for %s: %s", clinic["label"], exc)
                    continue
            try:
                response = await client.get(
                    f"{PLACES_BASE_URL}/places/{place_id}",
                    headers=headers,
                    params={"languageCode": "en"},
                )
                response.raise_for_status()
                details = response.json()
            except (httpx.HTTPError, ValueError) as exc:
                errors.append(f"{clinic['label']}: {type(exc).__name__}")
                logger.warning("Google review sync failed for %s: %s", clinic["label"], exc)
                continue

            successful_branches += 1
            maps_url = details.get("googleMapsUri")
            if primary_maps_url is None and maps_url:
                primary_maps_url = str(maps_url)

            branch_count = int(details.get("userRatingCount") or 0)
            branch_rating = float(details.get("rating") or 0)
            if branch_count and branch_rating:
                review_count += branch_count
                rating_total += branch_rating * branch_count
                rating_count += branch_count

            for review in details.get("reviews") or []:
                text = _review_text(review)
                stars = max(1, min(5, int(review.get("rating") or 5)))
                if not text or stars < 4:
                    continue
                author = review.get("authorAttribution") or {}
                review_url = review.get("googleMapsUri") or maps_url
                fetched_reviews.append({
                    "google_review_name": review.get("name"),
                    "google_review_url": review_url,
                    "google_author_url": author.get("uri"),
                    "google_flag_url": review.get("flagContentUri"),
                    "google_publish_time": _review_time(review.get("publishTime")),
                    "google_place_id": place_id,
                    "patient_name": str(author.get("displayName") or "Google user")[:100],
                    "patient_photo_url": author.get("photoUri"),
                    "rating": stars,
                    "text": text[:2000],
                    "treatment_type": str(clinic["label"])[:100],
                })

    if successful_branches == 0:
        await db.rollback()
        return {"status": "error", "branches": 0, "errors": errors}

    # The Places response contains at most five relevance-ordered reviews per place.
    # Deduplicate defensively before replacing the previous temporary cache.
    unique_reviews: list[dict[str, Any]] = []
    seen: set[str] = set()
    for review in fetched_reviews:
        identity = str(
            review["google_review_name"]
            or review["google_review_url"]
            or f"{review['google_place_id']}:{review['patient_name']}:{review['text']}"
        )
        if identity in seen:
            continue
        seen.add(identity)
        unique_reviews.append(review)

    for idx, review in enumerate(unique_reviews):
        payload = {
            **review,
            "is_featured": idx < 4,
            "order_idx": idx,
            "google_synced_at": synced_at,
        }
        updated = False
        if review["google_review_name"]:
            result = await db.execute(sql_text("""
                UPDATE site_testimonials
                SET patient_name = :patient_name,
                    patient_photo_url = :patient_photo_url,
                    rating = :rating,
                    text = :text,
                    treatment_type = :treatment_type,
                    source = 'google',
                    is_featured = :is_featured,
                    is_active = TRUE,
                    order_idx = :order_idx,
                    google_review_url = :google_review_url,
                    google_author_url = :google_author_url,
                    google_flag_url = :google_flag_url,
                    google_publish_time = CAST(:google_publish_time AS timestamptz),
                    google_synced_at = :google_synced_at,
                    google_place_id = :google_place_id
                WHERE google_review_name = :google_review_name
                  AND source = 'google'
            """), payload)
            updated = (result.rowcount or 0) > 0
        if not updated:
            result = await db.execute(sql_text("""
                UPDATE site_testimonials
                SET patient_name = :patient_name,
                    patient_photo_url = :patient_photo_url,
                    rating = :rating,
                    text = :text,
                    treatment_type = :treatment_type,
                    source = 'google',
                    is_featured = :is_featured,
                    is_active = TRUE,
                    order_idx = :order_idx,
                    google_review_name = :google_review_name,
                    google_review_url = :google_review_url,
                    google_author_url = :google_author_url,
                    google_flag_url = :google_flag_url,
                    google_publish_time = CAST(:google_publish_time AS timestamptz),
                    google_synced_at = :google_synced_at,
                    google_place_id = :google_place_id
                WHERE source = 'google'
                  AND google_place_id = :google_place_id
                  AND patient_name = :patient_name
                  AND text = :text
            """), payload)
            updated = (result.rowcount or 0) > 0
        if updated:
            continue
        await db.execute(sql_text("""
            INSERT INTO site_testimonials (
                patient_name, patient_photo_url, rating, text, treatment_type,
                source, is_featured, is_active, order_idx,
                google_review_name, google_review_url, google_author_url,
                google_flag_url, google_publish_time, google_synced_at, google_place_id
            ) VALUES (
                :patient_name, :patient_photo_url, :rating, :text, :treatment_type,
                'google', :is_featured, TRUE, :order_idx,
                :google_review_name, :google_review_url, :google_author_url,
                :google_flag_url, CAST(:google_publish_time AS timestamptz),
                :google_synced_at, :google_place_id
            )
        """), payload)

    average_rating = round(rating_total / rating_count, 1) if rating_count else None
    await db.execute(sql_text("""
        UPDATE site_theme SET
            google_rating = COALESCE(:rating, google_rating),
            google_review_count = CASE
                WHEN :review_count > 0 THEN CAST(:review_count AS text)
                ELSE google_review_count
            END,
            google_reviews_url = COALESCE(:maps_url, google_reviews_url),
            google_reviews_synced_at = :synced_at,
            updated_at = now()
        WHERE id = 1
    """), {
        "rating": str(average_rating) if average_rating is not None else None,
        "review_count": review_count,
        "maps_url": primary_maps_url,
        "synced_at": synced_at,
    })
    await db.commit()

    result = {
        "status": "ok",
        "branches": successful_branches,
        "reviews": len(unique_reviews),
        "rating": average_rating,
        "review_count": review_count,
        "synced_at": synced_at.isoformat(),
    }
    if errors:
        result["errors"] = errors
    logger.info("Google reviews synced: %s", result)
    return result
