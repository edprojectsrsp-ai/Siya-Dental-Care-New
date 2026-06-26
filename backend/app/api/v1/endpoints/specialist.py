"""
Sprint A3 — Specialist Workflow.
Mount in main.py:
    from app.api.v1.endpoints.specialist import router as specialist_router
    app.include_router(specialist_router, prefix="/api")

Workflow:
  1. Senior doctor/receptionist assigns a specialist at booking
     → POST /specialist/appointments/{apt_id}/assign
  2. Specialist sees their queue (only their assigned patients)
     → GET /specialist/queue?specialist_id=...
  3. Patient arrives → nurse marks arrived (existing flow). Specialist gets notification log entry.
  4. Specialist starts/closes session — no payment data shown
     → POST /specialist/appointments/{apt_id}/close
  5. Senior doctor records earning for the case manually
     → POST /specialist/earnings  (specialist_id, appointment_id?, amount, notes)
  6. Admin/Senior settles periodically
     → POST /specialist/earnings/{id}/settle  (mode, ref, settled_amount)
"""
import json
from uuid import UUID
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.whatsapp_matrix import notify_specialist_assignment

router = APIRouter(prefix="/specialist", tags=["Specialist"])


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════
def _row(r) -> dict:
    out = dict(r) if r else {}
    for k, v in list(out.items()):
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif isinstance(v, UUID):
            out[k] = str(v)
    return out


def _require_role(staff, *roles):
    if not staff or staff.get("role") not in roles:
        raise HTTPException(403, f"Requires one of: {', '.join(roles)}")


# ════════════════════════════════════════════════════════════════════
# Schemas
# ════════════════════════════════════════════════════════════════════
class SpecialistIn(BaseModel):
    name: str
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    specialization: Optional[str] = None
    is_external: bool = True
    default_visit_fee: Optional[float] = None
    clinic_id: Optional[UUID] = None


class AssignIn(BaseModel):
    specialist_id: UUID
    notes: Optional[str] = None


class CloseSessionIn(BaseModel):
    notes: Optional[str] = None
    # Optional convenience: record the earning at the same time (senior doctor flow)
    record_earning_amount: Optional[float] = None
    record_earning_notes: Optional[str] = None


class EarningIn(BaseModel):
    specialist_id: UUID
    appointment_id: Optional[UUID] = None
    patient_id: Optional[UUID] = None
    amount: float
    earned_on: Optional[date] = None
    notes: Optional[str] = None


class SettleIn(BaseModel):
    settled_amount: float
    payment_mode: str                      # cash | upi | bank
    reference: Optional[str] = None
    notes: Optional[str] = None


