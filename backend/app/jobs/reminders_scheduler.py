"""
Reminders Scheduler — Bundle U (completed in Bundle W overhaul)

Seven reminder types, all idempotent via reminder_log:
  1. appt_24h           — 24 hours before appointment
  2. appt_2h            — 2 hours before
  3. appt_30m           — 30 minutes before
  4. followup_day       — follow-up due today / 1 day / 7 days
  5. payment_3day_7day  — pending payment 3 / 7 days overdue
  6. birthday           — birthday wishes
  7. morning_digest     — staff digest at configured time

Two run modes:
  • Embedded (APScheduler) — start_reminder_scheduler() runs on FastAPI startup
  • External — POST /api/jobs/reminders/tick from cron / n8n every 5 min

Both call the same reminders_tick(db) function.
All reminder firing uses send_message() from app.services.messaging.
Failed messages do NOT block — they're logged with status='failed' in reminder_log.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date as date_type, datetime, time as time_type, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, get_db
from app.services.messaging import send_message

logger = logging.getLogger("siya.bundle_u.reminders")
scheduler_router = APIRouter(tags=["Bundle U Jobs"])

# Window for "send time matching" — fires anytime in this minute window
TIME_WINDOW_MIN = 5


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _time_matches(current: time_type, target: time_type | None, window_min: int = TIME_WINDOW_MIN) -> bool:
    if not target:
        return False
    cur_min = current.hour * 60 + current.minute
    tgt_min = target.hour * 60 + target.minute
    return abs(cur_min - tgt_min) <= window_min


async def _already_fired(db: AsyncSession, key: str) -> bool:
    return bool((await db.execute(
        sql_text("SELECT 1 FROM reminder_log WHERE reminder_key = :k"),
        {"k": key}
    )).first())


async def _log_fired(
    db: AsyncSession,
    *,
    clinic_id: str,
    key: str,
    patient_id: Optional[str] = None,
    appointment_id: Optional[str] = None,
    status: str = "sent",
    error: Optional[str] = None,
) -> None:
    try:
        await db.execute(sql_text("""
            INSERT INTO reminder_log
              (clinic_id, reminder_key, patient_id, appointment_id, status, error_detail)
            VALUES (:cid, :k, :pid, :aid, :st, :err)
            ON CONFLICT (reminder_key) DO NOTHING
        """), {
            "cid": clinic_id, "k": key, "pid": patient_id,
            "aid": appointment_id, "st": status, "err": (error or "")[:500] if error else None,
        })
    except Exception as e:  # don't let log failures break tick
        logger.warning("reminder_log insert failed: %s", e)


async def _send_safe(
    db: AsyncSession, *, phone: str, message: str, template_key: str,
    clinic_id: str, patient_id: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """Wraps send_message() — returns (ok, error_text)."""
    try:
        await send_message(
            db=db,
            clinic_id=clinic_id,
            phone=phone,
            patient_id=patient_id,
            template_key=template_key,
            payload={"body": message},
        )
        return True, None
    except TypeError:
        # Older messaging signatures — try positional
        try:
            await send_message(db, phone, message, template_key, clinic_id)  # type: ignore
            return True, None
        except Exception as e2:
            return False, str(e2)
    except Exception as e:
        return False, str(e)


# ──────────────────────────────────────────────────────────────
# Main tick — iterate over clinics, dispatch by enabled reminders
# ──────────────────────────────────────────────────────────────

async def reminders_tick(db: AsyncSession, now: datetime | None = None) -> dict:
    now = now or datetime.utcnow()
    today = now.date()
    tomorrow = today + timedelta(days=1)
    current_time = now.time().replace(second=0, microsecond=0)

    counts = {
        "clinics": 0, "appt_24h": 0, "appt_2h": 0, "appt_30m": 0,
        "followup": 0, "payment": 0, "birthday": 0, "digest": 0, "failed": 0,
    }

    clinics = (await db.execute(sql_text("""
        SELECT rs.*, c.name AS clinic_name
        FROM reminder_settings rs
        JOIN clinics c ON c.id = rs.clinic_id
        WHERE rs.whatsapp_enabled = TRUE
    """))).mappings().all()

    for clinic in clinics:
        cid = str(clinic["clinic_id"])
        counts["clinics"] += 1

        # 1. APPT 24H — fires at configured time on T-1
        if clinic.get("appt_24h_enabled") and _time_matches(current_time, clinic.get("appt_24h_send_time")):
            counts["appt_24h"] += await _fire_appt_24h(db, cid, tomorrow, counts)

        # 2. APPT 2H — fires every tick, checks for appointments 2h from now
        if clinic.get("appt_2h_enabled"):
            counts["appt_2h"] += await _fire_appt_window(db, cid, now, 120, "appt_2h", "appointment_reminder_2h", counts)

        # 3. APPT 30M — same, 30 min
        if clinic.get("appt_30m_enabled"):
            counts["appt_30m"] += await _fire_appt_window(db, cid, now, 30, "appt_30m", "appointment_reminder_30m", counts)

        # 4. FOLLOWUPS
        if clinic.get("followup_day_enabled") and _time_matches(current_time, clinic.get("followup_day_send_time")):
            counts["followup"] += await _fire_followup(db, cid, today, "followup_day", counts)
        if clinic.get("followup_1day_before_enabled") and _time_matches(current_time, clinic.get("followup_day_send_time")):
            counts["followup"] += await _fire_followup(db, cid, tomorrow, "followup_1d_before", counts)
        if clinic.get("followup_7day_before_enabled") and _time_matches(current_time, clinic.get("followup_day_send_time")):
            counts["followup"] += await _fire_followup(db, cid, today + timedelta(days=7), "followup_7d_before", counts)

        # 5. PAYMENT (fires at 10:00 by convention)
        if clinic.get("payment_3day_enabled") and _time_matches(current_time, time_type(10, 0)):
            counts["payment"] += await _fire_payment(db, cid, 3, "payment_3d", counts)
        if clinic.get("payment_7day_enabled") and _time_matches(current_time, time_type(10, 0)):
            counts["payment"] += await _fire_payment(db, cid, 7, "payment_7d", counts)

        # 6. BIRTHDAY
        if clinic.get("birthday_enabled") and _time_matches(current_time, clinic.get("birthday_send_time")):
            counts["birthday"] += await _fire_birthday(db, cid, today, counts)

        # 7. MORNING DIGEST to staff
        if clinic.get("morning_digest_enabled") and _time_matches(current_time, clinic.get("morning_digest_send_time")):
            counts["digest"] += await _fire_morning_digest(db, cid, today, counts)

    try:
        await db.commit()
    except Exception as e:
        logger.exception("reminders tick commit failed: %s", e)

    return counts


# ──────────────────────────────────────────────────────────────
# 1. 24-hour reminder
# ──────────────────────────────────────────────────────────────

async def _fire_appt_24h(db, cid: str, target_date: date_type, counts: dict) -> int:
    rows = (await db.execute(sql_text("""
        SELECT a.id, a.patient_id, p.name AS pname, p.phone,
               COALESCE(a.confirmed_time, a.requested_time) AS apt_time
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.clinic_id = :cid
          AND COALESCE(a.confirmed_date, a.requested_date) = :dt
          AND COALESCE(a.workflow_status, a.status) IN ('scheduled','confirmed')
    """), {"cid": cid, "dt": target_date})).mappings().all()

    fired = 0
    for r in rows:
        key = f"appt_24h:{r['id']}:{target_date.isoformat()}"
        if await _already_fired(db, key):
            continue
        time_str = r["apt_time"].strftime("%H:%M") if r["apt_time"] else "your appointment time"
        msg = f"Hi {r['pname']}, friendly reminder of your appointment tomorrow at {time_str}. Reply to reschedule."
        ok, err = await _send_safe(
            db, phone=r["phone"], message=msg,
            template_key="appointment_reminder_24h",
            clinic_id=cid, patient_id=str(r["patient_id"])
        )
        await _log_fired(
            db, clinic_id=cid, key=key,
            patient_id=str(r["patient_id"]), appointment_id=str(r["id"]),
            status="sent" if ok else "failed", error=err,
        )
        if ok:
            fired += 1
        else:
            counts["failed"] += 1
    return fired


# ──────────────────────────────────────────────────────────────
# 2/3. 2h / 30m reminder  (computes window: now + minutes)
# ──────────────────────────────────────────────────────────────

async def _fire_appt_window(
    db, cid: str, now: datetime, minutes_ahead: int, prefix: str, template_key: str, counts: dict
) -> int:
    target_dt = now + timedelta(minutes=minutes_ahead)
    target_date = target_dt.date()
    target_time = target_dt.time()
    start_t = (datetime.combine(date_type.today(), target_time) - timedelta(minutes=TIME_WINDOW_MIN)).time()
    end_t = (datetime.combine(date_type.today(), target_time) + timedelta(minutes=TIME_WINDOW_MIN)).time()

    rows = (await db.execute(sql_text("""
        SELECT a.id, a.patient_id, p.name AS pname, p.phone,
               COALESCE(a.confirmed_time, a.requested_time) AS apt_time
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.clinic_id = :cid
          AND COALESCE(a.confirmed_date, a.requested_date) = :dt
          AND COALESCE(a.confirmed_time, a.requested_time) BETWEEN :start_t AND :end_t
          AND COALESCE(a.workflow_status, a.status) IN ('scheduled','confirmed')
    """), {"cid": cid, "dt": target_date, "start_t": start_t, "end_t": end_t})).mappings().all()

    fired = 0
    for r in rows:
        key = f"{prefix}:{r['id']}:{target_date.isoformat()}"
        if await _already_fired(db, key):
            continue
        time_str = r["apt_time"].strftime("%H:%M") if r["apt_time"] else ""
        if minutes_ahead >= 120:
            msg = f"Hi {r['pname']}, your appointment is in 2 hours at {time_str}. See you soon!"
        else:
            msg = f"Hi {r['pname']}, your appointment is in {minutes_ahead} minutes. Please arrive 5 min early."
        ok, err = await _send_safe(
            db, phone=r["phone"], message=msg, template_key=template_key,
            clinic_id=cid, patient_id=str(r["patient_id"])
        )
        await _log_fired(
            db, clinic_id=cid, key=key,
            patient_id=str(r["patient_id"]), appointment_id=str(r["id"]),
            status="sent" if ok else "failed", error=err,
        )
        if ok:
            fired += 1
        else:
            counts["failed"] += 1
    return fired


# ──────────────────────────────────────────────────────────────
# 4. Follow-up reminder
# ──────────────────────────────────────────────────────────────

async def _fire_followup(db, cid: str, target_date: date_type, prefix: str, counts: dict) -> int:
    # Patients with treatment_plan.followup_date == target_date
    rows = (await db.execute(sql_text("""
        SELECT tp.id AS plan_id, tp.patient_id, p.name AS pname, p.phone,
               COALESCE(tp.plan_name, tp.name) AS plan_name, tp.followup_date
        FROM treatment_plans tp
        JOIN patients p ON p.id = tp.patient_id
        WHERE tp.clinic_id = :cid
          AND tp.followup_date = :dt
          AND COALESCE(tp.status,'') NOT IN ('cancelled','closed')
    """), {"cid": cid, "dt": target_date})).mappings().all()

    fired = 0
    for r in rows:
        key = f"{prefix}:{r['plan_id']}:{target_date.isoformat()}"
        if await _already_fired(db, key):
            continue
        msg = (
            f"Hi {r['pname']}, this is a follow-up reminder for your {r['plan_name']} treatment. "
            f"Please book your next visit with us."
        )
        ok, err = await _send_safe(
            db, phone=r["phone"], message=msg, template_key="followup_reminder",
            clinic_id=cid, patient_id=str(r["patient_id"])
        )
        await _log_fired(
            db, clinic_id=cid, key=key,
            patient_id=str(r["patient_id"]),
            status="sent" if ok else "failed", error=err,
        )
        if ok:
            fired += 1
        else:
            counts["failed"] += 1
    return fired


# ──────────────────────────────────────────────────────────────
# 5. Payment overdue
# ──────────────────────────────────────────────────────────────

async def _fire_payment(db, cid: str, days_overdue: int, prefix: str, counts: dict) -> int:
    cutoff = date_type.today() - timedelta(days=days_overdue)
    rows = (await db.execute(sql_text("""
        SELECT tp.id AS plan_id, tp.patient_id, p.name AS pname, p.phone,
               COALESCE(tp.balance, 0) AS balance
        FROM treatment_plans tp
        JOIN patients p ON p.id = tp.patient_id
        WHERE tp.clinic_id = :cid
          AND COALESCE(tp.balance, 0) > 0
          AND tp.created_at::date <= :cutoff
          AND COALESCE(tp.status,'') NOT IN ('cancelled','closed')
    """), {"cid": cid, "cutoff": cutoff})).mappings().all()

    today = date_type.today()
    fired = 0
    for r in rows:
        key = f"{prefix}:{r['plan_id']}:{today.isoformat()}"
        if await _already_fired(db, key):
            continue
        msg = (
            f"Hi {r['pname']}, gentle reminder: your treatment has a pending balance of "
            f"₹{float(r['balance']):,.0f}. You can pay anytime at the clinic or via Razorpay link."
        )
        ok, err = await _send_safe(
            db, phone=r["phone"], message=msg, template_key="pending_payment_reminder",
            clinic_id=cid, patient_id=str(r["patient_id"])
        )
        await _log_fired(
            db, clinic_id=cid, key=key,
            patient_id=str(r["patient_id"]),
            status="sent" if ok else "failed", error=err,
        )
        if ok:
            fired += 1
        else:
            counts["failed"] += 1
    return fired


# ──────────────────────────────────────────────────────────────
# 6. Birthday wishes
# ──────────────────────────────────────────────────────────────

async def _fire_birthday(db, cid: str, today: date_type, counts: dict) -> int:
    rows = (await db.execute(sql_text("""
        SELECT id, name, phone FROM patients
        WHERE preferred_clinic_id = :cid
          AND date_of_birth IS NOT NULL
          AND EXTRACT(MONTH FROM date_of_birth) = :m
          AND EXTRACT(DAY   FROM date_of_birth) = :d
          AND is_active = TRUE
    """), {"cid": cid, "m": today.month, "d": today.day})).mappings().all()

    fired = 0
    for r in rows:
        key = f"birthday:{r['id']}:{today.isoformat()}"
        if await _already_fired(db, key):
            continue
        msg = f"Happy Birthday {r['name']}! 🎉 Wishing you good health and a bright smile from all of us at Siya Dental Care."
        ok, err = await _send_safe(
            db, phone=r["phone"], message=msg, template_key="birthday_wishes",
            clinic_id=cid, patient_id=str(r["id"])
        )
        await _log_fired(
            db, clinic_id=cid, key=key, patient_id=str(r["id"]),
            status="sent" if ok else "failed", error=err,
        )
        if ok:
            fired += 1
        else:
            counts["failed"] += 1
    return fired


# ──────────────────────────────────────────────────────────────
# 7. Morning digest to staff
# ──────────────────────────────────────────────────────────────

async def _fire_morning_digest(db, cid: str, today: date_type, counts: dict) -> int:
    key = f"morning_digest:{cid}:{today.isoformat()}"
    if await _already_fired(db, key):
        return 0

    stats = (await db.execute(sql_text("""
        SELECT
          (SELECT COUNT(*) FROM v_appointments_bucketed
             WHERE clinic_id = :cid AND effective_date = :today) AS total_today,
          (SELECT COUNT(*) FROM v_appointments_bucketed
             WHERE clinic_id = :cid AND effective_date = :today AND bucket = 'confirmed') AS confirmed,
          (SELECT COUNT(*) FROM v_appointments_bucketed
             WHERE clinic_id = :cid AND effective_date = :today AND bucket = 'unscheduled') AS unscheduled,
          (SELECT COUNT(*) FROM lab_orders
             WHERE clinic_id = :cid AND status IN ('pending','sent','received')) AS lab_pending,
          (SELECT COUNT(*) FROM reschedule_requests
             WHERE clinic_id = :cid AND status = 'pending') AS reschedules_pending
    """), {"cid": cid, "today": today})).mappings().one()

    digest = (
        "🌅 Good morning! Today's overview:\n"
        f"📅 Appointments: {stats['total_today']}\n"
        f"✅ Confirmed: {stats['confirmed']}\n"
        f"⚠️ To call back: {stats['unscheduled']}\n"
        f"🧪 Lab pending: {stats['lab_pending']}\n"
        f"🔄 Reschedule requests: {stats['reschedules_pending']}"
    )

    staff_rows = (await db.execute(sql_text("""
        SELECT id, name, phone FROM staff
        WHERE clinic_id = :cid AND is_active = TRUE
          AND role IN ('doctor','nurse','admin') AND phone IS NOT NULL AND phone <> ''
    """), {"cid": cid})).mappings().all()

    sent_count = 0
    last_err = None
    for s in staff_rows:
        ok, err = await _send_safe(
            db, phone=s["phone"], message=digest, template_key="morning_digest", clinic_id=cid
        )
        if ok:
            sent_count += 1
        else:
            last_err = err
            counts["failed"] += 1

    await _log_fired(
        db, clinic_id=cid, key=key,
        status="sent" if sent_count else "failed", error=last_err,
    )
    return sent_count


# ──────────────────────────────────────────────────────────────
# Embedded scheduler — APScheduler optional
# ──────────────────────────────────────────────────────────────

_scheduler_started = False


async def start_reminder_scheduler() -> None:
    global _scheduler_started
    if _scheduler_started:
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
    except ImportError:
        logger.warning("apscheduler not installed. Falling back to external cron / n8n.")
        return

    scheduler = AsyncIOScheduler()

    async def tick_wrapper():
        async with AsyncSessionLocal() as db:
            try:
                summary = await reminders_tick(db)
                if any(v for k, v in summary.items() if k not in ("clinics",)):
                    logger.info("Reminders tick: %s", summary)
            except Exception as e:
                logger.exception("Reminders tick failed: %s", e)

    scheduler.add_job(tick_wrapper, "interval", minutes=5, id="reminders_tick",
                      next_run_time=datetime.utcnow() + timedelta(seconds=30))
    scheduler.start()
    _scheduler_started = True
    logger.info("Reminders scheduler started (5min interval)")


# ──────────────────────────────────────────────────────────────
# External trigger endpoint (cron / n8n)
# ──────────────────────────────────────────────────────────────

@scheduler_router.post("/jobs/reminders/tick")
async def trigger_reminders_tick(
    db: AsyncSession = Depends(get_db),
    x_cron_secret: Optional[str] = Header(None),
):
    secret = get_settings().CRON_SECRET
    if secret and x_cron_secret != secret:
        raise HTTPException(401, "Unauthorized")
    summary = await reminders_tick(db)
    return {"status": "ok", "ran_at": datetime.utcnow().isoformat(), "summary": summary}


@scheduler_router.get("/jobs/reminders/dry-run")
async def dry_run_reminders(db: AsyncSession = Depends(get_db)):
    """For QA only — runs the same SQL filters but does NOT send WhatsApp."""
    now = datetime.utcnow()
    today = now.date()
    tomorrow = today + timedelta(days=1)

    counts = {}
    counts["appt_tomorrow"] = (await db.execute(sql_text("""
        SELECT COUNT(*) FROM appointments
        WHERE COALESCE(confirmed_date, requested_date) = :dt
          AND COALESCE(workflow_status, status) IN ('scheduled','confirmed')
    """), {"dt": tomorrow})).scalar()

    counts["payment_overdue_7d"] = (await db.execute(sql_text("""
        SELECT COUNT(*) FROM treatment_plans
        WHERE COALESCE(balance, 0) > 0
          AND created_at::date <= CURRENT_DATE - INTERVAL '7 days'
          AND COALESCE(status,'') NOT IN ('cancelled','closed')
    """))).scalar()

    counts["birthday_today"] = (await db.execute(sql_text("""
        SELECT COUNT(*) FROM patients
        WHERE EXTRACT(MONTH FROM date_of_birth) = :m
          AND EXTRACT(DAY FROM date_of_birth) = :d
          AND is_active = TRUE
    """), {"m": today.month, "d": today.day})).scalar()

    counts["followup_today"] = (await db.execute(sql_text("""
        SELECT COUNT(*) FROM treatment_plans
        WHERE followup_date = :today
          AND COALESCE(status,'') NOT IN ('cancelled','closed')
    """), {"today": today})).scalar()

    return {"now": now.isoformat(), "potential": counts}
