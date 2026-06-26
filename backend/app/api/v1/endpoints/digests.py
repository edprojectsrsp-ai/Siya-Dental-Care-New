"""
backend/app/api/v1/endpoints/digests.py — Bundle R

Single trigger endpoint that n8n (or any cron) hits at 7 AM IST:
  POST /api/triggers/daily-digests

Sends:
  • Doctor digest to each clinic's senior doctor
  • Nurse digest to each clinic's nurse
  • Specialist digest to each specialist
  • Lab due-tomorrow / due-today / overdue reminders to all vendors

Mount: app.include_router(digests_router, prefix="/api")
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.whatsapp_matrix import run_daily_digests

digests_router = APIRouter(prefix="/triggers", tags=["Daily Digests"])


@digests_router.post("/daily-digests")
async def run_digests(
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Sends doctor/nurse/specialist daily digests + lab reminders.
    Returns a count summary per category."""
    summary = await run_daily_digests(db)
    return {"ok": True, "summary": summary}
