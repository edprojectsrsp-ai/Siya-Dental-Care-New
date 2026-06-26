"""Unified Clinic Hub v2 — /api/hub/* endpoints
Final Workflow Spec: Schedule → Today → Mark Arrived (= Doctor Queue) →
Start Treatment → Close Session/Treatment → Payment Collection → Follow-up/Archive.
No 'ready' status — Arrived IS the queue ('ready' kept as a read alias for old rows).
"""
from datetime import datetime, timezone, date as date_type, timedelta
from typing import Optional, List
from uuid import UUID
from urllib.parse import quote
import json
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text
from app.core.database import get_db
from app.core.security import get_current_staff
from app.api.v1.endpoints.consult_rating import maybe_queue_rating_ask, maybe_send_receipt
from app.services.whatsapp_matrix import notify_arrival_confirmation, notify_thank_you_visit, notify_appointment_rescheduled

router = APIRouter(prefix="/hub", tags=["Clinic Hub"])

def _parse_time_input(value: Optional[str], default: Optional[str] = None):
    raw = value or default
    if not raw:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            pass
    raise HTTPException(400, "Invalid time format. Use HH:MM or HH:MM:SS")

def _normalize_time(raw):
    """Best-effort time normaliser for messy external inputs (public site / WA bot).
       Accepts: '10:00', '10:00:00', '10:00 AM', '10am', '10 AM', '14:30'.
       Returns 'HH:MM' string. Falls back to '10:00' on parse failure."""
    if raw is None: return "10:00"
    s = str(raw).strip().upper().replace(".", ":")
    # Try strict first
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p", "%I %p", "%I%p"):
        try:
            return datetime.strptime(s, fmt).strftime("%H:%M")
        except ValueError:
            continue
    # Loose: extract first digits
    import re
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?", s)
    if m:
        h = int(m.group(1)); mm = int(m.group(2) or 0); ap = m.group(3)
        if ap == "PM" and h < 12: h += 12
        elif ap == "AM" and h == 12: h = 0
        if 0 <= h < 24 and 0 <= mm < 60:
            return f"{h:02d}:{mm:02d}"
    return "10:00"

