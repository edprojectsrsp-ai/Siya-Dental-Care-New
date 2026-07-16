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


async def sync_google_reviews(db: AsyncSession) -> dict[str, Any]:
    """Replace cached Google reviews only after at least one branch sync succeeds."""
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
        SELECT id, COALESCE(short_name, name) AS label, google_place_id
        FROM clinics
        WHERE show_on_public_site = TRUE
          AND COALESCE(is_active, TRUE) = TRUE
          AND google_place_id IS NOT NULL
        ORDER BY display_order, name
    """))).mappings().all()
    if not clinics:
        return {"status": "skipped", "reason": "No public clinic has a Google place ID"}

    synced_at = datetime.now(timezone.utc)
    fetched_reviews: list[dict[str, Any]] = []
    rating_total = 0.0
    rating_count = 0
    review_count = 0
    primary_maps_url: str | None = None
    successful_branches = 0
    successful_place_ids: list[str] = []
    errors: list[str] = []

    headers = {
        "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": DETAIL_FIELDS,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        for clinic in clinics:
            place_id = str(clinic["google_place_id"]).removeprefix("places/")
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
            successful_place_ids.append(place_id)
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

    # Remove legacy rows and refresh only branches fetched successfully. A temporary
    # failure at one location must not erase that location's still-valid cache.
    await db.execute(sql_text("""
        DELETE FROM site_testimonials
        WHERE source = 'google' AND google_place_id IS NULL
    """))
    for place_id in successful_place_ids:
        await db.execute(sql_text("""
            DELETE FROM site_testimonials
            WHERE source = 'google' AND google_place_id = :place_id
        """), {"place_id": place_id})
    for idx, review in enumerate(unique_reviews):
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
        """), {
            **review,
            "is_featured": idx < 4,
            "order_idx": idx,
            "google_synced_at": synced_at,
        })

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
