"""
backend/app/api/v1/endpoints/diary.py
Sprint 9: Nurse's Appointment Diary + Call Tracking

Endpoints:
- GET  /api/diary/today              → Today's appointments with call status
- GET  /api/diary/date/{date}        → Specific date
- GET  /api/diary/week               → 7-day view
- POST /api/diary/{apt_id}/log-call  → Record call attempt + update status
- POST /api/diary/{apt_id}/log-message → Log manual WhatsApp/SMS send
- POST /api/diary/{apt_id}/reschedule → Quick reschedule
- POST /api/diary/{apt_id}/cancel    → Cancel with reason
- GET  /api/diary/{apt_id}/history   → Full call+message history
- GET  /api/diary/whatsapp-template/{apt_id} → Pre-filled WhatsApp message
"""

from datetime import datetime, timezone, date as date_type, timedelta
from typing import Optional, List
from uuid import UUID
from urllib.parse import quote

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff

router = APIRouter(prefix="/diary", tags=["Diary & Call Tracking"])


# ───────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ───────────────────────────────────────────────────────────────────────────
class CallLogIn(BaseModel):
    call_status: str  # confirmed/no_answer/will_call_later/reschedule_requested/declined/busy
    notes: Optional[str] = None
    callback_scheduled_for: Optional[datetime] = None

class MessageLogIn(BaseModel):
    channel: str  # whatsapp/sms/email
    template_used: Optional[str] = None
    message_body: Optional[str] = None

class RescheduleIn(BaseModel):
    new_scheduled_date: date_type
    new_scheduled_time: Optional[str] = None  # "HH:MM"
    reason: Optional[str] = None

class CancelIn(BaseModel):
    cancel_reason: str


# ───────────────────────────────────────────────────────────────────────────
# Status color mapping (frontend uses these)
# ───────────────────────────────────────────────────────────────────────────
STATUS_COLORS = {
    "not_contacted": "gray",
    "confirmed": "green",
    "will_call_later": "blue",
    "no_answer": "yellow",
    "reschedule_requested": "orange",
    "declined": "red",
    "busy": "yellow",
    "cancelled": "black",
    "rescheduled": "purple",
}


