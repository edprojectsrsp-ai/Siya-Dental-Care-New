"""
Dashboard V2 — Real KPI dashboard, separated from Appointment Hub.

Replaces the current pattern where `dashboard` and `appointments` nav items
both render <AppointmentHub view="..." />.

Endpoints:
  GET /api/dashboard/summary            — top KPI tiles
  GET /api/dashboard/revenue-pulse      — today/week/month + sparkline
  GET /api/dashboard/appt-funnel        — bucket counts for today/tomorrow/week
  GET /api/dashboard/lab-pipeline       — lab statuses + overdue
  GET /api/dashboard/outstanding-aging  — 0-7 / 7-30 / 30-60 / 60+
  GET /api/dashboard/followup-alerts    — overdue follow-ups
  GET /api/dashboard/no-show            — 30-day no-show rate
  GET /api/dashboard/top-procedures     — month's most-billed
  GET /api/dashboard/bot-pulse          — last 24h bot inbound/outbound
  GET /api/dashboard/reminders-health   — today fired/failed
  GET /api/dashboard/widgets            — per-staff visibility prefs
  PUT /api/dashboard/widgets            — save prefs

INTEGRATION:
    from app.api.v1.endpoints.dashboard_v2 import router as dashboard_v2_router
    app.include_router(dashboard_v2_router, prefix="/api")
"""

from __future__ import annotations

from datetime import date as date_type, datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff

router = APIRouter(tags=["Dashboard V2"], prefix="/dashboard")


def _allowed(staff: dict, *roles: str) -> None:
    if staff.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")


# ──────────────────────────────────────────────────────────────
# 1. SUMMARY — small KPI tiles for the very top of dashboard
# ──────────────────────────────────────────────────────────────

