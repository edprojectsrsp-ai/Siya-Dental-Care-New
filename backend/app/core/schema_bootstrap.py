"""Lightweight startup schema fixes for fields added after the base dump."""
from __future__ import annotations

from app.core.database import engine


GOOGLE_PLACES_SCHEMA_SQL = [
    """
    ALTER TABLE site_theme
      ADD COLUMN IF NOT EXISTS google_reviews_url text,
      ADD COLUMN IF NOT EXISTS google_rating text,
      ADD COLUMN IF NOT EXISTS google_review_count text,
      ADD COLUMN IF NOT EXISTS google_reviews_synced_at timestamptz
    """,
    """
    ALTER TABLE clinics
      ADD COLUMN IF NOT EXISTS google_place_id text
    """,
    """
    ALTER TABLE site_testimonials
      ADD COLUMN IF NOT EXISTS google_review_name text,
      ADD COLUMN IF NOT EXISTS google_review_url text,
      ADD COLUMN IF NOT EXISTS google_author_url text,
      ADD COLUMN IF NOT EXISTS google_flag_url text,
      ADD COLUMN IF NOT EXISTS google_publish_time timestamptz,
      ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
      ADD COLUMN IF NOT EXISTS google_place_id text
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS ux_site_testimonials_google_review
      ON site_testimonials (google_review_name)
      WHERE source = 'google' AND google_review_name IS NOT NULL
    """,
]


async def ensure_google_places_schema() -> None:
    """Keep public-site Google review fields present on restored older databases."""
    async with engine.begin() as conn:
        for statement in GOOGLE_PLACES_SCHEMA_SQL:
            await conn.exec_driver_sql(statement)