# ───────────────────────────────────────────────────────────────────────────
# DIARY VIEWS
# ───────────────────────────────────────────────────────────────────────────
@router.get("/today")
async def diary_today(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get today's appointments with contact status + last call info"""
    return await _get_appointments_for_date(db, clinic_id, date_type.today())


@router.get("/date/{the_date}")
async def diary_date(
    the_date: date_type,
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get appointments for any specific date"""
    return await _get_appointments_for_date(db, clinic_id, the_date)


@router.get("/week")
async def diary_week(
    clinic_id: UUID,
    start_date: Optional[date_type] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get 7-day appointments grouped by date"""
    if start_date is None:
        start_date = date_type.today()
    end_date = start_date + timedelta(days=7)
    rows = (await db.execute(sql_text("""
        SELECT a.id, a.patient_id, a.scheduled_date, a.scheduled_time,
               a.duration_minutes, a.status, a.contact_status, a.reason,
               a.last_contacted_at, a.last_contacted_by,
               p.name AS patient_name, p.phone AS patient_phone, p.age,
               s.name AS doctor_name
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN staff s ON s.id = a.doctor_id
        WHERE a.clinic_id = :cid
          AND a.scheduled_date BETWEEN :start AND :end
        ORDER BY a.scheduled_date, a.scheduled_time
    """), {"cid": str(clinic_id), "start": start_date, "end": end_date})).mappings().all()

    by_date: dict = {}
    for r in rows:
        d = r["scheduled_date"].isoformat()
        by_date.setdefault(d, []).append({
            "id": str(r["id"]),
            "patient_id": str(r["patient_id"]),
            "patient_name": r["patient_name"],
            "patient_phone": r["patient_phone"],
            "patient_age": r["age"],
            "doctor_name": r["doctor_name"],
            "scheduled_time": str(r["scheduled_time"]) if r["scheduled_time"] else None,
            "duration_minutes": r["duration_minutes"],
            "status": r["status"],
            "contact_status": r["contact_status"] or "not_contacted",
            "contact_color": STATUS_COLORS.get(r["contact_status"] or "not_contacted", "gray"),
            "reason": r["reason"],
            "last_contacted_at": r["last_contacted_at"].isoformat() if r["last_contacted_at"] else None,
        })
    return by_date


async def _get_appointments_for_date(db: AsyncSession, clinic_id: UUID, the_date: date_type):
    """Helper: fetch appointments + last call info for given date"""
    rows = (await db.execute(sql_text("""
        SELECT a.id, a.patient_id, a.scheduled_date, a.scheduled_time,
               a.duration_minutes, a.status, a.contact_status, a.reason,
               a.last_contacted_at, a.last_contacted_by, a.reschedule_reason,
               p.name AS patient_name, p.phone AS patient_phone, p.age, p.gender,
               s.name AS doctor_name,
               (SELECT COUNT(*) FROM appointment_call_logs WHERE appointment_id = a.id) AS call_count,
               (SELECT COUNT(*) FROM appointment_message_logs WHERE appointment_id = a.id) AS message_count,
               (SELECT call_status FROM appointment_call_logs WHERE appointment_id = a.id
                ORDER BY call_time DESC LIMIT 1) AS last_call_status,
               (SELECT notes FROM appointment_call_logs WHERE appointment_id = a.id
                ORDER BY call_time DESC LIMIT 1) AS last_call_notes
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN staff s ON s.id = a.doctor_id
        WHERE a.clinic_id = :cid AND a.scheduled_date = :d
        ORDER BY a.scheduled_time NULLS LAST, a.created_at
    """), {"cid": str(clinic_id), "d": the_date})).mappings().all()

    return [{
        "id": str(r["id"]),
        "patient_id": str(r["patient_id"]),
        "patient_name": r["patient_name"],
        "patient_phone": r["patient_phone"],
        "patient_age": r["age"],
        "patient_gender": r["gender"],
        "doctor_name": r["doctor_name"],
        "scheduled_date": r["scheduled_date"].isoformat(),
        "scheduled_time": str(r["scheduled_time"]) if r["scheduled_time"] else None,
        "duration_minutes": r["duration_minutes"],
        "status": r["status"],
        "contact_status": r["contact_status"] or "not_contacted",
        "contact_color": STATUS_COLORS.get(r["contact_status"] or "not_contacted", "gray"),
        "reason": r["reason"],
        "last_contacted_at": r["last_contacted_at"].isoformat() if r["last_contacted_at"] else None,
        "reschedule_reason": r["reschedule_reason"],
        "call_count": r["call_count"],
        "message_count": r["message_count"],
        "last_call_status": r["last_call_status"],
        "last_call_notes": r["last_call_notes"],
    } for r in rows]


# ───────────────────────────────────────────────────────────────────────────
# CALL LOG
# ───────────────────────────────────────────────────────────────────────────
@router.post("/{apt_id}/log-call", status_code=201)
async def log_call(
    apt_id: UUID,
    body: CallLogIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Record a call attempt and update appointment's contact_status"""
    valid_statuses = {
        "confirmed", "no_answer", "will_call_later",
        "reschedule_requested", "declined", "busy"
    }
    if body.call_status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")

    # Insert call log
    await db.execute(sql_text("""
        INSERT INTO appointment_call_logs
        (appointment_id, called_by_staff_id, call_status, notes, callback_scheduled_for)
        VALUES (:apt, :staff, :status, :notes, :cb)
    """), {
        "apt": str(apt_id),
        "staff": str(staff["staff_id"]) if staff else None,
        "status": body.call_status,
        "notes": body.notes,
        "cb": body.callback_scheduled_for,
    })

    # Update appointment's contact status
    await db.execute(sql_text("""
        UPDATE appointments
        SET contact_status = :status,
            last_contacted_at = NOW(),
            last_contacted_by = :staff,
            updated_at = NOW()
        WHERE id = :apt
    """), {"status": body.call_status, "staff": str(staff["staff_id"]) if staff else None, "apt": str(apt_id)})

    # If confirmed, auto-update appointment status too
    if body.call_status == "confirmed":
        await db.execute(sql_text("""
            UPDATE appointments SET status = 'confirmed', updated_at = NOW()
            WHERE id = :apt AND status NOT IN ('done','cancelled')
        """), {"apt": str(apt_id)})

    await db.flush()
    return {
        "status": "logged",
        "appointment_id": str(apt_id),
        "call_status": body.call_status,
        "color": STATUS_COLORS.get(body.call_status, "gray"),
    }


@router.post("/{apt_id}/log-message", status_code=201)
async def log_message(
    apt_id: UUID,
    body: MessageLogIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Log that a WhatsApp/SMS was MANUALLY sent (button click)"""
    # Get patient_id
    pat_row = (await db.execute(sql_text(
        "SELECT patient_id FROM appointments WHERE id = :apt"
    ), {"apt": str(apt_id)})).mappings().one_or_none()
    if not pat_row:
        raise HTTPException(404, "Appointment not found")

    await db.execute(sql_text("""
        INSERT INTO appointment_message_logs
        (appointment_id, patient_id, sent_by_staff_id, channel, template_used,
         message_body, delivery_status)
        VALUES (:apt, :pat, :staff, :ch, :tpl, :body, 'manually_sent')
    """), {
        "apt": str(apt_id),
        "pat": str(pat_row["patient_id"]),
        "staff": str(staff["staff_id"]) if staff else None,
        "ch": body.channel,
        "tpl": body.template_used,
        "body": body.message_body,
    })
    await db.flush()
    return {"status": "logged", "channel": body.channel}


# ───────────────────────────────────────────────────────────────────────────
# RESCHEDULE / CANCEL
# ───────────────────────────────────────────────────────────────────────────
@router.post("/{apt_id}/reschedule")
async def reschedule(
    apt_id: UUID,
    body: RescheduleIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Reschedule appointment to new date/time"""
    await db.execute(sql_text("""
        UPDATE appointments SET
            scheduled_date = :d,
            scheduled_time = COALESCE(CAST(:t AS TIME), scheduled_time),
            reschedule_reason = :reason,
            contact_status = 'rescheduled',
            status = 'rescheduled',
            updated_at = NOW()
        WHERE id = :apt
    """), {
        "d": body.new_scheduled_date,
        "t": body.new_scheduled_time,
        "reason": body.reason,
        "apt": str(apt_id),
    })
    await db.flush()
    return {"status": "rescheduled", "new_date": body.new_scheduled_date.isoformat()}


@router.post("/{apt_id}/cancel")
async def cancel(
    apt_id: UUID,
    body: CancelIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Cancel appointment with reason"""
    await db.execute(sql_text("""
        UPDATE appointments SET
            status = 'cancelled',
            contact_status = 'cancelled',
            cancel_reason = :reason,
            updated_at = NOW()
        WHERE id = :apt
    """), {"reason": body.cancel_reason, "apt": str(apt_id)})
    await db.flush()
    return {"status": "cancelled", "appointment_id": str(apt_id)}


# ───────────────────────────────────────────────────────────────────────────
# HISTORY
# ───────────────────────────────────────────────────────────────────────────
@router.get("/{apt_id}/history")
async def get_history(
    apt_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get all calls + messages for this appointment"""
    calls = (await db.execute(sql_text("""
        SELECT cl.id, cl.call_status, cl.call_time, cl.notes, cl.callback_scheduled_for,
               s.name AS called_by_name
        FROM appointment_call_logs cl
        LEFT JOIN staff s ON s.id = cl.called_by_staff_id
        WHERE cl.appointment_id = :apt
        ORDER BY cl.call_time DESC
    """), {"apt": str(apt_id)})).mappings().all()

    messages = (await db.execute(sql_text("""
        SELECT ml.id, ml.channel, ml.template_used, ml.message_body, ml.sent_at,
               ml.delivery_status, ml.patient_reply,
               s.name AS sent_by_name
        FROM appointment_message_logs ml
        LEFT JOIN staff s ON s.id = ml.sent_by_staff_id
        WHERE ml.appointment_id = :apt
        ORDER BY ml.sent_at DESC
    """), {"apt": str(apt_id)})).mappings().all()

    return {
        "calls": [{
            "id": str(c["id"]),
            "call_status": c["call_status"],
            "call_time": c["call_time"].isoformat() if c["call_time"] else None,
            "notes": c["notes"],
            "callback_scheduled_for": c["callback_scheduled_for"].isoformat() if c["callback_scheduled_for"] else None,
            "called_by_name": c["called_by_name"],
        } for c in calls],
        "messages": [{
            "id": str(m["id"]),
            "channel": m["channel"],
            "template_used": m["template_used"],
            "message_body": m["message_body"],
            "sent_at": m["sent_at"].isoformat() if m["sent_at"] else None,
            "delivery_status": m["delivery_status"],
            "sent_by_name": m["sent_by_name"],
        } for m in messages],
    }


# ───────────────────────────────────────────────────────────────────────────
# WHATSAPP/SMS TEMPLATE GENERATOR (returns pre-filled wa.me/sms: URLs)
# ───────────────────────────────────────────────────────────────────────────
@router.get("/{apt_id}/whatsapp-template")
async def get_whatsapp_url(
    apt_id: UUID,
    template: str = Query("confirmation", regex="^(confirmation|reminder|reschedule|missed|generic)$"),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Returns ready-to-open wa.me/ URL with pre-filled message"""
    row = (await db.execute(sql_text("""
        SELECT a.scheduled_date, a.scheduled_time, a.reason,
               p.name AS patient_name,
               COALESCE(p.alternate_whatsapp_number, p.phone) AS patient_phone,
               c.name AS clinic_name, c.phone AS clinic_phone, c.address
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        JOIN clinics c ON c.id = a.clinic_id
        WHERE a.id = :apt
    """), {"apt": str(apt_id)})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Appointment not found")

    pname = row["patient_name"] or "Patient"
    cname = row["clinic_name"] or "Siya Dental Care"
    cphone = row["clinic_phone"] or ""
    date_str = row["scheduled_date"].strftime("%d %b %Y") if row["scheduled_date"] else ""
    time_str = str(row["scheduled_time"])[:5] if row["scheduled_time"] else ""
    reason = row["reason"] or "consultation"

    templates = {
        "confirmation": (
            f"Hi {pname}, your appointment at {cname} is confirmed for "
            f"{date_str} at {time_str} for {reason}. "
            f"Please arrive 10 minutes early. Reply YES to confirm or call {cphone}. - {cname}"
        ),
        "reminder": (
            f"Hi {pname}, this is a reminder for your appointment tomorrow at "
            f"{cname} on {date_str} at {time_str}. "
            f"Please confirm by replying YES. Call {cphone} for any change. - {cname}"
        ),
        "reschedule": (
            f"Hi {pname}, we need to reschedule your appointment originally set for "
            f"{date_str} at {time_str}. Please reply with your preferred date/time. - {cname}"
        ),
        "missed": (
            f"Hi {pname}, we noticed you missed your appointment at {cname} on "
            f"{date_str} at {time_str}. We'd love to reschedule. Please reply or call {cphone}. - {cname}"
        ),
        "generic": (
            f"Hi {pname}, this is {cname}. Please call us at {cphone} regarding your appointment. - {cname}"
        ),
    }
    message = templates[template]

    # Build wa.me URL with phone number (strip non-digits)
    phone_digits = "".join(c for c in (row["patient_phone"] or "") if c.isdigit())
    if not phone_digits.startswith("91") and len(phone_digits) == 10:
        phone_digits = "91" + phone_digits

    whatsapp_url = f"https://wa.me/{phone_digits}?text={quote(message)}"
    sms_url = f"sms:+{phone_digits}?body={quote(message)}"

    return {
        "patient_name": pname,
        "patient_phone": row["patient_phone"],
        "template": template,
        "message": message,
        "whatsapp_url": whatsapp_url,
        "sms_url": sms_url,
    }


# ───────────────────────────────────────────────────────────────────────────
# BULK CALL QUEUE (for "Call Menu" view)
# ───────────────────────────────────────────────────────────────────────────
@router.get("/call-queue/{which}")
async def call_queue(
    which: str,  # tomorrow / today / pending
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get list of appointments needing calls"""
    if which == "tomorrow":
        target_date = date_type.today() + timedelta(days=1)
    elif which == "today":
        target_date = date_type.today()
    else:  # pending = all "not_contacted" or "no_answer" / "busy"
        target_date = None

    if target_date:
        rows = (await db.execute(sql_text("""
            SELECT a.id, a.scheduled_date, a.scheduled_time, a.reason,
                   a.contact_status, a.last_contacted_at,
                   p.name AS patient_name, p.phone AS patient_phone
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            WHERE a.clinic_id = :cid AND a.scheduled_date = :d
              AND a.status NOT IN ('done','cancelled')
            ORDER BY 
                CASE a.contact_status 
                    WHEN 'not_contacted' THEN 1
                    WHEN 'no_answer' THEN 2
                    WHEN 'busy' THEN 3
                    WHEN 'will_call_later' THEN 4
                    ELSE 5
                END,
                a.scheduled_time
        """), {"cid": str(clinic_id), "d": target_date})).mappings().all()
    else:
        rows = (await db.execute(sql_text("""
            SELECT a.id, a.scheduled_date, a.scheduled_time, a.reason,
                   a.contact_status, a.last_contacted_at,
                   p.name AS patient_name, p.phone AS patient_phone
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            WHERE a.clinic_id = :cid
              AND a.contact_status IN ('not_contacted','no_answer','busy','will_call_later')
              AND a.scheduled_date >= CURRENT_DATE
              AND a.status NOT IN ('done','cancelled')
            ORDER BY a.scheduled_date, a.scheduled_time
        """), {"cid": str(clinic_id)})).mappings().all()

    return [{
        "id": str(r["id"]),
        "scheduled_date": r["scheduled_date"].isoformat(),
        "scheduled_time": str(r["scheduled_time"])[:5] if r["scheduled_time"] else None,
        "reason": r["reason"],
        "patient_name": r["patient_name"],
        "patient_phone": r["patient_phone"],
        "contact_status": r["contact_status"] or "not_contacted",
        "contact_color": STATUS_COLORS.get(r["contact_status"] or "not_contacted", "gray"),
    } for r in rows]