# ════════════════════════════════════════════════════════════════════
# SPECIALISTS — list / create / update
# ════════════════════════════════════════════════════════════════════
@router.get("/list")
async def list_specialists(
    clinic_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """All staff whose role='specialist'."""
    where = ["role = 'specialist'", "is_active IS NOT FALSE"]
    params = {}
    if clinic_id:
        where.append("(clinic_id IS NULL OR clinic_id = :cid)")
        params["cid"] = str(clinic_id)
    rows = (await db.execute(sql_text(f"""
        SELECT id, name, phone, whatsapp_number, email, specialization, is_external,
               default_visit_fee, clinic_id
        FROM staff
        WHERE {' AND '.join(where)}
        ORDER BY name
    """), params)).mappings().all()
    return [_row(r) | {"default_visit_fee": float(r["default_visit_fee"] or 0) if r["default_visit_fee"] is not None else None}
            for r in rows]


@router.post("/list", status_code=201)
async def create_specialist(body: SpecialistIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    row = (await db.execute(sql_text("""
        INSERT INTO staff (name, phone, whatsapp_number, email, role, specialization,
                            is_external, default_visit_fee, clinic_id, is_active)
        VALUES (:n, :ph, :wa, :em, 'specialist', :sp, :ex, :fee, :cl, TRUE)
        RETURNING id
    """), {
        "n": body.name, "ph": body.phone, "wa": body.whatsapp_number, "em": body.email,
        "sp": body.specialization, "ex": body.is_external, "fee": body.default_visit_fee,
        "cl": str(body.clinic_id) if body.clinic_id else None,
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.patch("/list/{specialist_id}")
async def update_specialist(
    specialist_id: UUID, body: SpecialistIn,
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff),
):
    """Edit an existing specialist (Settings → Specialists tab)."""
    _require_role(staff, "doctor", "admin")
    row = (await db.execute(sql_text("""
        UPDATE staff
           SET name = :n, phone = :ph, whatsapp_number = :wa, email = :em,
               specialization = :sp, is_external = :ex, default_visit_fee = :fee
         WHERE id = :id AND role = 'specialist'
         RETURNING id
    """), {
        "id": str(specialist_id),
        "n": body.name, "ph": body.phone, "wa": body.whatsapp_number, "em": body.email,
        "sp": body.specialization, "ex": body.is_external, "fee": body.default_visit_fee,
    })).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Specialist not found")
    await db.commit()
    return {"id": str(row["id"])}


# ════════════════════════════════════════════════════════════════════
# ASSIGN / UNASSIGN
# ════════════════════════════════════════════════════════════════════
@router.post("/appointments/{apt_id}/assign")
async def assign_specialist(
    apt_id: UUID, body: AssignIn,
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff),
):
    """Senior doctor or reception assigns a specialist to this appointment."""
    _require_role(staff, "doctor", "admin", "receptionist")
    # Verify specialist exists
    sp = (await db.execute(sql_text(
        "SELECT id, name, phone, whatsapp_number FROM staff WHERE id=:sid AND role='specialist'"
    ), {"sid": str(body.specialist_id)})).mappings().one_or_none()
    if not sp:
        raise HTTPException(404, "Specialist not found or wrong role")
    # Update appointment
    note_suffix = f"\nAssigned: {body.notes.strip()}" if body.notes and body.notes.strip() else ""
    apt = (await db.execute(sql_text("""
        UPDATE appointments
           SET specialist_id = :sid,
               specialist_assigned_at = NOW(),
               specialist_assigned_by = :by,
               specialist_session_status = 'pending',
               specialist_confirmation_status = 'pending_call',
               specialist_notes = COALESCE(specialist_notes, '') || :note_suffix
         WHERE id = :id
         RETURNING patient_id, scheduled_date, scheduled_time
    """), {
        "id": str(apt_id), "sid": str(body.specialist_id),
        "by": staff.get("staff_id"), "note_suffix": note_suffix,
    })).mappings().one_or_none()
    if not apt:
        raise HTTPException(404, "Appointment not found")
    # Log notification (manual — frontend builds wa.me link)
    msg = f"You have been assigned a patient on {apt['scheduled_date']} at {apt['scheduled_time']}"
    await db.execute(sql_text("""
        INSERT INTO specialist_notifications (appointment_id, specialist_id, recipient_role,
                                              event_type, channel, message, sent_by)
        VALUES (:ap, :sp, 'specialist', 'assigned', 'manual', :msg, :by)
    """), {"ap": str(apt_id), "sp": str(body.specialist_id), "msg": msg, "by": staff.get("staff_id")})
    await db.commit()
    try:
        await notify_specialist_assignment(db, str(apt_id))
    except Exception:
        pass
    # Build a WhatsApp link the frontend can pop directly
    wa_to = (sp["whatsapp_number"] or sp["phone"] or "").replace("+", "").replace(" ", "")
    wa_link = None
    if wa_to:
        if len(wa_to) == 10:
            wa_to = "91" + wa_to
        import urllib.parse
        wa_link = f"https://wa.me/{wa_to}?text={urllib.parse.quote(msg)}"
    return {
        "ok": True,
        "specialist": _row(sp),
        "whatsapp_link": wa_link,
        "notification_message": msg,
    }


@router.delete("/appointments/{apt_id}/assign")
async def unassign_specialist(apt_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin", "receptionist")
    await db.execute(sql_text("""
        UPDATE appointments
           SET specialist_id = NULL, specialist_assigned_at = NULL, specialist_assigned_by = NULL,
               specialist_session_status = NULL
         WHERE id = :id
    """), {"id": str(apt_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# CALL & CONFIRM SPECIALIST — sets specialist_confirmation_status
# ════════════════════════════════════════════════════════════════════
class SpecialistCallIn(BaseModel):
    action: str          # "confirmed" | "declined" | "no_answer" | "call_back_later"
    notes: Optional[str] = None


@router.post("/appointments/{apt_id}/call-confirm-specialist")
async def specialist_call_confirm(
    apt_id: UUID, body: SpecialistCallIn,
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff),
):
    """Nurse/receptionist calls the specialist and records the outcome.
    'confirmed' → specialist is available and confirmed for this patient.
    All other actions are informational but do NOT block queue send.
    """
    apt = (await db.execute(sql_text("""
        SELECT a.specialist_id, a.patient_id, a.clinic_id,
               s.name AS specialist_name, s.phone AS specialist_phone,
               s.whatsapp_number AS specialist_wa, p.name AS patient_name
        FROM appointments a
        LEFT JOIN staff s ON s.id = a.specialist_id
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.id = :id
    """), {"id": str(apt_id)})).mappings().one_or_none()
    if not apt:
        raise HTTPException(404, "Appointment not found")
    if not apt["specialist_id"]:
        raise HTTPException(400, "No specialist assigned to this appointment")

    valid_actions = {"confirmed", "declined", "no_answer", "call_back_later"}
    if body.action not in valid_actions:
        raise HTTPException(400, f"action must be one of: {valid_actions}")

    await db.execute(sql_text("""
        UPDATE appointments
           SET specialist_confirmation_status = :status,
               specialist_call_confirmed = :is_confirmed,
               updated_at = NOW()
         WHERE id = :id
    """), {
        "id": str(apt_id),
        "status": body.action,
        "is_confirmed": body.action == "confirmed",
    })

    # Log notification
    note_text = f"[{body.action}]{': ' + body.notes.strip() if body.notes else ''}"
    await db.execute(sql_text("""
        INSERT INTO specialist_notifications (appointment_id, specialist_id, recipient_role,
                                              event_type, channel, message, sent_by)
        VALUES (:ap, :sp, 'specialist', 'call_confirm', 'manual', :msg, :by)
    """), {
        "ap": str(apt_id), "sp": str(apt["specialist_id"]),
        "msg": f"Specialist call outcome for {apt['patient_name']}: {note_text}",
        "by": staff.get("staff_id"),
    })
    await db.commit()

    # If confirmed, build a WhatsApp notification link for the specialist
    wa_link = None
    if body.action == "confirmed":
        wa_to = (apt["specialist_wa"] or apt["specialist_phone"] or "").replace("+", "").replace(" ", "")
        if wa_to:
            if len(wa_to) == 10:
                wa_to = "91" + wa_to
            import urllib.parse
            msg = f"Hi {apt['specialist_name']}, the appointment for patient {apt['patient_name']} is confirmed. Please be available. Thank you."
            wa_link = f"https://wa.me/{wa_to}?text={urllib.parse.quote(msg)}"

    return {
        "ok": True,
        "specialist_confirmation_status": body.action,
        "specialist_call_confirmed": body.action == "confirmed",
        "whatsapp_link": wa_link,
    }


# ════════════════════════════════════════════════════════════════════
# SPECIALIST'S QUEUE
# ════════════════════════════════════════════════════════════════════
@router.get("/queue")
async def specialist_queue(
    specialist_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Patients assigned to a specialist. If specialist_id omitted and the caller IS a specialist,
    uses their own id (so a specialist logging in only sees their own queue)."""
    sid = None
    if specialist_id:
        sid = str(specialist_id)
    elif staff and staff.get("role") == "specialist":
        sid = staff.get("staff_id")
    else:
        # Doctor/admin viewing without specialist_id — return empty unless one is selected
        return {"appointments": [], "today": [], "upcoming": [], "completed": []}
    if not sid:
        return {"appointments": [], "today": [], "upcoming": [], "completed": []}

    # Default range — today + next 7 days
    from datetime import datetime, timedelta
    today = date.today()
    if not date_from: date_from = today - timedelta(days=1)
    if not date_to: date_to = today + timedelta(days=14)

    rows = (await db.execute(sql_text("""
        SELECT a.id,
               COALESCE(a.scheduled_date, a.confirmed_date, a.requested_date) AS scheduled_date,
               COALESCE(a.scheduled_time, a.confirmed_time, a.requested_time) AS scheduled_time,
               a.workflow_status, a.specialist_session_status,
               a.specialist_confirmation_status, a.specialist_assigned_at, a.specialist_closed_at,
               a.specialist_notes, a.chief_complaints, a.reason,
               p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone,
               p.age AS patient_age, p.gender AS patient_gender,
               COALESCE(p.existing_illnesses, '[]'::jsonb) AS existing_illnesses
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.specialist_id = :sid
          AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled','rejected')
          AND (
                COALESCE(a.scheduled_date, a.confirmed_date, a.requested_date) BETWEEN :df AND :dt
                OR (a.scheduled_date IS NULL AND a.confirmed_date IS NULL AND a.requested_date IS NULL)
              )
        ORDER BY COALESCE(a.scheduled_date, a.confirmed_date, a.requested_date) NULLS LAST,
                 COALESCE(a.scheduled_time, a.confirmed_time, a.requested_time) NULLS LAST
    """), {"sid": sid, "df": date_from, "dt": date_to})).mappings().all()

    rs = [_row(r) for r in rows]
    today_str = today.isoformat()
    def is_closed(r): return r["specialist_session_status"] == "closed" or r["workflow_status"] in ("completed", "done")
    # Assigned = active cases the specialist still has to attend; Closed = done.
    assigned = [r for r in rs if not is_closed(r)]
    completed = [r for r in rs if is_closed(r)]
    today_items = [r for r in assigned if r["scheduled_date"] == today_str]
    upcoming = [r for r in assigned if r["scheduled_date"] and r["scheduled_date"] > today_str]

    return {
        "appointments": rs,
        "assigned": assigned,
        "today": today_items,
        "upcoming": upcoming,
        "completed": completed,
        "summary": {
            "total": len(rs),
            "assigned": len(assigned),
            "today": len(today_items),
            "upcoming": len(upcoming),
            "completed": len(completed),
        },
    }


# ════════════════════════════════════════════════════════════════════
# CLOSE SESSION
# ════════════════════════════════════════════════════════════════════
@router.post("/appointments/{apt_id}/close")
async def close_session(
    apt_id: UUID, body: CloseSessionIn,
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff),
):
    """Specialist closes their session for this appointment. Logs notification to senior doctor.
    If staff is a senior doctor and body.record_earning_amount is provided, also records the earning."""
    apt = (await db.execute(sql_text("""
        SELECT a.specialist_id, a.patient_id, a.clinic_id, a.specialist_session_status,
               s.name AS specialist_name, p.name AS patient_name
        FROM appointments a
        LEFT JOIN staff s ON s.id = a.specialist_id
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.id = :id
    """), {"id": str(apt_id)})).mappings().one_or_none()
    if not apt:
        raise HTTPException(404, "Appointment not found")
    if not apt["specialist_id"]:
        raise HTTPException(400, "No specialist assigned to this appointment")
    # Permission: either the assigned specialist themselves OR a senior doctor/admin
    caller_id = staff.get("staff_id")
    if (str(apt["specialist_id"]) != str(caller_id)) and staff.get("role") not in ("doctor", "admin"):
        raise HTTPException(403, "Only the assigned specialist or a senior doctor can close this session")

    note_suffix = f"\nClosed: {body.notes.strip()}" if body.notes and body.notes.strip() else ""
    await db.execute(sql_text("""
        UPDATE appointments
           SET specialist_session_status = 'closed',
               specialist_closed_at = NOW(),
               specialist_notes = COALESCE(specialist_notes, '') || :note_suffix
         WHERE id = :id
    """), {"id": str(apt_id), "note_suffix": note_suffix})

    # Log notification to senior doctor
    msg = f"Specialist {apt['specialist_name']} closed session for {apt['patient_name']}"
    await db.execute(sql_text("""
        INSERT INTO specialist_notifications (appointment_id, specialist_id, recipient_role,
                                              event_type, channel, message, sent_by)
        VALUES (:ap, :sp, 'senior_doctor', 'session_closed', 'in_app', :msg, :by)
    """), {"ap": str(apt_id), "sp": str(apt["specialist_id"]), "msg": msg, "by": caller_id})

    # Optional inline earning record (senior doctor convenience)
    earning_id = None
    if body.record_earning_amount and body.record_earning_amount > 0:
        if staff.get("role") not in ("doctor", "admin"):
            raise HTTPException(403, "Only doctor/admin can record earnings")
        row = (await db.execute(sql_text("""
            INSERT INTO specialist_earnings (specialist_id, appointment_id, patient_id, clinic_id,
                                              amount, notes, recorded_by)
            VALUES (:sp, :ap, :pa, :cl, :am, :nt, :rb)
            RETURNING id
        """), {
            "sp": str(apt["specialist_id"]), "ap": str(apt_id), "pa": str(apt["patient_id"]),
            "cl": str(apt["clinic_id"]), "am": body.record_earning_amount,
            "nt": body.record_earning_notes or body.notes, "rb": caller_id,
        })).mappings().one()
        earning_id = str(row["id"])

    await db.commit()
    return {"ok": True, "notification": msg, "earning_id": earning_id}


# ════════════════════════════════════════════════════════════════════
# EARNINGS LEDGER
# ════════════════════════════════════════════════════════════════════
@router.post("/earnings", status_code=201)
async def create_earning(body: EarningIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Senior doctor manually records: 'Dr Priya earned ₹500 for patient X'."""
    _require_role(staff, "doctor", "admin")
    # Resolve clinic_id from staff or from appointment
    cid = staff.get("clinic_id")
    if body.appointment_id:
        apt = (await db.execute(sql_text(
            "SELECT clinic_id, patient_id FROM appointments WHERE id=:a"
        ), {"a": str(body.appointment_id)})).mappings().one_or_none()
        if apt:
            cid = apt["clinic_id"]
            if not body.patient_id:
                body.patient_id = apt["patient_id"]
    if not cid:
        raise HTTPException(400, "clinic_id could not be resolved")
    row = (await db.execute(sql_text("""
        INSERT INTO specialist_earnings (specialist_id, appointment_id, patient_id, clinic_id,
                                          amount, earned_on, notes, recorded_by)
        VALUES (:sp, :ap, :pa, :cl, :am, COALESCE(:eo, CURRENT_DATE), :nt, :rb)
        RETURNING id
    """), {
        "sp": str(body.specialist_id),
        "ap": str(body.appointment_id) if body.appointment_id else None,
        "pa": str(body.patient_id) if body.patient_id else None,
        "cl": str(cid), "am": body.amount, "eo": body.earned_on,
        "nt": body.notes, "rb": staff.get("staff_id"),
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.get("/earnings")
async def list_earnings(
    specialist_id: Optional[UUID] = None,
    settled: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    clinic_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Earnings ledger. Specialists see only their own; doctor/admin see all."""
    where = []
    params = {}
    if staff and staff.get("role") == "specialist":
        where.append("se.specialist_id = :me")
        params["me"] = staff.get("staff_id")
    elif specialist_id:
        where.append("se.specialist_id = :sp")
        params["sp"] = str(specialist_id)
    if settled is not None:
        where.append("se.is_settled = :st")
        params["st"] = settled
    if date_from:
        where.append("se.earned_on >= :df")
        params["df"] = date_from
    if date_to:
        where.append("se.earned_on <= :dt")
        params["dt"] = date_to
    if clinic_id:
        where.append("se.clinic_id = :cl")
        params["cl"] = str(clinic_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    rows = (await db.execute(sql_text(f"""
        SELECT se.id, se.specialist_id, s.name AS specialist_name,
               se.appointment_id, se.patient_id, p.name AS patient_name,
               se.clinic_id, se.amount, se.earned_on, se.notes,
               se.is_settled, se.settled_on, se.settled_amount, se.settled_payment_mode,
               se.settled_reference, se.settled_notes, se.created_at
        FROM specialist_earnings se
        JOIN staff s ON s.id = se.specialist_id
        LEFT JOIN patients p ON p.id = se.patient_id
        {where_sql}
        ORDER BY se.earned_on DESC, se.created_at DESC
    """), params)).mappings().all()
    items = [_row(r) | {"amount": float(r["amount"] or 0),
                         "settled_amount": float(r["settled_amount"] or 0) if r["settled_amount"] is not None else None}
             for r in rows]
    # Summary
    outstanding = sum(it["amount"] for it in items if not it["is_settled"])
    settled = sum((it["settled_amount"] or it["amount"]) for it in items if it["is_settled"])
    return {
        "items": items,
        "summary": {
            "total_records": len(items),
            "outstanding_amount": outstanding,
            "settled_amount": settled,
        }
    }


@router.post("/earnings/{earning_id}/settle")
async def settle_earning(
    earning_id: UUID, body: SettleIn,
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff),
):
    """Mark an earning as settled (paid to specialist)."""
    _require_role(staff, "doctor", "admin")
    await db.execute(sql_text("""
        UPDATE specialist_earnings
           SET is_settled = TRUE,
               settled_on = COALESCE(settled_on, CURRENT_DATE),
               settled_amount = :am,
               settled_payment_mode = :pm,
               settled_reference = :ref,
               settled_notes = :nt,
               settled_by = :by,
               updated_at = NOW()
         WHERE id = :id
    """), {
        "id": str(earning_id), "am": body.settled_amount,
        "pm": body.payment_mode, "ref": body.reference,
        "nt": body.notes, "by": staff.get("staff_id"),
    })
    await db.commit()
    return {"ok": True}


@router.post("/earnings/settle-batch")
async def settle_batch(
    earning_ids: List[UUID], body: SettleIn,
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff),
):
    """Settle multiple earnings in one go (typical month-end)."""
    _require_role(staff, "doctor", "admin")
    if not earning_ids:
        return {"settled": 0}
    # Distribute the total settled_amount? No — body.settled_amount is the total payment, but we don't
    # split it across earnings; we mark each as settled with its OWN amount (which equals earning.amount
    # unless already overridden). Use settled_payment_mode/reference for all.
    await db.execute(sql_text("""
        UPDATE specialist_earnings
           SET is_settled = TRUE,
               settled_on = COALESCE(settled_on, CURRENT_DATE),
               settled_amount = COALESCE(settled_amount, amount),
               settled_payment_mode = :pm,
               settled_reference = :ref,
               settled_notes = :nt,
               settled_by = :by,
               updated_at = NOW()
         WHERE id = ANY(:ids)
    """), {
        "ids": [str(x) for x in earning_ids],
        "pm": body.payment_mode, "ref": body.reference,
        "nt": body.notes, "by": staff.get("staff_id"),
    })
    await db.commit()
    return {"settled": len(earning_ids)}


# ════════════════════════════════════════════════════════════════════
# OUTSTANDING (per-specialist summary)
# ════════════════════════════════════════════════════════════════════
@router.get("/outstanding")
async def outstanding_summary(
    clinic_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Quick dashboard view: per-specialist unsettled total."""
    where = []
    params = {}
    if clinic_id:
        where.append("clinic_id = :cl")
        params["cl"] = str(clinic_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    rows = (await db.execute(sql_text(f"""
        SELECT specialist_id, specialist_name, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid) AS clinic_id,
               cases_outstanding, amount_outstanding, oldest_earning
        FROM v_specialist_outstanding
        {where_sql}
        ORDER BY amount_outstanding DESC
    """), params)).mappings().all()
    return [_row(r) | {"amount_outstanding": float(r["amount_outstanding"] or 0)} for r in rows]