@router.get("/summary")
async def dashboard_summary(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    today = date_type.today()
    tomorrow = today + timedelta(days=1)

    row = (await db.execute(sql_text("""
        WITH apt_today AS (
          SELECT bucket, COUNT(*) AS n
          FROM v_appointments_bucketed
          WHERE clinic_id = :cid AND effective_date = :today
          GROUP BY bucket
        ),
        apt_tom AS (
          SELECT bucket, COUNT(*) AS n
          FROM v_appointments_bucketed
          WHERE clinic_id = :cid AND effective_date = :tomorrow
          GROUP BY bucket
        ),
        rev AS (
          SELECT COALESCE(SUM(amount),0) AS revenue_today
          FROM payment_transactions
          WHERE clinic_id = :cid AND date = :today
        ),
        out_total AS (
          SELECT COALESCE(SUM(balance),0) AS outstanding_total
          FROM treatment_plans
          WHERE clinic_id = :cid
            AND balance > 0
            AND COALESCE(status,'') NOT IN ('cancelled','closed')
        ),
        lab_pending AS (
          SELECT COUNT(*) AS n
          FROM lab_orders
          WHERE clinic_id = :cid AND status IN ('pending','sent','received')
        ),
        lab_overdue AS (
          SELECT COUNT(*) AS n
          FROM lab_orders
          WHERE clinic_id = :cid
            AND status IN ('pending','sent')
            AND expected_date IS NOT NULL
            AND expected_date < :today
        ),
        unscheduled AS (
          SELECT COUNT(*) AS n
          FROM v_appointments_bucketed
          WHERE clinic_id = :cid AND bucket = 'unscheduled'
            AND effective_date >= :today - INTERVAL '7 days'
        ),
        reschedule_pending AS (
          SELECT COUNT(*) AS n
          FROM reschedule_requests
          WHERE clinic_id = :cid AND status = 'pending'
        ),
        followups_overdue AS (
          SELECT COUNT(DISTINCT patient_id) AS n
          FROM treatment_plans
          WHERE clinic_id = :cid
            AND followup_date IS NOT NULL
            AND followup_date < :today
            AND COALESCE(status,'') NOT IN ('cancelled','closed')
        )
        SELECT
          (SELECT COALESCE(SUM(n),0) FROM apt_today) AS appts_today_total,
          (SELECT COALESCE(SUM(n),0) FROM apt_today WHERE bucket='in_clinic') AS appts_today_in_clinic,
          (SELECT COALESCE(SUM(n),0) FROM apt_today WHERE bucket='completed') AS appts_today_completed,
          (SELECT COALESCE(SUM(n),0) FROM apt_today WHERE bucket='confirmed') AS appts_today_confirmed,
          (SELECT COALESCE(SUM(n),0) FROM apt_today WHERE bucket='unscheduled') AS appts_today_unscheduled,
          (SELECT COALESCE(SUM(n),0) FROM apt_tom)   AS appts_tomorrow_total,
          (SELECT revenue_today FROM rev),
          (SELECT outstanding_total FROM out_total),
          (SELECT n FROM lab_pending) AS lab_pending_count,
          (SELECT n FROM lab_overdue) AS lab_overdue_count,
          (SELECT n FROM unscheduled) AS unscheduled_recent_count,
          (SELECT n FROM reschedule_pending) AS reschedule_pending_count,
          (SELECT n FROM followups_overdue) AS followups_overdue_count
    """), {"cid": str(clinic_id), "today": today, "tomorrow": tomorrow})).mappings().one()

    return dict(row)


# ──────────────────────────────────────────────────────────────
# 2. REVENUE PULSE — today / week / month + 14-day sparkline
# ──────────────────────────────────────────────────────────────

@router.get("/revenue-pulse")
async def revenue_pulse(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    today = date_type.today()
    week_ago = today - timedelta(days=6)
    month_start = today.replace(day=1)
    sparkline_start = today - timedelta(days=13)

    totals = (await db.execute(sql_text("""
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE date = :today),     0) AS today_total,
          COALESCE(SUM(amount) FILTER (WHERE date >= :week_ago), 0) AS week_total,
          COALESCE(SUM(amount) FILTER (WHERE date >= :month_start), 0) AS month_total,
          COALESCE(COUNT(*)   FILTER (WHERE date = :today),     0) AS today_count,
          COALESCE(COUNT(*)   FILTER (WHERE date >= :week_ago), 0) AS week_count,
          COALESCE(COUNT(*)   FILTER (WHERE date >= :month_start), 0) AS month_count
        FROM payment_transactions
        WHERE clinic_id = :cid
    """), {
        "cid": str(clinic_id), "today": today, "week_ago": week_ago, "month_start": month_start
    })).mappings().one()

    sparkline_rows = (await db.execute(sql_text("""
        WITH days AS (
          SELECT (CAST(:start_d AS date) + (i || ' days')::interval)::date AS d
          FROM generate_series(0, 13) i
        )
        SELECT d.d AS day, COALESCE(SUM(p.amount), 0) AS amount
        FROM days d
        LEFT JOIN payment_transactions p
          ON p.clinic_id = :cid AND p.date = d.d
        GROUP BY d.d ORDER BY d.d
    """), {"cid": str(clinic_id), "start_d": sparkline_start})).mappings().all()

    by_mode = (await db.execute(sql_text("""
        SELECT COALESCE(payment_mode,'unknown') AS mode, COALESCE(SUM(amount),0) AS amount
        FROM payment_transactions
        WHERE clinic_id = :cid AND date = :today
        GROUP BY 1 ORDER BY 2 DESC
    """), {"cid": str(clinic_id), "today": today})).mappings().all()

    return {
        "totals": dict(totals),
        "sparkline": [{"day": str(r["day"]), "amount": float(r["amount"])} for r in sparkline_rows],
        "today_by_mode": [{"mode": r["mode"], "amount": float(r["amount"])} for r in by_mode],
    }


# ──────────────────────────────────────────────────────────────
# 3. APPOINTMENT FUNNEL — buckets across today, tomorrow, week
# ──────────────────────────────────────────────────────────────

@router.get("/appt-funnel")
async def appt_funnel(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    today = date_type.today()
    week_end = today + timedelta(days=6)

    rows = (await db.execute(sql_text("""
        SELECT
          bucket,
          COUNT(*) FILTER (WHERE effective_date = :today)              AS today,
          COUNT(*) FILTER (WHERE effective_date = :tomorrow)           AS tomorrow,
          COUNT(*) FILTER (WHERE effective_date BETWEEN :today AND :week_end) AS week
        FROM v_appointments_bucketed
        WHERE clinic_id = :cid
          AND effective_date BETWEEN :today AND :week_end
        GROUP BY bucket
    """), {
        "cid": str(clinic_id),
        "today": today,
        "tomorrow": today + timedelta(days=1),
        "week_end": week_end,
    })).mappings().all()

    # Always return all buckets so UI is consistent
    bucket_order = ["unscheduled", "scheduled", "rescheduled", "no_answer",
                    "confirmed", "in_clinic", "completed", "cancelled", "no_show"]
    by_bucket = {r["bucket"]: dict(r) for r in rows}
    out = []
    for b in bucket_order:
        item = by_bucket.get(b, {"bucket": b, "today": 0, "tomorrow": 0, "week": 0})
        out.append({k: (int(v) if isinstance(v, (int, float)) else v) for k, v in item.items()})
    return {"funnel": out}


# ──────────────────────────────────────────────────────────────
# 4. LAB PIPELINE — uses DB-aligned statuses
# ──────────────────────────────────────────────────────────────

@router.get("/lab-pipeline")
async def lab_pipeline(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    today = date_type.today()

    rows = (await db.execute(sql_text("""
        SELECT status, COUNT(*) AS n,
          COUNT(*) FILTER (WHERE expected_date IS NOT NULL AND expected_date < :today) AS overdue,
          COUNT(*) FILTER (WHERE expected_date = :today) AS due_today,
          COUNT(*) FILTER (WHERE expected_date BETWEEN :today AND :today + INTERVAL '7 days') AS due_week
        FROM lab_orders
        WHERE clinic_id = :cid AND status IN ('pending','sent','received','fitted')
        GROUP BY status ORDER BY 1
    """), {"cid": str(clinic_id), "today": today})).mappings().all()

    closed = (await db.execute(sql_text("""
        SELECT COUNT(*) AS n_completed,
          COALESCE(SUM(cost),0) AS total_cost
        FROM lab_orders
        WHERE clinic_id = :cid AND status = 'completed'
          AND COALESCE(closed_at, updated_at, created_at) >= NOW() - INTERVAL '30 days'
    """), {"cid": str(clinic_id)})).mappings().one()

    return {
        "by_status": [dict(r) for r in rows],
        "completed_30d": dict(closed),
    }


# ──────────────────────────────────────────────────────────────
# 5. OUTSTANDING AGING — buckets
# ──────────────────────────────────────────────────────────────

@router.get("/outstanding-aging")
async def outstanding_aging(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    today = date_type.today()

    rows = (await db.execute(sql_text("""
        SELECT
          CASE
            WHEN (CAST(:today AS date) - created_at::date) <= 7  THEN '0-7d'
            WHEN (CAST(:today AS date) - created_at::date) <= 30 THEN '7-30d'
            WHEN (CAST(:today AS date) - created_at::date) <= 60 THEN '30-60d'
            ELSE '60d+'
          END AS bucket,
          COUNT(*) AS plans,
          COALESCE(SUM(balance),0) AS total
        FROM treatment_plans
        WHERE clinic_id = :cid
          AND balance > 0
          AND COALESCE(status,'') NOT IN ('cancelled','closed')
        GROUP BY 1
        ORDER BY 1
    """), {"cid": str(clinic_id), "today": today})).mappings().all()

    order = ["0-7d", "7-30d", "30-60d", "60d+"]
    by_b = {r["bucket"]: dict(r) for r in rows}
    out = [by_b.get(b, {"bucket": b, "plans": 0, "total": 0}) for b in order]
    # cast Decimal → float for JSON
    for item in out:
        item["total"] = float(item["total"] or 0)
        item["plans"] = int(item["plans"] or 0)
    return {"aging": out}


# ──────────────────────────────────────────────────────────────
# 6. FOLLOW-UP ALERTS
# ──────────────────────────────────────────────────────────────

@router.get("/followup-alerts")
async def followup_alerts(
    clinic_id: UUID,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    today = date_type.today()

    rows = (await db.execute(sql_text("""
        SELECT tp.id AS plan_id, tp.patient_id, p.name AS patient_name, p.phone,
               tp.followup_date,
               (CAST(:today AS date) - tp.followup_date) AS days_overdue,
               tp.followup_notes,
               COALESCE(tp.plan_name, tp.name) AS plan_name
        FROM treatment_plans tp
        JOIN patients p ON p.id = tp.patient_id
        WHERE tp.clinic_id = :cid
          AND tp.followup_date IS NOT NULL
          AND tp.followup_date <= :today
          AND COALESCE(tp.status,'') NOT IN ('cancelled','closed')
        ORDER BY tp.followup_date ASC
        LIMIT :limit
    """), {"cid": str(clinic_id), "today": today, "limit": limit})).mappings().all()

    return {"followups": [dict(r) for r in rows]}


# ──────────────────────────────────────────────────────────────
# 7. NO-SHOW RATE (30 days)
# ──────────────────────────────────────────────────────────────

@router.get("/no-show")
async def no_show(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")

    rows = (await db.execute(sql_text("""
        SELECT
          COUNT(*) FILTER (WHERE status = 'no_show') AS no_show,
          COUNT(*) FILTER (WHERE workflow_status IN ('arrived','ready','in_treatment',
                                                     'payment_pending','completed')
                            OR status IN ('arrived','ready','in_progress','in_treatment',
                                          'payment_pending','completed','done')) AS attended,
          COUNT(*) AS total
        FROM appointments
        WHERE clinic_id = :cid
          AND COALESCE(confirmed_date, requested_date) >= CURRENT_DATE - INTERVAL '30 days'
          AND COALESCE(confirmed_date, requested_date) <= CURRENT_DATE
    """), {"cid": str(clinic_id)})).mappings().one()

    no_show_n = int(rows["no_show"] or 0)
    attended_n = int(rows["attended"] or 0)
    eligible = no_show_n + attended_n
    rate = (no_show_n / eligible * 100) if eligible else 0
    return {
        "no_show": no_show_n,
        "attended": attended_n,
        "rate_pct": round(rate, 1),
    }


# ──────────────────────────────────────────────────────────────
# 8. TOP PROCEDURES (this month)
# ──────────────────────────────────────────────────────────────

@router.get("/top-procedures")
async def top_procedures(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    month_start = date_type.today().replace(day=1)

    rows = (await db.execute(sql_text("""
        SELECT tpi.procedure_name, COUNT(*) AS times,
               COALESCE(SUM(tpi.final_amount), 0) AS revenue
        FROM treatment_plan_items tpi
        JOIN treatment_plans tp ON tp.id = tpi.plan_id
        WHERE tp.clinic_id = :cid
          AND tpi.created_at >= :month_start
        GROUP BY tpi.procedure_name
        ORDER BY times DESC, revenue DESC
        LIMIT 8
    """), {"cid": str(clinic_id), "month_start": month_start})).mappings().all()

    result = []
    for r in rows:
        result.append({
            "procedure_name": r["procedure_name"],
            "times": int(r["times"] or 0),
            "revenue": float(r["revenue"] or 0),
        })
    return {"procedures": result}


# ──────────────────────────────────────────────────────────────
# 9. BOT PULSE (last 24h)
# ──────────────────────────────────────────────────────────────

@router.get("/bot-pulse")
async def bot_pulse(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")

    rows = (await db.execute(sql_text("""
        SELECT channel, direction, COUNT(*) AS n
        FROM bot_event_log
        WHERE clinic_id = :cid
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY channel, direction
        ORDER BY channel, direction
    """), {"cid": str(clinic_id)})).mappings().all()

    last_failed = (await db.execute(sql_text("""
        SELECT created_at, channel, message_text
        FROM bot_event_log
        WHERE clinic_id = :cid AND status = 'failed'
        ORDER BY created_at DESC
        LIMIT 1
    """), {"cid": str(clinic_id)})).mappings().one_or_none()

    return {
        "buckets": [{"channel": r["channel"], "direction": r["direction"], "n": int(r["n"])} for r in rows],
        "last_failed": dict(last_failed) if last_failed else None,
    }


# ──────────────────────────────────────────────────────────────
# 10. REMINDERS HEALTH (today)
# ──────────────────────────────────────────────────────────────

@router.get("/reminders-health")
async def reminders_health(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")

    rows = (await db.execute(sql_text("""
        SELECT
          status,
          COUNT(*) AS n,
          COUNT(*) FILTER (WHERE fired_at::date = CURRENT_DATE) AS today_n
        FROM reminder_log
        WHERE clinic_id = :cid
          AND fired_at >= NOW() - INTERVAL '7 days'
        GROUP BY status
    """), {"cid": str(clinic_id)})).mappings().all()

    return {"by_status": [dict(r) for r in rows]}


# ──────────────────────────────────────────────────────────────
# 11. WIDGET PREFERENCES — per staff
# ──────────────────────────────────────────────────────────────

class WidgetPrefUpdate(BaseModel):
    widget_key: str
    is_visible: Optional[bool] = None
    display_order: Optional[int] = None


@router.get("/widgets")
async def list_widgets(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    # Per-staff first, fall back to clinic default
    rows = (await db.execute(sql_text("""
        SELECT widget_key, is_visible, display_order, config
        FROM dashboard_widget_prefs
        WHERE clinic_id = :cid AND (staff_id = :sid OR staff_id IS NULL)
        ORDER BY display_order
    """), {"cid": str(clinic_id), "sid": str(staff["staff_id"])})).mappings().all()

    # Per-staff override clinic default
    out: dict[str, dict] = {}
    for r in rows:
        out[r["widget_key"]] = dict(r)
    return {"widgets": list(out.values())}


@router.put("/widgets")
async def save_widget(
    clinic_id: UUID,
    body: WidgetPrefUpdate,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _allowed(staff, "doctor", "admin", "nurse", "receptionist")
    await db.execute(sql_text("""
        INSERT INTO dashboard_widget_prefs (clinic_id, staff_id, widget_key, is_visible, display_order)
        VALUES (:cid, :sid, :wk, COALESCE(:vis, TRUE), COALESCE(:ord, 99))
        ON CONFLICT (clinic_id, staff_id, widget_key) DO UPDATE SET
          is_visible    = COALESCE(EXCLUDED.is_visible, dashboard_widget_prefs.is_visible),
          display_order = COALESCE(EXCLUDED.display_order, dashboard_widget_prefs.display_order),
          updated_at    = NOW()
    """), {
        "cid": str(clinic_id), "sid": str(staff["staff_id"]),
        "wk": body.widget_key, "vis": body.is_visible, "ord": body.display_order,
    })
    return {"saved": True}
