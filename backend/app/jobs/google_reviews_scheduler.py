"""Periodic Google Places review refresh plus an authenticated manual trigger."""
from __future__ import annotations

import asyncio
import logging
from contextlib import suppress

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.security import get_current_staff
from app.services.google_reviews import sync_google_reviews

logger = logging.getLogger("siya.google_reviews.scheduler")
router = APIRouter(prefix="/admin/google-reviews", tags=["Google Reviews"])
_task: asyncio.Task | None = None
_sync_lock = asyncio.Lock()


async def _run_sync() -> dict:
    if _sync_lock.locked():
        return {"status": "busy"}
    async with _sync_lock:
        async with AsyncSessionLocal() as db:
            try:
                return await sync_google_reviews(db)
            except Exception:
                await db.rollback()
                logger.exception("Google reviews refresh failed")
                return {"status": "error"}


async def _scheduler_loop() -> None:
    settings = get_settings()
    await asyncio.sleep(max(1, settings.GOOGLE_REVIEWS_STARTUP_DELAY_SECONDS))
    while True:
        await _run_sync()
        await asyncio.sleep(max(15, settings.GOOGLE_REVIEWS_SYNC_MINUTES) * 60)


async def start_google_reviews_scheduler() -> None:
    global _task
    settings = get_settings()
    if not settings.GOOGLE_REVIEWS_SYNC_ENABLED or not settings.GOOGLE_PLACES_API_KEY:
        logger.info("Google reviews scheduler disabled or API key missing")
        return
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_scheduler_loop(), name="google-reviews-sync")
    logger.info(
        "Google reviews scheduler started (%s minute interval)",
        settings.GOOGLE_REVIEWS_SYNC_MINUTES,
    )


async def stop_google_reviews_scheduler() -> None:
    global _task
    if not _task:
        return
    _task.cancel()
    with suppress(asyncio.CancelledError):
        await _task
    _task = None


@router.post("/sync")
async def sync_now(
    staff=Depends(get_current_staff),
):
    if not staff or staff.get("role") not in ("doctor", "admin"):
        raise HTTPException(403, "Admin / doctor access required")
    return await _run_sync()