def _normalize_phone_digits(phone: Optional[str]) -> str:
    digits = "".join(c for c in str(phone or "") if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits

def _normalize_name_key(name: Optional[str]) -> str:
    return " ".join((name or "").strip().lower().split())

async def _find_existing_active_appointment(
    db: AsyncSession,
    patient_id: str,
    clinic_id: str,
    target_date: date_type,
):
    return (await db.execute(sql_text("""
        SELECT id,
               COALESCE(confirmed_date, requested_date) AS effective_date,
               COALESCE(confirmed_time, requested_time) AS effective_time,
               COALESCE(workflow_status, status) AS current_status
        FROM appointments
        WHERE patient_id = CAST(:p AS UUID)
          AND clinic_id = CAST(:c AS UUID)
          AND COALESCE(confirmed_date, requested_date) = :dt
          AND COALESCE(workflow_status, status) NOT IN ('cancelled','rejected','completed','done','no_show')
        ORDER BY created_at DESC
        LIMIT 1
    """), {"p": patient_id, "c": clinic_id, "dt": target_date})).mappings().first()

def _is_near_term_bucket(target_date: date_type) -> bool:
    today = date_type.today()
    return today <= target_date <= (today + timedelta(days=2))

async def _find_existing_active_near_term_appointment(
    db: AsyncSession,
    patient_id: str,
    clinic_id: str,
    exclude_appointment_id: Optional[str] = None,
):
    params = {
        "p": patient_id,
        "c": clinic_id,
        "start_dt": date_type.today(),
        "end_dt": date_type.today() + timedelta(days=2),
    }
    exclude_sql = ""
    if exclude_appointment_id:
        exclude_sql = "AND id <> CAST(:exclude_id AS UUID)"
        params["exclude_id"] = exclude_appointment_id
    return (await db.execute(sql_text(f"""
        SELECT id,
               COALESCE(confirmed_date, requested_date) AS effective_date,
               COALESCE(confirmed_time, requested_time) AS effective_time,
               COALESCE(workflow_status, status) AS current_status
        FROM appointments
        WHERE patient_id = CAST(:p AS UUID)
          AND clinic_id = CAST(:c AS UUID)
          AND COALESCE(confirmed_date, requested_date) BETWEEN :start_dt AND :end_dt
          AND COALESCE(workflow_status, status) NOT IN ('cancelled','rejected','completed','done','no_show')
          {exclude_sql}
        ORDER BY COALESCE(confirmed_date, requested_date), COALESCE(confirmed_time, requested_time), created_at DESC
        LIMIT 1
    """), params)).mappings().first()

async def _ensure_unscheduled_followup(
    db: AsyncSession,
    patient_id: str,
    clinic_id: str,
    doctor_id: Optional[str] = None,
    reason: Optional[str] = None,
):
    active_plan = (await db.execute(sql_text("""
        SELECT id
        FROM treatment_plans
        WHERE patient_id = CAST(:p AS UUID)
          AND is_archived = FALSE
          AND COALESCE(status, 'treatment_advised') NOT IN ('closed','completed','cancelled','archived')
        ORDER BY created_at DESC
        LIMIT 1
    """), {"p": patient_id})).mappings().first()
    if not active_plan:
        return None

    existing = (await db.execute(sql_text("""
        SELECT id
        FROM appointments
        WHERE patient_id = CAST(:p AS UUID)
          AND clinic_id = CAST(:c AS UUID)
          AND COALESCE(workflow_status, status) NOT IN ('cancelled','rejected','completed','done','payment_pending','no_show')
        ORDER BY created_at DESC
        LIMIT 1
    """), {"p": patient_id, "c": clinic_id})).mappings().first()
    if existing:
        return str(existing["id"])

    created = (await db.execute(sql_text("""
        INSERT INTO appointments (
            patient_id, clinic_id, doctor_id,
            requested_date, requested_time, confirmed_date, confirmed_time,
            scheduled_date, scheduled_time,
            reason, source, status, workflow_status, created_at, updated_at
        )
        VALUES (
            CAST(:p AS UUID), CAST(:c AS UUID), CAST(:d AS UUID),
            NULL, NULL, NULL, NULL, NULL, NULL,
            :r, 'followup', 'pending', 'pending', NOW(), NOW()
        )
        RETURNING id
    """), {
        "p": patient_id,
        "c": clinic_id,
        "d": doctor_id,
        "r": reason or "Follow-up",
    })).mappings().one()
    return str(created["id"])

# ─────────────────────────── Schemas ───────────────────────────
class WorkflowMarkIn(BaseModel):
    new_status: str
    cancel_reason: Optional[str] = None
class AddPatientIn(BaseModel):
    name: str; phone: str; age: Optional[int] = None; gender: Optional[str] = None
    existing_illnesses: List[str] = Field(default_factory=list); clinic_id: UUID
    use_existing_id: Optional[UUID] = None
    allow_shared_phone: bool = False
    alternate_whatsapp_number: Optional[str] = None
class CloseSessionIn(BaseModel):
    session_id: UUID; procedures_done: List[dict] = Field(default_factory=list)
    treatment_notes: Optional[str] = None; next_step: Optional[str] = None
    amount_payable: float; discount_amount: float = 0; discount_reason: Optional[str] = None
    next_appointment_date: Optional[date_type] = None; next_appointment_time: Optional[str] = None
    archive_plan: bool = False           # True = "Close Treatment" → Archive
class CollectPaymentIn(BaseModel):
    session_id: Optional[UUID] = None
    appointment_id: Optional[UUID] = None
    cash_amount: float = 0; upi_amount: float = 0
    upi_txn_id: Optional[str] = None; card_amount: float = 0; notes: Optional[str] = None
class UpdateIllnessesIn(BaseModel):
    existing_illnesses: List[str]
class RescheduleIn(BaseModel):
    new_date: date_type; new_time: Optional[str] = None; status: str = "scheduled"; reason: Optional[str] = None
class TimeEditIn(BaseModel):
    new_time: str
class CallStatusIn(BaseModel):
    call_status: str                      # pending_call|confirmed|no_answer|call_back_later|cancelled_by_patient|rescheduled
    notes: Optional[str] = None
class AdminForceStatusIn(BaseModel):
    new_status: str                       # any status — bypasses the normal transition rules
    reason: Optional[str] = None
    clear_schedule: bool = False          # also wipe date/time so it returns to the unscheduled pool

# Every status an appointment can hold (the universe the admin override may set).
ALL_STATUSES = {
    "scheduled", "pending", "confirmed", "arrived", "in_treatment",
    "payment_pending", "completed", "cancelled", "rescheduled",
}

# Spec workflow: Scheduled → Arrived(=Queue) → In Treatment → Payment Pending → Completed
VALID_TRANSITIONS = {
    "scheduled":       ["confirmed", "arrived", "cancelled", "rescheduled"],
    "pending":         ["confirmed", "arrived", "cancelled", "rescheduled"],
    "confirmed":       ["arrived", "cancelled", "rescheduled"],
    "arrived":         ["in_treatment", "cancelled"],
    "ready":           ["in_treatment", "cancelled"],          # legacy alias of arrived
    "in_treatment":    ["payment_pending", "completed"],
    "in_progress":     ["payment_pending", "completed"],       # legacy alias
    "payment_pending": ["completed"],
}

PATIENT_TYPE_SQL = """CASE
    WHEN a.source = 'emergency' THEN 'emergency'
    WHEN a.source = 'walkin'    THEN 'walkin'
    WHEN COALESCE(p.total_visits, 0) <= 0 THEN 'new'
    ELSE 'followup' END"""

def _norm_call(cs: Optional[str]) -> str:
    if not cs or cs == "not_contacted": return "pending_call"
    return cs

# ─────────────────────────── TODAY ─────────────────────────────
@router.get("/today")
async def hub_today(clinic_id: UUID, date: Optional[date_type] = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    target = date or date_type.today()
    apts = (await db.execute(sql_text(f"""
        SELECT a.id, a.patient_id, COALESCE(a.confirmed_time, a.requested_time) AS sched_time,
               a.duration_minutes, a.reason, a.status, a.appointment_type, a.arrived_at,
               COALESCE(a.workflow_status, a.status) AS workflow_status,
               a.chief_complaints, a.source, a.contact_status,
               {PATIENT_TYPE_SQL} AS patient_type,
               p.name AS pname, p.phone, p.age, p.gender,
               p.existing_illnesses, p.total_visits,
               s.name AS doctor_name,
               (SELECT COUNT(*) FROM appointment_call_logs WHERE appointment_id = a.id) AS call_count,
               a.created_at
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN staff s ON s.id = a.doctor_id
        WHERE a.clinic_id = :cid
          AND (a.confirmed_date = :target OR a.requested_date = :target)
          AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled','rejected')
        ORDER BY COALESCE(a.confirmed_time, a.requested_time) NULLS LAST, a.created_at
    """), {"cid": str(clinic_id), "target": target})).mappings().all()

    stats = {}
    for key in ["scheduled","confirmed","arrived","ready","in_treatment","in_progress","payment_pending","completed","done","pending"]:
        stats[key] = sum(1 for a in apts if (a["workflow_status"] or "scheduled") == key)
    not_contacted = sum(1 for a in apts if _norm_call(a["contact_status"]) == "pending_call"
                        and (a["workflow_status"] or "scheduled") in ("scheduled","pending","confirmed"))
    rev = (await db.execute(sql_text(
        "SELECT COALESCE(SUM(amount),0) AS t FROM payment_transactions WHERE clinic_id=:c AND date=CURRENT_DATE"
    ), {"c": str(clinic_id)})).mappings().one()

    return {
        "date": target.isoformat(),
        "stats": {
            "total": len(apts),
            "confirmed": stats.get("confirmed", 0),
            "not_contacted": not_contacted,
            "arrived": stats.get("arrived", 0) + stats.get("ready", 0),
            "waiting": stats.get("arrived", 0) + stats.get("ready", 0),
            "in_treatment": stats.get("in_treatment", 0) + stats.get("in_progress", 0),
            "payment_pending": stats.get("payment_pending", 0),
            "completed": stats.get("completed", 0) + stats.get("done", 0),
            "revenue": float(rev["t"]),
        },
        "appointments": [{
            "id": str(a["id"]), "patient_id": str(a["patient_id"]),
            "patient_name": a["pname"], "phone": a["phone"], "age": a["age"], "gender": a["gender"],
            "existing_illnesses": a["existing_illnesses"] or [], "total_visits": a["total_visits"] or 0,
            "scheduled_time": str(a["sched_time"])[:5] if a["sched_time"] else None,
            "reason": a["reason"], "source": a["source"],
            "appointment_type": a["appointment_type"] or a["reason"] or "Consultation",
            "patient_type": a["patient_type"],
            "chief_complaints": a["chief_complaints"] or [],
            "contact_status": _norm_call(a["contact_status"]),
            "workflow_status": ("arrived" if (a["workflow_status"] or "") == "ready" else (a["workflow_status"] or a["status"] or "scheduled")),
            "arrived_at": a["arrived_at"].isoformat() if a["arrived_at"] else None,
            "doctor_name": a["doctor_name"], "call_count": a["call_count"], "called": a["call_count"] > 0,
            "created_at": a["created_at"].isoformat() if a["created_at"] else None,
        } for a in apts],
    }

@router.get("/appointments-range")
async def hub_appointments_range(
    clinic_id: UUID,
    from_date: date_type = Query(..., alias="from"),
    to_date: date_type = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Appointments in a date range — for command centre calendar / filters."""
    rows = (await db.execute(sql_text(f"""
        SELECT a.id, a.patient_id, COALESCE(a.confirmed_date, a.requested_date) AS sched_date,
               COALESCE(a.confirmed_time, a.requested_time) AS sched_time,
               a.reason, a.appointment_type, a.duration_minutes,
               COALESCE(a.workflow_status, a.status) AS workflow_status,
               a.chief_complaints, a.source, a.contact_status,
               a.pending_action, a.pending_action_since,
               a.cancel_reason,
               a.specialist_id, a.specialist_confirmation_status,
               (SELECT COUNT(*) FROM appointment_call_logs cl WHERE cl.appointment_id = a.id) AS call_count,
               (SELECT COUNT(*) FROM appointment_call_logs cl
                 WHERE cl.appointment_id = a.id
                   AND cl.call_status IN ('no_answer','call_back_later')) AS no_answer_count,
               (SELECT cl.call_status FROM appointment_call_logs cl
                 WHERE cl.appointment_id = a.id
                 ORDER BY cl.call_time DESC, cl.created_at DESC
                 LIMIT 1) AS latest_call_status,
               (SELECT cl.notes FROM appointment_call_logs cl
                 WHERE cl.appointment_id = a.id
                 ORDER BY cl.call_time DESC, cl.created_at DESC
                 LIMIT 1) AS latest_call_notes,
               (SELECT ah.new_value->>'new_date' FROM appointment_history ah
                 WHERE ah.appointment_id = a.id
                   AND ah.action_type = 'call_change_date'
                 ORDER BY ah.changed_at DESC LIMIT 1) AS pending_new_date,
               (SELECT ah.new_value->>'new_time' FROM appointment_history ah
                 WHERE ah.appointment_id = a.id
                   AND ah.action_type = 'call_change_time'
                 ORDER BY ah.changed_at DESC LIMIT 1) AS pending_new_time,
               {PATIENT_TYPE_SQL} AS patient_type,
               p.name AS pname, p.phone, p.age, p.gender,
               p.existing_illnesses, p.total_visits,
               s.name AS doctor_name,
               sp.name AS specialist_name,
               sp.phone AS specialist_phone,
               sp.whatsapp_number AS specialist_whatsapp,
               COALESCE(bc.pending_lab_orders, 0) AS pending_lab_orders,
               COALESCE(bc.lab_ready_for_fitting, 0) AS lab_received_orders,
               psp.apt_id   AS pending_specialist_apt_id,
               psp.spec_id  AS pending_specialist_id,
               psp.spec_name AS pending_specialist_name,
               psp.spec_phone AS pending_specialist_phone,
               psp.spec_wa   AS pending_specialist_whatsapp,
               psp.spec_status AS pending_specialist_status,
               -- Engagement history (persists even after the work is done)
               shist.name AS hist_spec_name, shist.assigned_at AS hist_spec_on, shist.conf_status AS hist_spec_status,
               plab.work_type AS hist_lab_work, plab.status AS hist_lab_status,
               plab.received_date AS hist_lab_received, plab.expected_date AS hist_lab_expected,
               plab_pending.pending_orders AS pending_lab_details
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN staff s ON s.id = a.doctor_id
        LEFT JOIN staff sp ON sp.id = a.specialist_id
        LEFT JOIN patient_booking_constraints_v bc ON bc.patient_id = a.patient_id
        -- Patient-level pending specialist: a specialist the doctor assigned (possibly on a
        -- now-completed visit) that is still not confirmed. Lets the nurse handle it on the
        -- patient's upcoming/scheduling card even though it lives on a sibling appointment.
        LEFT JOIN LATERAL (
            SELECT sa.id AS apt_id, sa.specialist_id AS spec_id,
                   sp2.name AS spec_name, sp2.phone AS spec_phone, sp2.whatsapp_number AS spec_wa,
                   COALESCE(sa.specialist_confirmation_status, 'pending_call') AS spec_status
              FROM appointments sa
              LEFT JOIN staff sp2 ON sp2.id = sa.specialist_id
             WHERE sa.patient_id = a.patient_id
               AND sa.specialist_id IS NOT NULL
               AND COALESCE(sa.specialist_confirmation_status, 'pending_call') <> 'confirmed'
               AND COALESCE(sa.workflow_status, sa.status) NOT IN ('cancelled', 'rejected')
             ORDER BY sa.created_at DESC
             LIMIT 1
        ) psp ON TRUE
        -- Latest specialist EVER engaged for this patient (any status) — for the history line.
        LEFT JOIN LATERAL (
            SELECT sp3.name, sa.specialist_assigned_at AS assigned_at,
                   COALESCE(sa.specialist_confirmation_status, 'pending_call') AS conf_status
              FROM appointments sa
              LEFT JOIN staff sp3 ON sp3.id = sa.specialist_id
             WHERE sa.patient_id = a.patient_id AND sa.specialist_id IS NOT NULL
             ORDER BY sa.specialist_assigned_at DESC NULLS LAST, sa.created_at DESC
             LIMIT 1
        ) shist ON TRUE
        -- Latest lab order for this patient — for the history line (received date or tentative).
        LEFT JOIN LATERAL (
            SELECT lo.work_type, lo.status, lo.received_date, lo.expected_date
              FROM lab_orders lo
             WHERE lo.patient_id = a.patient_id AND lo.status <> 'cancelled'
             ORDER BY lo.created_at DESC
             LIMIT 1
        ) plab ON TRUE
        -- All pending lab orders for this patient — for inline nurse confirmation.
        LEFT JOIN LATERAL (
            SELECT COALESCE(json_agg(json_build_object(
                'order_id', lo2.id,
                'work_type', lo2.work_type,
                'vendor_name', COALESCE(lv.name, 'Unknown'),
                'expected_date', lo2.expected_date,
                'status', lo2.status,
                'teeth', lo2.teeth
            ) ORDER BY lo2.expected_date NULLS LAST), '[]'::json) AS pending_orders
              FROM lab_orders lo2
              LEFT JOIN lab_vendors lv ON lv.id = lo2.vendor_id
             WHERE lo2.patient_id = a.patient_id
               AND lo2.status IN ('pending','sent')
        ) plab_pending ON TRUE
        WHERE a.clinic_id = :cid
          AND (
                NOT EXISTS (SELECT 1 FROM treatment_plans tp WHERE tp.patient_id = a.patient_id)
                OR EXISTS (
                    SELECT 1 FROM treatment_plans tp
                    WHERE tp.patient_id = a.patient_id
                      AND tp.is_archived = FALSE
                      AND COALESCE(tp.status, 'treatment_advised') NOT IN ('closed','completed','cancelled','archived')
                )
              )
          AND (
                COALESCE(a.confirmed_date, a.requested_date) BETWEEN :fd AND :td
                OR (a.confirmed_date IS NULL AND a.requested_date IS NULL)
              )
          AND COALESCE(a.workflow_status, a.status) NOT IN ('completed','done','payment_pending')
        ORDER BY COALESCE(a.confirmed_date, a.requested_date), COALESCE(a.confirmed_time, a.requested_time) NULLS LAST
    """), {"cid": str(clinic_id), "fd": from_date, "td": to_date})).mappings().all()
    return {
        "from": from_date.isoformat(), "to": to_date.isoformat(),
        "appointments": [{
            "id": str(r["id"]), "patient_id": str(r["patient_id"]),
            "patient_name": r["pname"], "phone": r["phone"], "age": r["age"], "gender": r["gender"],
            "existing_illnesses": r["existing_illnesses"] or [], "total_visits": r["total_visits"] or 0,
            "scheduled_date": r["sched_date"].isoformat() if r["sched_date"] else None,
            "scheduled_time": str(r["sched_time"])[:5] if r["sched_time"] else None,
            "appointment_type": r["appointment_type"] or r["reason"] or "Consultation",
            "workflow_status": r["workflow_status"] or "scheduled",
            "source": r["source"],
            "booking_source": r["source"],
            "patient_type": r["patient_type"],
            "call_status": _norm_call(r["contact_status"]),
            "call_count": int(r["call_count"] or 0),
            "no_answer_count": int(r["no_answer_count"] or 0),
            "latest_call_status": r["latest_call_status"],
            "latest_call_notes": r["latest_call_notes"],
            "chief_complaints": r["chief_complaints"] or [],
            "doctor_name": r["doctor_name"],
            "pending_action": r["pending_action"],
            "pending_action_since": r["pending_action_since"].isoformat() if r["pending_action_since"] else None,
            "cancel_reason": r["cancel_reason"],
            "pending_new_date": r["pending_new_date"],
            "pending_new_time": r["pending_new_time"],
            "specialist_id": str(r["specialist_id"]) if r["specialist_id"] else None,
            "specialist_name": r["specialist_name"],
            "specialist_phone": r["specialist_phone"],
            "specialist_whatsapp": r["specialist_whatsapp"],
            "specialist_confirmation_status": r["specialist_confirmation_status"],
            # Patient-level pending specialist (may live on a sibling/completed appointment)
            "pending_specialist_apt_id": str(r["pending_specialist_apt_id"]) if r["pending_specialist_apt_id"] else None,
            "pending_specialist_id": str(r["pending_specialist_id"]) if r["pending_specialist_id"] else None,
            "pending_specialist_name": r["pending_specialist_name"],
            "pending_specialist_phone": r["pending_specialist_phone"],
            "pending_specialist_whatsapp": r["pending_specialist_whatsapp"],
            "pending_specialist_status": r["pending_specialist_status"],
            # Engagement history (shown even after the work is done)
            "hist_spec_name": r["hist_spec_name"],
            "hist_spec_on": r["hist_spec_on"].date().isoformat() if r["hist_spec_on"] else None,
            "hist_spec_status": r["hist_spec_status"],
            "hist_lab_work": r["hist_lab_work"],
            "hist_lab_status": r["hist_lab_status"],
            "hist_lab_received": r["hist_lab_received"].isoformat() if r["hist_lab_received"] else None,
            "hist_lab_expected": r["hist_lab_expected"].isoformat() if r["hist_lab_expected"] else None,
            "pending_lab_orders": int(r["pending_lab_orders"] or 0),
            "pending_lab_details": (
                r["pending_lab_details"] if isinstance(r.get("pending_lab_details"), list)
                else json.loads(r["pending_lab_details"]) if r.get("pending_lab_details")
                else []
            ),
            "lab_received_orders": int(r["lab_received_orders"] or 0),
            "duration_minutes": r["duration_minutes"],
        } for r in rows],
        "total": len(rows),
    }

# ─────────────────────── SCHEDULE / FOLLOW-UP ───────────────────
@router.get("/followup")
async def hub_followup(clinic_id: UUID, days_ahead: int = 60, include_overdue: bool = True,
                       db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text(f"""
        SELECT a.id, a.patient_id, COALESCE(a.confirmed_date, a.requested_date) AS sched_date,
               COALESCE(a.confirmed_time, a.requested_time) AS sched_time,
               a.reason, a.status, a.appointment_type, a.contact_status,
               COALESCE(a.workflow_status, a.status) AS ws,
               {PATIENT_TYPE_SQL} AS patient_type,
               p.name AS pname, p.phone, p.age, s.name AS doctor_name
        FROM appointments a JOIN patients p ON p.id=a.patient_id LEFT JOIN staff s ON s.id=a.doctor_id
        WHERE a.clinic_id=:cid
          AND (
                NOT EXISTS (SELECT 1 FROM treatment_plans tp WHERE tp.patient_id = a.patient_id)
                OR EXISTS (
                    SELECT 1 FROM treatment_plans tp
                    WHERE tp.patient_id = a.patient_id
                      AND tp.is_archived = FALSE
                      AND COALESCE(tp.status, 'treatment_advised') NOT IN ('closed','completed','cancelled','archived')
                )
              )
          AND (
            (COALESCE(a.confirmed_date, a.requested_date) > CURRENT_DATE
             AND COALESCE(a.confirmed_date, a.requested_date) <= CURRENT_DATE + CAST(:days AS INTEGER)
             AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled','rejected','done','completed','payment_pending'))
            OR
            (CAST(:overdue AS BOOLEAN) AND COALESCE(a.confirmed_date, a.requested_date) < CURRENT_DATE
             AND COALESCE(a.workflow_status, a.status) IN ('scheduled','pending'))
            OR
            (a.confirmed_date IS NULL AND a.requested_date IS NULL
             AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled','rejected','done','completed','payment_pending'))
          )
        ORDER BY COALESCE(a.confirmed_date, a.requested_date), COALESCE(a.confirmed_time, a.requested_time) NULLS LAST
    """), {"cid": str(clinic_id), "days": days_ahead, "overdue": include_overdue})).mappings().all()
    by_date: dict = {}
    overdue: list = []
    today = date_type.today()
    for r in rows:
        item = {
            "id": str(r["id"]), "patient_id": str(r["patient_id"]),
            "patient_name": r["pname"], "phone": r["phone"], "age": r["age"],
            "scheduled_time": str(r["sched_time"])[:5] if r["sched_time"] else None,
            "scheduled_date": r["sched_date"].isoformat() if r["sched_date"] else None,
            "reason": r["reason"], "appointment_type": r["appointment_type"],
            "workflow_status": r["ws"], "doctor_name": r["doctor_name"],
            "patient_type": r["patient_type"], "contact_status": _norm_call(r["contact_status"]),
        }
        if r["sched_date"] and r["sched_date"] < today:
            overdue.append(item)
        else:
            by_date.setdefault(item["scheduled_date"] or "unknown", []).append(item)
    return {"dates": by_date, "overdue": overdue, "total": len(rows)}

# ─────────────────────────────── MARK STATUS ───────────────────────────────
@router.post("/mark/{apt_id}")
async def mark_status(apt_id: UUID, body: WorkflowMarkIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text(
        "SELECT COALESCE(workflow_status,status) AS ws, patient_id, clinic_id, contact_status FROM appointments WHERE id=:id"
    ), {"id": str(apt_id)})).mappings().one_or_none()
    if not row: raise HTTPException(404, "Not found")
    current = row["ws"] or "scheduled"
    new = "arrived" if body.new_status == "ready" else body.new_status   # ready folded into arrived
    allowed = VALID_TRANSITIONS.get(current, [])
    if new not in allowed:
        raise HTTPException(400, f"Cannot move '{current}' to '{new}'. Allowed: {allowed}")

    if new == "arrived":
        # Gate 1: patient must be called & confirmed
        if _norm_call(row.get("contact_status")) != "confirmed":
            raise HTTPException(409, "Call & confirm is required before sending this patient to the doctor queue")
        # Gate 2: if a specialist is assigned, they must also be called & confirmed
        spec_chk = (await db.execute(sql_text("""
            SELECT specialist_id, specialist_confirmation_status
              FROM appointments WHERE id = :id
        """), {"id": str(apt_id)})).mappings().first()
        if spec_chk and spec_chk.get("specialist_id"):
            if (spec_chk.get("specialist_confirmation_status") or "pending_call") != "confirmed":
                spec_status = spec_chk.get("specialist_confirmation_status") or "pending_call"
                raise HTTPException(
                    409,
                    f"Specialist is assigned but not yet called & confirmed (status: {spec_status}). "
                    f"Please use 'Call Specialist' button first."
                )
        # Gate 3: no pending lab orders
        try:
            gate_row = (await db.execute(sql_text("""
                SELECT pending_lab_orders
                  FROM patient_booking_constraints_v
                 WHERE patient_id = :pid
            """), {"pid": str(row["patient_id"])})).mappings().first()
        except Exception:
            gate_row = None
        if gate_row:
            pending_lab = int(gate_row.get("pending_lab_orders") or 0)
            if pending_lab > 0:
                raise HTTPException(409, f"Appointment blocked: {pending_lab} pending lab order(s). Nurse must mark lab order received first.")

    extra = ""
    if new == "arrived":      extra = ", arrived_at=NOW()"
    elif new == "in_treatment": extra = ", started_at=NOW()"
    elif new == "completed":  extra = ", completed_at=NOW()"
    if new == "cancelled":
        await db.execute(sql_text("""
            UPDATE appointments SET
                workflow_status='cancelled',
                status='cancelled',
                cancel_reason=:cr,
                requested_date=NULL,
                requested_time=NULL,
                confirmed_date=NULL,
                confirmed_time=NULL,
                scheduled_date=NULL,
                scheduled_time=NULL,
                updated_at=NOW()
            WHERE id=:id
        """), {"id": str(apt_id), "cr": (body.cancel_reason or "Cancelled").strip()})
    else:
        await db.execute(sql_text(f"UPDATE appointments SET workflow_status=:ns, status=:ns{extra}, updated_at=NOW() WHERE id=:id"),
                         {"ns": new, "id": str(apt_id)})

    if new == "arrived":   # arrived == entered doctor queue -> notify doctor (and specialist if assigned)
        pn = (await db.execute(sql_text("SELECT name FROM patients WHERE id=:p"), {"p": str(row["patient_id"])})).mappings().one()["name"]
        await db.execute(sql_text("""INSERT INTO clinic_notifications (clinic_id,notification_type,recipient_role,title,message,priority,related_patient_id,related_appointment_id)
            VALUES(:c,'patient_arrived','doctor',:t,:m,'high',:p,:a)"""),
            {"c": str(row["clinic_id"]), "t": f"🟢 {pn} arrived", "m": f"{pn} is waiting in your queue", "p": str(row["patient_id"]), "a": str(apt_id)})
        # If a specialist is assigned, push the same patient into the specialist's queue too.
        spec = (await db.execute(sql_text(
            "SELECT specialist_id FROM appointments WHERE id=:id"), {"id": str(apt_id)})).mappings().first()
        if spec and spec.get("specialist_id"):
            await db.execute(sql_text(
                "UPDATE appointments SET specialist_session_status='pending', updated_at=NOW() WHERE id=:id"),
                {"id": str(apt_id)})
            await db.execute(sql_text("""INSERT INTO specialist_notifications
                (appointment_id, specialist_id, recipient_role, event_type, channel, message)
                VALUES(:a,:sp,'specialist','patient_in_queue','manual',:m)"""),
                {"a": str(apt_id), "sp": str(spec["specialist_id"]), "m": f"{pn} is now in the queue and waiting"})
        try:
            await notify_arrival_confirmation(db, str(apt_id))
        except Exception:
            pass
    return {"status": new}

# ───────────────── ADMIN CASE MANAGER (status rescue) ──────────────────
# Patients can get "stuck" in a status with no valid forward transition
# (e.g. payment_pending, completed, cancelled) so they vanish from the queue
# and can't be rescheduled. These admin-only endpoints list every appointment
# and let an admin/doctor force any status, bypassing VALID_TRANSITIONS.

@router.get("/admin/all-appointments")
async def admin_all_appointments(
    clinic_id: UUID,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if staff.get("role") not in ("admin", "doctor"):
        raise HTTPException(403, "Admin or doctor access required")
    where = "a.clinic_id = :c"
    params: dict = {"c": str(clinic_id)}
    if status:
        where += " AND COALESCE(a.workflow_status, a.status) = :st"
        params["st"] = status
    rows = (await db.execute(sql_text(f"""
        SELECT a.id, a.patient_id,
               COALESCE(a.workflow_status, a.status) AS workflow_status,
               a.scheduled_date, a.scheduled_time,
               a.requested_date, a.requested_time,
               a.confirmed_date, a.confirmed_time,
               a.reason, a.appointment_type, a.cancel_reason,
               a.updated_at, a.created_at,
               p.name AS patient_name, p.phone
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
         WHERE {where}
         ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC NULLS LAST
    """), params)).mappings().all()
    return {"appointments": [dict(r) for r in rows]}


@router.post("/admin/force-status/{apt_id}")
async def admin_force_status(
    apt_id: UUID,
    body: AdminForceStatusIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if staff.get("role") not in ("admin", "doctor"):
        raise HTTPException(403, "Admin or doctor access required")
    ns = (body.new_status or "").strip()
    if ns not in ALL_STATUSES:
        raise HTTPException(400, f"Invalid status '{ns}'. Allowed: {sorted(ALL_STATUSES)}")
    row = (await db.execute(sql_text(
        "SELECT COALESCE(workflow_status, status) AS ws FROM appointments WHERE id = :id"
    ), {"id": str(apt_id)})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Appointment not found")
    old = row["ws"]

    sets = ["workflow_status = :ns", "status = :ns", "updated_at = NOW()"]
    params: dict = {"ns": ns, "id": str(apt_id)}
    if ns == "arrived":
        sets.append("arrived_at = NOW()")
    elif ns == "in_treatment":
        sets.append("started_at = NOW()")
    elif ns == "completed":
        sets.append("completed_at = NOW()")
    if ns == "cancelled":
        sets.append("cancel_reason = :cr")
        params["cr"] = (body.reason or "Cancelled by admin").strip()
    if body.clear_schedule:
        sets += ["scheduled_date = NULL", "scheduled_time = NULL",
                 "confirmed_date = NULL", "confirmed_time = NULL"]
    await db.execute(sql_text(f"UPDATE appointments SET {', '.join(sets)} WHERE id = :id"), params)

    # Best-effort audit log — never let it block the override.
    try:
        async with db.begin_nested():
            await db.execute(sql_text("""
                INSERT INTO appointment_history
                    (appointment_id, action_type, old_value, new_value, changed_by_staff_id, notes)
                VALUES (CAST(:a AS UUID), 'admin_override',
                        jsonb_build_object('status', :old),
                        jsonb_build_object('status', :ns, 'clear_schedule', :cs),
                        CAST(:by AS UUID), :notes)
            """), {
                "a": str(apt_id), "old": old or "", "ns": ns,
                "cs": str(body.clear_schedule).lower(),
                "by": str(staff["staff_id"]),
                "notes": (body.reason or "").strip(),
            })
    except Exception:
        pass
    return {"status": ns, "previous": old, "cleared_schedule": body.clear_schedule}

# ─────────────────────────── DOCTOR QUEUE ──────────────────────
@router.get("/queue")
async def hub_queue(clinic_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text(f"""
        SELECT a.id AS apt_id, a.patient_id, COALESCE(a.confirmed_time,a.requested_time) AS sched_time,
               a.reason, a.appointment_type, a.arrived_at, a.chief_complaints, a.source,
               COALESCE(a.workflow_status,a.status) AS ws,
               a.specialist_id, a.specialist_session_status,
               {PATIENT_TYPE_SQL} AS patient_type,
               p.name AS pname, p.phone, p.age, p.existing_illnesses, p.total_visits,
               s.name AS doctor_name, sp.name AS specialist_name,
               ts.id AS session_id, ts.amount_payable, ts.amount_collected, ts.discount_amount
        FROM appointments a JOIN patients p ON p.id=a.patient_id LEFT JOIN staff s ON s.id=a.doctor_id
        LEFT JOIN staff sp ON sp.id = a.specialist_id
        LEFT JOIN LATERAL (
            SELECT id, amount_payable, amount_collected, discount_amount
            FROM treatment_sessions
            WHERE appointment_id = a.id
            ORDER BY started_at DESC NULLS LAST
            LIMIT 1
        ) ts ON TRUE
        WHERE a.clinic_id=:cid AND (a.confirmed_date=CURRENT_DATE OR a.requested_date=CURRENT_DATE)
          AND COALESCE(a.workflow_status,a.status) NOT IN ('cancelled','rejected')
        ORDER BY a.arrived_at NULLS LAST, COALESCE(a.confirmed_time,a.requested_time) NULLS LAST
    """), {"cid": str(clinic_id)})).mappings().all()

    now = datetime.now(timezone.utc)
    segs = {"expected": [], "waiting": [], "in_treatment": [], "payment_pending": [], "collected": []}
    revenue = 0.0
    for r in rows:
        ws = r["ws"] or "scheduled"
        # Legacy rows: status=in_progress but workflow still confirmed/arrived
        if ws in ("scheduled", "pending", "confirmed", "arrived", "ready") and r.get("session_id"):
            ws = "in_treatment"
        arrived = r["arrived_at"]
        waiting_min = None
        if arrived:
            a = arrived if arrived.tzinfo else arrived.replace(tzinfo=timezone.utc)
            waiting_min = max(0, int((now - a).total_seconds() // 60))
        item = {
            "apt_id": str(r["apt_id"]), "patient_id": str(r["patient_id"]),
            "patient_name": r["pname"], "phone": r["phone"], "age": r["age"],
            "reason": r["reason"], "appointment_type": r["appointment_type"] or r["reason"] or "Consultation",
            "patient_type": r["patient_type"], "doctor_name": r["doctor_name"],
            "chief_complaints": r["chief_complaints"] or [],
            "existing_illnesses": r["existing_illnesses"] or [],
            "session_id": str(r["session_id"]) if r["session_id"] else None,
            "amount_payable": float(r["amount_payable"] or 0), "amount_collected": float(r["amount_collected"] or 0),
            "scheduled_time": str(r["sched_time"])[:5] if r["sched_time"] else None,
            "arrived_at": arrived.isoformat() if arrived else None,
            "waiting_minutes": waiting_min, "workflow_status": ws,
            "specialist_id": str(r["specialist_id"]) if r["specialist_id"] else None,
            "specialist_name": r["specialist_name"],
            "specialist_session_status": r["specialist_session_status"],
        }
        if ws in ("scheduled", "pending", "confirmed"):       segs["expected"].append(item)
        elif ws in ("arrived", "ready"):                      segs["waiting"].append(item)
        elif ws in ("in_treatment", "in_progress"):           segs["in_treatment"].append(item)
        elif ws == "payment_pending":                         segs["payment_pending"].append(item)
        elif ws in ("completed", "done"):
            segs["collected"].append(item); revenue += float(r["amount_collected"] or 0)

    counts = {k: len(v) for k, v in segs.items()}
    counts["completed"] = counts["collected"]                 # spec counter naming
    return {"segments": segs, "counts": counts, "collected": revenue, "revenue": revenue}

# ─────────────────────────── CALL DIARY ────────────────────────
@router.get("/call-diary")
async def call_diary(clinic_id: UUID, days_ahead: int = 7, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text(f"""
        SELECT a.id, a.patient_id, COALESCE(a.confirmed_date,a.requested_date) AS d,
               COALESCE(a.confirmed_time,a.requested_time) AS t,
               a.reason, a.appointment_type, a.contact_status, a.last_contacted_at,
               COALESCE(a.workflow_status,a.status) AS ws,
               {PATIENT_TYPE_SQL} AS patient_type,
               p.name AS pname, p.phone,
               (SELECT COUNT(*) FROM appointment_call_logs WHERE appointment_id=a.id) AS call_count
        FROM appointments a JOIN patients p ON p.id=a.patient_id
        WHERE a.clinic_id=:cid
          AND COALESCE(a.confirmed_date,a.requested_date) BETWEEN CURRENT_DATE AND CURRENT_DATE + CAST(:days AS INTEGER)
          AND COALESCE(a.workflow_status,a.status) IN ('scheduled','pending','confirmed','rescheduled')
        ORDER BY COALESCE(a.confirmed_date,a.requested_date), COALESCE(a.confirmed_time,a.requested_time) NULLS LAST
    """), {"cid": str(clinic_id), "days": days_ahead})).mappings().all()
    out = [{
        "id": str(r["id"]), "patient_id": str(r["patient_id"]), "patient_name": r["pname"], "phone": r["phone"],
        "date": r["d"].isoformat() if r["d"] else None, "time": str(r["t"])[:5] if r["t"] else None,
        "reason": r["reason"], "appointment_type": r["appointment_type"],
        "call_status": _norm_call(r["contact_status"]), "workflow_status": r["ws"],
        "patient_type": r["patient_type"], "call_count": r["call_count"],
        "last_contacted_at": r["last_contacted_at"].isoformat() if r["last_contacted_at"] else None,
    } for r in rows]
    summary = {}
    for o in out: summary[o["call_status"]] = summary.get(o["call_status"], 0) + 1
    return {"entries": out, "summary": summary, "total": len(out)}

@router.post("/call-status/{apt_id}")
async def set_call_status(apt_id: UUID, body: CallStatusIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    valid = {"pending_call","confirmed","no_answer","call_back_later","cancelled_by_patient","rescheduled"}
    if body.call_status not in valid: raise HTTPException(400, f"Invalid call status. Use one of {sorted(valid)}")
    row = (await db.execute(sql_text("SELECT COALESCE(workflow_status,status) AS ws FROM appointments WHERE id=:i"),
                            {"i": str(apt_id)})).mappings().one_or_none()
    if not row: raise HTTPException(404, "Appointment not found")
    await db.execute(sql_text("""UPDATE appointments SET contact_status=:cs, last_contacted_at=NOW(),
        last_contacted_by=:by, updated_at=NOW() WHERE id=:i"""),
        {"cs": body.call_status, "by": str(staff["staff_id"]), "i": str(apt_id)})
    await db.execute(sql_text("""INSERT INTO appointment_call_logs (appointment_id,called_by_staff_id,call_status,notes)
        VALUES(:a,:s,:st,:n)"""), {"a": str(apt_id), "s": str(staff["staff_id"]), "st": body.call_status, "n": body.notes})
    # Side-effects: confirmed → workflow confirmed; cancelled_by_patient → cancelled
    if body.call_status == "confirmed" and row["ws"] in ("scheduled", "pending"):
        await db.execute(sql_text("UPDATE appointments SET workflow_status='confirmed',status='confirmed' WHERE id=:i"), {"i": str(apt_id)})
    if body.call_status == "cancelled_by_patient":
        await db.execute(sql_text("""
            UPDATE appointments SET
                workflow_status='cancelled',
                status='cancelled',
                cancel_reason=:cr,
                requested_date=NULL,
                requested_time=NULL,
                confirmed_date=NULL,
                confirmed_time=NULL,
                scheduled_date=NULL,
                scheduled_time=NULL,
                updated_at=NOW()
            WHERE id=:i
        """), {"i": str(apt_id), "cr": (body.notes or "Cancelled by patient (call)").strip()})
    return {"call_status": body.call_status}

# ─────────────────────── APPOINTMENT TYPES ─────────────────────
@router.get("/appointment-types")
async def appointment_types(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("SELECT id,type_name FROM appointment_types ORDER BY sort_order,type_name"))).mappings().all()
    return [{"id": str(r["id"]), "name": r["type_name"]} for r in rows]

@router.post("/appointment-types", status_code=201)
async def add_appointment_type(name: str, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    try:
        row = (await db.execute(sql_text(
            "INSERT INTO appointment_types (type_name) VALUES(:n) ON CONFLICT (type_name) DO NOTHING RETURNING id"
        ), {"n": name.strip()})).mappings().one_or_none()
        return {"name": name, "added": row is not None}
    except Exception:
        return {"name": name, "added": False}

# ───────────────────── PHONE CHECK (spec popup) ────────────────
@router.get("/check-phone/{phone}")
async def check_phone(phone: str, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    cleaned = _normalize_phone_digits(phone)
    rows = (await db.execute(sql_text("""
        SELECT DISTINCT ON (
               LOWER(TRIM(COALESCE(p.name, ''))),
               RIGHT(regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g'), 10)
        )
               p.id, p.name, p.phone, p.age, p.gender, p.total_visits, p.existing_illnesses, p.alternate_whatsapp_number,
               (SELECT tp.status FROM treatment_plans tp
                 WHERE tp.patient_id = p.id AND tp.is_archived = FALSE
                   AND COALESCE(tp.status, 'treatment_advised') NOT IN ('closed','cancelled','completed')
                 ORDER BY tp.created_at DESC LIMIT 1) AS active_plan_status,
               EXISTS(
                 SELECT 1 FROM treatment_plans tp2
                 WHERE tp2.patient_id = p.id
                   AND (tp2.is_archived = TRUE OR COALESCE(tp2.status, '') IN ('closed','completed'))
               ) AS has_closed_case,
               (SELECT MAX(COALESCE(a.confirmed_date, a.requested_date)) FROM appointments a
                 WHERE a.patient_id = p.id AND COALESCE(a.workflow_status,a.status) IN ('completed','done')) AS last_visit,
               (SELECT ts.treatment_notes FROM treatment_sessions ts
                 WHERE ts.patient_id = p.id AND ts.finalized_at IS NOT NULL
                 ORDER BY ts.finalized_at DESC LIMIT 1) AS last_notes,
               (SELECT string_agg(pd->>'procedure_name', ', ') FROM treatment_sessions ts2,
                       jsonb_array_elements(ts2.procedures_done) pd
                 WHERE ts2.patient_id = p.id AND ts2.finalized_at IS NOT NULL
                   AND ts2.finalized_at = (SELECT MAX(finalized_at) FROM treatment_sessions WHERE patient_id=p.id)) AS last_treatment
        FROM patients p
        WHERE RIGHT(regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g'), 10) = :ph
        ORDER BY LOWER(TRIM(COALESCE(p.name, ''))),
                 RIGHT(regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g'), 10),
                 p.created_at DESC
        LIMIT 10
    """), {"ph": cleaned})).mappings().all()
    return {"exists": len(rows) > 0, "matches": [{
        "id": str(r["id"]), "name": r["name"], "phone": r["phone"], "age": r["age"], "gender": r["gender"],
        "total_visits": r["total_visits"] or 0, "existing_illnesses": r["existing_illnesses"] or [],
        "alternate_whatsapp_number": r["alternate_whatsapp_number"],
        "booking_stage": (
            "active_treatment" if r["active_plan_status"]
            else "returning" if (r["total_visits"] or 0) > 0 or r["has_closed_case"]
            else "new"
        ),
        "active_plan_status": r["active_plan_status"],
        "has_closed_case": bool(r["has_closed_case"]),
        "last_visit": r["last_visit"].isoformat() if r["last_visit"] else None,
        "last_treatment": r["last_treatment"] or r["last_notes"],
    } for r in rows]}

# ─────────────────────────── ADD PATIENT ───────────────────────
@router.post("/add-patient", status_code=201)
async def add_patient(body: AddPatientIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    if body.use_existing_id:
        p = (await db.execute(sql_text("SELECT id,name FROM patients WHERE id=:i"), {"i": str(body.use_existing_id)})).mappings().one_or_none()
        if not p: raise HTTPException(404, "Not found")
        return {"patient_id": str(p["id"]), "name": p["name"], "is_new": False}
    cleaned_phone = _normalize_phone_digits(body.phone)
    cleaned_name = _normalize_name_key(body.name)
    if cleaned_phone and cleaned_name:
        existing = (await db.execute(sql_text("""
            SELECT id, name
              FROM patients
             WHERE RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) = :ph
               AND LOWER(TRIM(COALESCE(name, ''))) = :nm
             ORDER BY created_at DESC
             LIMIT 1
        """), {"ph": cleaned_phone, "nm": cleaned_name})).mappings().one_or_none()
        if existing:
            await db.execute(sql_text("""
                UPDATE patients
                   SET name = COALESCE(NULLIF(:n, ''), name),
                       age = COALESCE(:a, age),
                       gender = COALESCE(NULLIF(:g, ''), gender),
                       preferred_clinic_id = COALESCE(CAST(:c AS UUID), preferred_clinic_id),
                       alternate_whatsapp_number = COALESCE(NULLIF(:wa, ''), alternate_whatsapp_number),
                       existing_illnesses = CASE
                           WHEN COALESCE(:ill, '[]')::jsonb = '[]'::jsonb THEN existing_illnesses
                           ELSE COALESCE(:ill, '[]')::jsonb
                       END
                 WHERE id = :id
            """), {"n": body.name.strip(), "a": body.age, "g": body.gender, "c": str(body.clinic_id), "wa": body.alternate_whatsapp_number,
                   "ill": json.dumps(body.existing_illnesses), "id": str(existing["id"])})
            return {"patient_id": str(existing["id"]), "name": existing["name"], "is_new": False}
        shared_phone = (await db.execute(sql_text("""
            SELECT id, name
              FROM patients
             WHERE RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) = :ph
             ORDER BY created_at DESC
             LIMIT 1
        """), {"ph": cleaned_phone})).mappings().one_or_none()
        if shared_phone and not body.allow_shared_phone:
            raise HTTPException(409, f"Phone already exists for {shared_phone['name']}. Tick Family member / shared phone to create a separate patient.")
    if not cleaned_phone and cleaned_name:
        existing = (await db.execute(sql_text("""
            SELECT id, name
              FROM patients
             WHERE COALESCE(NULLIF(TRIM(phone), ''), '') = ''
               AND LOWER(TRIM(COALESCE(name, ''))) = :nm
             ORDER BY created_at DESC
             LIMIT 1
        """), {"nm": cleaned_name})).mappings().one_or_none()
        if existing:
            return {"patient_id": str(existing["id"]), "name": existing["name"], "is_new": False}
    row = (await db.execute(sql_text("""
        INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,alternate_whatsapp_number,existing_illnesses,total_visits,created_at)
        VALUES (:n,:p,:a,:g,:c,:wa,CAST(:ill AS JSONB),0,NOW()) RETURNING id
    """), {"n": body.name, "p": body.phone, "a": body.age, "g": body.gender, "c": str(body.clinic_id), "wa": body.alternate_whatsapp_number,
           "ill": json.dumps(body.existing_illnesses)})).mappings().one()
    return {"patient_id": str(row["id"]), "name": body.name, "is_new": True}

# ─────────────────────────── CLOSE SESSION ─────────────────────
@router.post("/close-session")
async def close_session(body: CloseSessionIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    sess = (await db.execute(sql_text("SELECT patient_id,clinic_id,appointment_id,doctor_id FROM treatment_sessions WHERE id=:i"),
                             {"i": str(body.session_id)})).mappings().one_or_none()
    if not sess: raise HTTPException(404, "Session not found")

    pid = str(sess["patient_id"])
    # ─── GATES: Close Treatment (archive) requires specialist verified + lab completed ───
    if getattr(body, 'archive_plan', False):
        # Gate A: specialist work must be verified (if any specialist appointments exist)
        unverified_spec = (await db.execute(sql_text("""
            SELECT COUNT(*) AS cnt FROM appointments
            WHERE patient_id = :pid AND specialist_id IS NOT NULL
              AND COALESCE(specialist_session_status, 'pending') NOT IN ('verified','none')
              AND status NOT IN ('cancelled','no_show')
        """), {"pid": pid})).mappings().first()
        if unverified_spec and int(unverified_spec["cnt"]) > 0:
            raise HTTPException(409,
                f"Cannot close treatment: {unverified_spec['cnt']} specialist session(s) not yet verified by doctor. "
                f"Please verify specialist work from the Workshop first.")

        # Gate B: all lab orders must be completed/received/fitted (none still pending/sent)
        pending_lab = (await db.execute(sql_text("""
            SELECT COUNT(*) AS cnt FROM lab_orders
            WHERE patient_id = :pid AND status IN ('pending','sent')
        """), {"pid": pid})).mappings().first()
        if pending_lab and int(pending_lab["cnt"]) > 0:
            raise HTTPException(409,
                f"Cannot close treatment: {pending_lab['cnt']} lab order(s) still pending. "
                f"Please confirm lab orders are received/completed first.")

    final = body.amount_payable - body.discount_amount
    await db.execute(sql_text("""UPDATE treatment_sessions SET procedures_done=CAST(:p AS JSONB),treatment_notes=:n,next_step=:ns,
        amount_payable=:a,discount_amount=:d,discount_reason=:dr,finalized_at=NOW(),status='awaiting_payment' WHERE id=:i"""),
        {"p": json.dumps(body.procedures_done), "n": body.treatment_notes, "ns": body.next_step,
         "a": final, "d": body.discount_amount, "dr": body.discount_reason, "i": str(body.session_id)})
    if sess["appointment_id"]:
        await db.execute(sql_text("UPDATE appointments SET workflow_status='payment_pending',status='payment_pending',updated_at=NOW() WHERE id=:i"),
                         {"i": str(sess["appointment_id"])})
    pname = (await db.execute(sql_text("SELECT name FROM patients WHERE id=:i"), {"i": str(sess["patient_id"])})).mappings().one()["name"]
    await db.execute(sql_text("""INSERT INTO clinic_notifications (clinic_id,notification_type,recipient_role,sender_staff_id,title,message,priority,related_patient_id,related_session_id)
        VALUES(:c,'payment_to_collect','nurse',:s,:t,:m,'high',:pid,:sid)"""),
        {"c": str(sess["clinic_id"]), "s": None, "t": f"Collect ₹{final:.0f} from {pname}", "m": f"Payment due for {pname}", "pid": str(sess["patient_id"]), "sid": str(body.session_id)})
    next_apt_id = None
    if body.next_appointment_date and not body.archive_plan:   # Close Session → goes to Schedule
        next_time = _parse_time_input(body.next_appointment_time, "10:00")
        na = (await db.execute(sql_text("""INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,source,status,workflow_status,created_at)
            VALUES(:p,:c,:d,:dt,:tm,:r,'followup','scheduled','scheduled',NOW()) RETURNING id"""),
            {"p": str(sess["patient_id"]), "c": str(sess["clinic_id"]), "d": str(sess["doctor_id"]),
             "dt": body.next_appointment_date, "tm": next_time, "r": body.next_step or "Follow-up"})).mappings().one()
        next_apt_id = str(na["id"])
    elif not body.archive_plan:
        next_apt_id = await _ensure_unscheduled_followup(
            db,
            patient_id=str(sess["patient_id"]),
            clinic_id=str(sess["clinic_id"]),
            doctor_id=str(sess["doctor_id"]) if sess["doctor_id"] else None,
            reason=body.next_step or "Follow-up",
        )
    if body.archive_plan:                                       # Close Treatment → Archive
        await db.execute(sql_text("UPDATE treatment_plans SET status='closed',is_archived=TRUE,archived_at=NOW(),updated_at=NOW() WHERE patient_id=:p AND is_archived=FALSE"),
                         {"p": str(sess["patient_id"])})
    if sess["appointment_id"]:
        try:
            await notify_thank_you_visit(db, str(sess["appointment_id"]))
        except Exception:
            pass
    await maybe_queue_rating_ask(db, str(body.session_id))
    return {"session_id": str(body.session_id), "final_amount": final, "next_appointment_id": next_apt_id,
            "archived": body.archive_plan}

# ───────────────────────── COLLECT PAYMENT ─────────────────────
@router.post("/collect-payment")
async def collect_payment(body: CollectPaymentIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    session_id = body.session_id
    if not session_id and body.appointment_id:
        row = (await db.execute(sql_text("""
            SELECT id FROM treatment_sessions
            WHERE appointment_id = :a
            ORDER BY started_at DESC NULLS LAST
            LIMIT 1
        """), {"a": str(body.appointment_id)})).mappings().one_or_none()
        if row:
            session_id = row["id"]
    if not session_id:
        raise HTTPException(400, "session_id or appointment_id required")
    sess = (await db.execute(sql_text("SELECT patient_id,clinic_id,doctor_id,appointment_id,amount_payable,amount_collected FROM treatment_sessions WHERE id=:i"),
                             {"i": str(session_id)})).mappings().one_or_none()
    if not sess: raise HTTPException(404, "Not found")
    total = body.cash_amount + body.upi_amount + body.card_amount
    if body.upi_amount > 0 and not (body.upi_txn_id or "").strip():
        raise HTTPException(400, "UPI reference is required for UPI payments")
    already = float(sess["amount_collected"] or 0)
    payable = float(sess["amount_payable"] or 0)
    if total < 0:
        raise HTTPException(400, "Payment amount cannot be negative")
    if payable > 0 and total <= 0:
        raise HTTPException(400, "Enter at least one payment amount")
    if payable <= 0 and total > 0:
        raise HTTPException(400, "Nothing is payable for this session")
    new_total = already + total
    if new_total - payable > 0.01:
        balance = max(payable - already, 0)
        raise HTTPException(400, f"Payment exceeds payable amount. Remaining balance is ₹{balance:,.2f}")
    await db.execute(sql_text("""UPDATE treatment_sessions SET amount_collected=:t,balance_remaining=GREATEST(amount_payable-:t,0),
        payment_collected_at=NOW(),payment_collected_by=:n,status=CASE WHEN :t>=amount_payable THEN 'completed' ELSE 'partial_payment' END WHERE id=:i"""),
        {"t": new_total, "n": str(staff["staff_id"]), "i": str(session_id)})
    for mode, amt, txn in [("cash", body.cash_amount, None), ("upi", body.upi_amount, body.upi_txn_id), ("card", body.card_amount, None)]:
        if amt > 0:
            payment_tx = (await db.execute(sql_text("""INSERT INTO payment_transactions (patient_id,clinic_id,amount,payment_mode,razorpay_payment_id,remarks,date)
                VALUES(:p,:c,:a,:m,:t,:n,CURRENT_DATE) RETURNING id"""),
                {"p": str(sess["patient_id"]), "c": str(sess["clinic_id"]), "a": amt, "m": mode, "t": txn, "n": body.notes})).mappings().one()
            await maybe_send_receipt(db, str(payment_tx["id"]))
    fully_paid = new_total >= payable
    if fully_paid and sess["appointment_id"]:
        await db.execute(sql_text("UPDATE appointments SET workflow_status='completed',status='completed',completed_at=NOW(),updated_at=NOW() WHERE id=:i"),
                         {"i": str(sess["appointment_id"])})
        await db.execute(sql_text("UPDATE patients SET total_visits=COALESCE(total_visits,0)+1,is_new_no_treatment=FALSE WHERE id=:p"),
                         {"p": str(sess["patient_id"])})
        await _ensure_unscheduled_followup(
            db,
            patient_id=str(sess["patient_id"]),
            clinic_id=str(sess["clinic_id"]),
            doctor_id=str(sess["doctor_id"]) if sess["doctor_id"] else None,
            reason="Follow-up",
        )
    return {"collected": total, "total_collected": new_total,
            "status": "completed" if fully_paid else "partial",
            "balance": max(payable - new_total, 0)}

@router.post("/return-to-today/{apt_id}")
async def return_to_today(apt_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Doctor can send a mistakenly queued patient back to Today's appointment list."""
    role = (staff or {}).get("role") if isinstance(staff, dict) else getattr(staff, "role", None)
    if role not in {"doctor", "admin", "nurse", "receptionist"}:
        raise HTTPException(403, "Not authorized")
    row = (await db.execute(sql_text("""
        UPDATE appointments
           SET requested_date = CURRENT_DATE,
               confirmed_date = CURRENT_DATE,
               scheduled_date = CURRENT_DATE,
               arrived_at = NULL,
               started_at = NULL,
               completed_at = NULL,
               workflow_status = 'confirmed',
               status = 'confirmed',
               contact_status = 'confirmed',
               updated_at = NOW()
         WHERE id = :id
     RETURNING id
    """), {"id": str(apt_id)})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Appointment not found")
    await db.commit()
    return {"ok": True, "status": "confirmed", "date": date_type.today().isoformat()}

# ─────────────────────────── BILLING ───────────────────────────
@router.get("/billing-today")
async def billing_today(clinic_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text(
        "SELECT payment_mode,COUNT(*) AS cnt,SUM(amount) AS total FROM payment_transactions WHERE clinic_id=:c AND date=CURRENT_DATE AND amount>0 GROUP BY payment_mode"
    ), {"c": str(clinic_id)})).mappings().all()
    by_mode = {r["payment_mode"]: {"count": r["cnt"], "amount": float(r["total"])} for r in rows}
    return {"date": date_type.today().isoformat(), "total": sum(v["amount"] for v in by_mode.values()), "by_mode": by_mode}

# ─────────────────── CONDITIONS & COMPLAINTS ───────────────────
@router.get("/conditions")
async def get_conditions(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("SELECT id,condition_name,category FROM common_conditions ORDER BY category,condition_name"))).mappings().all()
    return [{"id": str(r["id"]), "name": r["condition_name"], "category": r["category"]} for r in rows]

@router.post("/conditions", status_code=201)
async def add_condition(name: str, category: str = "general", db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    try:
        row = (await db.execute(sql_text("INSERT INTO common_conditions (condition_name,category) VALUES(:n,:c) ON CONFLICT (condition_name) DO NOTHING RETURNING id"),
                                {"n": name.strip(), "c": category})).mappings().one_or_none()
        return {"name": name, "added": row is not None}
    except Exception:
        return {"name": name, "added": False}

@router.post("/patient/{patient_id}/illnesses")
async def update_illnesses(patient_id: UUID, body: UpdateIllnessesIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE patients SET existing_illnesses=CAST(:i AS JSONB) WHERE id=:id"),
                     {"i": json.dumps(body.existing_illnesses), "id": str(patient_id)})
    return {"updated": True}

@router.get("/complaints")
async def get_complaints(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("SELECT id,complaint_name FROM common_complaints ORDER BY complaint_name"))).mappings().all()
    return [{"id": str(r["id"]), "name": r["complaint_name"]} for r in rows]

@router.post("/complaints", status_code=201)
async def add_complaint(name: str, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    try:
        row = (await db.execute(sql_text("INSERT INTO common_complaints (complaint_name) VALUES(:n) ON CONFLICT (complaint_name) DO NOTHING RETURNING id"),
                                {"n": name.strip()})).mappings().one_or_none()
        return {"name": name, "added": row is not None}
    except Exception:
        return {"name": name, "added": False}

# ─────────────────────────── RESCHEDULE ────────────────────────
@router.post("/reschedule/{apt_id}")
async def reschedule(apt_id: UUID, body: RescheduleIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """status='scheduled' pushes to Schedule; status='confirmed' + today pulls into Today."""
    edited_time = _parse_time_input(body.new_time) if body.new_time else None
    row = (await db.execute(sql_text(
        "SELECT patient_id, clinic_id, requested_date, requested_time, confirmed_date, confirmed_time FROM appointments WHERE id=:id"
    ), {"id": str(apt_id)})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Appointment not found")
    if _is_near_term_bucket(body.new_date):
        existing_near_term = await _find_existing_active_near_term_appointment(
            db, str(row["patient_id"]), str(row["clinic_id"]), str(apt_id)
        )
        if existing_near_term:
            existing_date = existing_near_term["effective_date"]
            existing_time = str(existing_near_term["effective_time"])[:5] if existing_near_term.get("effective_time") else "scheduled time"
            raise HTTPException(409, f"Patient already has an active near-term appointment on {existing_date.isoformat()} at {existing_time}")

        gate_row = (await db.execute(sql_text("""
            SELECT pending_lab_orders, specialist_pending_confirmation
              FROM patient_booking_constraints_v
             WHERE patient_id = :pid
        """), {"pid": str(row["patient_id"])})).mappings().first()
        if gate_row:
            pending_lab = int(gate_row.get("pending_lab_orders") or 0)
            if pending_lab > 0:
                raise HTTPException(409, f"Cannot schedule near-term: {pending_lab} pending lab order(s). Nurse must mark lab order received first.")
            if bool(gate_row.get("specialist_pending_confirmation")):
                raise HTTPException(409, "Cannot schedule near-term: Specialist is assigned but not confirmed yet. Please Call & Confirm Specialist first.")
    requested_time = edited_time or row["requested_time"]
    confirmed_time = None
    contact_status = "rescheduled"
    if body.status == "confirmed":
        confirmed_time = edited_time or row["confirmed_time"] or row["requested_time"]
        contact_status = "confirmed"
    res = await db.execute(sql_text("""UPDATE appointments SET requested_date=:d,
        requested_time=:rt,
        confirmed_date=:cd,
        confirmed_time=:ct,
        arrived_at=NULL,
        started_at=NULL,
        completed_at=NULL,
        workflow_status=:st, status=:st,
        contact_status=:cs,
        -- Date moved: the patient (contact_status above) AND any assigned specialist
        -- must be called & confirmed again before this can re-enter the doctor queue.
        specialist_confirmation_status=CASE WHEN specialist_id IS NOT NULL THEN 'pending_call' ELSE specialist_confirmation_status END,
        reschedule_reason=COALESCE(:r, reschedule_reason), updated_at=NOW() WHERE id=:id"""),
        {"d": body.new_date, "rt": requested_time, "cd": body.new_date if body.status == "confirmed" else None,
         "ct": confirmed_time, "st": body.status, "cs": contact_status, "r": body.reason, "id": str(apt_id)})
    if res.rowcount == 0: raise HTTPException(404, "Appointment not found")
    # Lab expected delivery should track the patient's scheduled date — when the visit date
    # moves, push the patient's still-open lab orders to the new date so the lab targets it.
    if body.new_date:
        await db.execute(sql_text("""
            UPDATE lab_orders SET expected_date = :d, updated_at = NOW()
             WHERE patient_id = :pid AND status IN ('pending', 'sent')
        """), {"d": body.new_date, "pid": str(row["patient_id"])})
    try:
        await notify_appointment_rescheduled(
            db,
            str(apt_id),
            row["confirmed_date"] or row["requested_date"],
            row["confirmed_time"] or row["requested_time"],
            body.new_date,
            confirmed_time or requested_time,
        )
    except Exception:
        pass
    return {"rescheduled": True, "date": body.new_date.isoformat(), "status": body.status}


@router.post("/time/{apt_id}")
async def update_time(apt_id: UUID, body: TimeEditIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Edit only appointment time without changing date/status."""
    edited_time = _parse_time_input(body.new_time)
    res = await db.execute(sql_text("""UPDATE appointments SET
        requested_time=:t,
        confirmed_time=CASE WHEN confirmed_date IS NOT NULL THEN :t ELSE confirmed_time END,
        updated_at=NOW() WHERE id=:id"""), {"t": edited_time, "id": str(apt_id)})
    if res.rowcount == 0: raise HTTPException(404, "Appointment not found")
    return {"updated": True, "time": body.new_time}

# ─────────────────────────── WHATSAPP ──────────────────────────
@router.get("/bulk-whatsapp")
async def bulk_whatsapp(clinic_id: UUID, only_uncontacted: bool = True, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    filt = "AND NOT EXISTS (SELECT 1 FROM appointment_call_logs WHERE appointment_id=a.id)" if only_uncontacted else ""
    rows = (await db.execute(sql_text(f"""
        SELECT a.id, a.requested_date, COALESCE(a.confirmed_time,a.requested_time) AS t, a.reason,
               p.name, p.phone, p.alternate_whatsapp_number, c.name AS cname
        FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN clinics c ON c.id=a.clinic_id
        WHERE a.clinic_id=:c AND (a.confirmed_date=CURRENT_DATE OR a.requested_date=CURRENT_DATE)
          AND COALESCE(a.workflow_status,a.status) NOT IN ('cancelled','rejected','done','completed')
          {filt}
        ORDER BY COALESCE(a.confirmed_time,a.requested_time)
    """), {"c": str(clinic_id)})).mappings().all()
    result = []
    for r in rows:
        msg = f"Hi {r['name']}, your appointment at {r['cname']} is today at {str(r['t'])[:5] if r['t'] else 'scheduled time'}. Please confirm. — {r['cname']}"
        ph = "".join(c for c in (r["alternate_whatsapp_number"] or r["phone"] or "") if c.isdigit())
        if len(ph) == 10: ph = "91" + ph
        result.append({"apt_id": str(r["id"]), "patient_name": r["name"], "phone": r["phone"],
                       "whatsapp_url": f"https://wa.me/{ph}?text={quote(msg)}"})
    return {"count": len(result), "patients": result}

@router.get("/doctor-day-list")
async def doctor_day_list(clinic_id: UUID, doctor_phone: Optional[str] = None,
                          db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """WhatsApp-ready summary of today's appointment list for the doctor."""
    rows = (await db.execute(sql_text(f"""
        SELECT COALESCE(a.confirmed_time,a.requested_time) AS t, a.reason, a.appointment_type,
               {PATIENT_TYPE_SQL} AS pt, p.name, c.name AS cname,
               COALESCE(a.workflow_status, a.status) AS ws
        FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN clinics c ON c.id=a.clinic_id
        WHERE a.clinic_id=:c AND (a.confirmed_date=CURRENT_DATE OR a.requested_date=CURRENT_DATE)
          AND COALESCE(a.workflow_status,a.status) NOT IN ('cancelled','rejected')
        ORDER BY COALESCE(a.confirmed_time,a.requested_time) NULLS LAST
    """), {"c": str(clinic_id)})).mappings().all()
    icon = {"new": "🟠", "followup": "🔵", "walkin": "🟣", "emergency": "🔴"}
    
    expected = len(rows)
    arrived = sum(1 for r in rows if r["ws"] in ("arrived", "ready"))
    completed = sum(1 for r in rows if r["ws"] in ("completed", "done"))
    payment_pending = sum(1 for r in rows if r["ws"] == "payment_pending")

    lines = [
        f"📋 Today's Appointments — {rows[0]['cname'] if rows else ''} ({date_type.today().strftime('%d-%b-%Y')})",
        f"📊 Summary:",
        f"  • Expected Today: {expected}",
        f"  • Arrived/Waiting: {arrived}",
        f"  • Completed: {completed}",
        f"  • Payment Pending: {payment_pending}",
        "",
        "⏰ Appointment List:"
    ]
    for i, r in enumerate(rows, 1):
        t = str(r["t"])[:5] if r["t"] else "—"
        lines.append(f"{i}. {t} {icon.get(r['pt'],'•')} {r['name']} — {r['appointment_type'] or r['reason'] or 'Consultation'}")
    if not rows: lines.append("No appointments yet.")
    msg = "\n".join(lines)
    ph = "".join(ch for ch in (doctor_phone or "") if ch.isdigit())
    if len(ph) == 10: ph = "91" + ph
    return {"count": len(rows), "message": msg,
            "whatsapp_url": f"https://wa.me/{ph}?text={quote(msg)}" if ph else f"https://wa.me/?text={quote(msg)}"}

# ─────────────── BOOK (walk-in / appointment with full spec data) ───────────
class BookIn(BaseModel):
    patient_id: UUID; clinic_id: UUID
    date: Optional[date_type] = None; time: Optional[str] = None
    appointment_type: str = "Consultation"
    chief_complaints: List[str] = Field(default_factory=list)
    emergency: bool = False
    doctor_id: Optional[UUID] = None
    phone_number: Optional[str] = None  # new: phone captured at booking time

@router.post("/book", status_code=201)
async def hub_book(body: BookIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    d = body.date or date_type.today()
    t = _parse_time_input(body.time, datetime.now().strftime("%H:%M"))
    if _is_near_term_bucket(d):
        existing_near_term = await _find_existing_active_near_term_appointment(db, str(body.patient_id), str(body.clinic_id))
        if existing_near_term:
            existing_date = existing_near_term["effective_date"]
            existing_time = str(existing_near_term["effective_time"])[:5] if existing_near_term.get("effective_time") else "scheduled time"
            raise HTTPException(409, f"Patient already has an active near-term appointment on {existing_date.isoformat()} at {existing_time}")

        gate_row = (await db.execute(sql_text("""
            SELECT pending_lab_orders, specialist_pending_confirmation
              FROM patient_booking_constraints_v
             WHERE patient_id = :pid
        """), {"pid": str(body.patient_id)})).mappings().first()
        if gate_row:
            pending_lab = int(gate_row.get("pending_lab_orders") or 0)
            if pending_lab > 0:
                raise HTTPException(409, f"Cannot schedule near-term: {pending_lab} pending lab order(s). Nurse must mark lab order received first.")
            if bool(gate_row.get("specialist_pending_confirmation")):
                raise HTTPException(409, "Cannot schedule near-term: Specialist is assigned but not confirmed yet. Please Call & Confirm Specialist first.")
    existing = await _find_existing_active_appointment(db, str(body.patient_id), str(body.clinic_id), d)
    if existing:
        et = str(existing["effective_time"])[:5] if existing.get("effective_time") else "scheduled time"
        raise HTTPException(409, f"Patient already has an active appointment on {d.isoformat()} at {et}")
    row = (await db.execute(sql_text("""INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,
        reason,appointment_type,chief_complaints,source,status,workflow_status,contact_status,phone_number)
        VALUES(:p,:c,:d,:dt,:tm,:r,:at,CAST(:cc AS JSONB),:src,'scheduled','scheduled','pending_call',:ph) RETURNING id"""),
        {"p": str(body.patient_id), "c": str(body.clinic_id), "d": str(body.doctor_id) if body.doctor_id else None,
         "dt": d, "tm": t, "r": body.appointment_type, "at": body.appointment_type,
         "cc": json.dumps(body.chief_complaints),
         "src": "emergency" if body.emergency else "walkin",
         "ph": body.phone_number})).mappings().one()
    return {"appointment_id": str(row["id"]), "date": d.isoformat()}

# ══ PENDING BOOKING REQUESTS (from website/WhatsApp) ════════════
@router.get("/pending-requests")
async def hub_pending_requests(clinic_id: str = Query(...), db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text(
        "SELECT * FROM appointment_requests WHERE status='pending' AND (clinic_id=CAST(:c AS UUID) OR clinic_id IS NULL) ORDER BY created_at DESC LIMIT 50"
    ), {"c": clinic_id})).mappings().all()
    return [dict(r) for r in rows]

@router.post("/confirm-request/{request_id}")
async def hub_confirm_request(request_id: int, body: dict, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """
    Convert a public-site / WA-bot inbound appointment_request into an appointment row.
    Bundle X fix: 'online' violated appointments_source_check (allowed: whatsapp|walkin|followup|emergency|phone),
    requested_time is NOT NULL but body was passing NULL, and clinic_id NOT NULL but req.clinic_id could be NULL.
    """
    req = (await db.execute(sql_text("SELECT * FROM appointment_requests WHERE id=:id"), {"id": request_id})).mappings().first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.get("status") != "pending":
        raise HTTPException(409, f"Request already {req.get('status')}")

    # Date: body override → request preferred_date → today
    d = body.get("date") or (str(req["preferred_date"]) if req.get("preferred_date") else str(date_type.today()))
    if isinstance(d, str):
        d = date_type.fromisoformat(d)

    # Time: body override → request preferred_time (text → parse) → default 10:00
    t_raw = body.get("time") or req.get("preferred_time") or "10:00"
    # Normalise time string (accept "10:00", "10:00 AM", "10am" etc.)
    t = _parse_time_input(_normalize_time(t_raw), "10:00")

    # Clinic id: request → staff default → fail
    cid = req.get("clinic_id") or staff.get("clinic_id") if isinstance(staff, dict) else None
    if not cid and hasattr(staff, "clinic_id"): cid = staff.clinic_id
    if not cid:
        raise HTTPException(400, "Cannot confirm — no clinic_id on request and staff has no default clinic. Pick a clinic and try again.")
    cid = str(cid)

    # Source: map appointment_requests.source → appointments_source_check allowed values
    src_raw = (req.get("source") or "public_site").lower()
    if "whatsapp" in src_raw or "wa" in src_raw or "bot" in src_raw:
        src = "whatsapp"
    elif "walk" in src_raw:
        src = "walkin"
    elif "emerg" in src_raw:
        src = "emergency"
    elif "web" in src_raw or "site" in src_raw or "online" in src_raw:
        src = "public_site"
    else:
        src = "phone"

    # Patient lookup or create
    req_phone = _normalize_phone_digits(req["phone"])
    req_name = _normalize_name_key(req.get("patient_name"))
    existing = (await db.execute(sql_text("""
        SELECT id
          FROM patients
         WHERE RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) = :ph
           AND LOWER(TRIM(COALESCE(name, ''))) = :nm
         ORDER BY created_at DESC
         LIMIT 1
    """), {"ph": req_phone, "nm": req_name})).mappings().first()
    if existing:
        pid = str(existing["id"])
    else:
        new_pat = (await db.execute(sql_text(
            "INSERT INTO patients (name,phone,preferred_clinic_id,created_at) VALUES(:n,:p,CAST(:c AS UUID),NOW()) RETURNING id"
        ), {"n": req["patient_name"], "p": req["phone"], "c": cid})).mappings().one()
        pid = str(new_pat["id"])

    target_date = d
    if _is_near_term_bucket(target_date):
        existing_near_term = await _find_existing_active_near_term_appointment(db, pid, cid)
        if existing_near_term:
            existing_date = existing_near_term["effective_date"]
            existing_time = str(existing_near_term["effective_time"])[:5] if existing_near_term.get("effective_time") else "scheduled time"
            raise HTTPException(409, f"Patient already has an active near-term appointment on {existing_date.isoformat()} at {existing_time}")
    existing_apt = await _find_existing_active_appointment(db, pid, cid, target_date)
    if existing_apt:
        et = str(existing_apt["effective_time"])[:5] if existing_apt.get("effective_time") else "scheduled time"
        raise HTTPException(409, f"Patient already has an active appointment on {target_date.isoformat()} at {et}")

    staff_id = str(staff.id) if hasattr(staff, "id") else str(staff.get("staff_id")) if isinstance(staff, dict) else None

    # Create appointment with corrected fields (scheduled_* so hub schedule picks it up immediately)
    apt = (await db.execute(sql_text(
        """INSERT INTO appointments (
               patient_id, clinic_id,
               requested_date, requested_time, scheduled_date, scheduled_time,
               reason, appointment_type, source, status, workflow_status, contact_status, phone_number
           )
           VALUES (
               CAST(:p AS UUID), CAST(:c AS UUID),
               :d, :t, :d, :t,
               :r, :at, :src, 'scheduled', 'scheduled', 'pending_call', :ph
           ) RETURNING id"""
    ), {
        "p": pid, "c": cid, "d": d, "t": t,
        "r": req.get("service") or req.get("message") or "Consultation",
        "at": req.get("service") or "Consultation",
        "src": src, "ph": req["phone"],
    })).mappings().one()

    # Mark request as confirmed
    await db.execute(sql_text(
        "UPDATE appointment_requests SET status='confirmed', converted_to_appointment_id=CAST(:a AS UUID), handled_by=CAST(:s AS UUID) WHERE id=:id"
    ), {"a": str(apt["id"]), "s": staff_id, "id": request_id})

    # Audit log — explicit casts required or PostgreSQL aborts the whole transaction
    await db.execute(sql_text(
        """INSERT INTO appointment_history (appointment_id, action_type, new_value, changed_by_staff_id, notes)
           VALUES (
               CAST(:a AS UUID), 'converted_from_request',
               jsonb_build_object(
                   'request_id', CAST(:rid AS INTEGER),
                   'date', CAST(:d AS TEXT),
                   'time', CAST(:t AS TEXT),
                   'source', CAST(:src AS TEXT)
               ),
               CAST(:s AS UUID), :note
           )"""
    ), {
        "a": str(apt["id"]), "rid": request_id, "d": d.isoformat(), "t": str(t) if t else None, "src": src,
        "s": staff_id,
        "note": f"Converted from public_site/whatsapp request (#{request_id})",
    })

    return {"appointment_id": str(apt["id"]), "patient_id": pid, "date": d, "time": str(t) if t else None, "source": src}

@router.post("/reject-request/{request_id}")
async def hub_reject_request(request_id: int, body: dict = {}, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    req = (await db.execute(sql_text("SELECT status FROM appointment_requests WHERE id=:id"), {"id": request_id})).mappings().first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.get("status") != "pending":
        raise HTTPException(409, f"Request already {req.get('status')}")
    staff_id = str(staff.id) if hasattr(staff, "id") else str(staff.get("staff_id")) if isinstance(staff, dict) else None
    await db.execute(sql_text("UPDATE appointment_requests SET status='rejected', notes=:n, handled_by=CAST(:s AS UUID) WHERE id=:id"),
        {"n": body.get("reason", "Not available"), "s": staff_id, "id": request_id})
    return {"ok": True}

@router.post("/unschedule/{apt_id}")
async def hub_unschedule(apt_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Move appointment to unscheduled pool — clears date, sets status to pending."""
    res = await db.execute(sql_text(
        "UPDATE appointments SET requested_date=NULL, requested_time=NULL, confirmed_date=NULL, confirmed_time=NULL, scheduled_date=NULL, scheduled_time=NULL, workflow_status='pending', status='pending', contact_status='pending_call', updated_at=NOW() WHERE id=:id"
    ), {"id": str(apt_id)})
    if res.rowcount == 0: raise HTTPException(404, "Appointment not found")
    return {"ok": True}
