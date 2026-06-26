"""
backend/app/api/v1/endpoints/walkins.py
Sprint 10: "To Be Appointed" list + Walk-in Management

Endpoints:
- GET    /api/tba/list                     → All TBA patients
- POST   /api/tba/add                      → Add patient to TBA
- POST   /api/tba/{id}/schedule            → Convert TBA → appointment
- POST   /api/tba/{id}/resolve             → Mark resolved
- DELETE /api/tba/{id}                     → Remove from TBA
- POST   /api/walkin/register              → Quick walk-in registration
- POST   /api/walkin/{id}/outcome          → Record outcome
- GET    /api/walkin/today                 → Today's walk-ins
- GET    /api/patients/no-treatment-pending → New patients to clean up
- POST   /api/patients/{id}/keep           → Flag to keep (no auto-delete)
- POST   /api/patients/cleanup-expired     → Trigger cleanup of expired records
"""

from datetime import datetime, timezone, date as date_type, timedelta
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff

tba_router = APIRouter(prefix="/tba", tags=["To Be Appointed"])
walkin_router = APIRouter(prefix="/walkin", tags=["Walk-in Patients"])
cleanup_router = APIRouter(prefix="/patients", tags=["Patient Cleanup"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════
class TBAAddIn(BaseModel):
    patient_id: UUID
    clinic_id: UUID
    original_appointment_id: Optional[UUID] = None
    reason: Optional[str] = None
    proposed_service: Optional[str] = None
    followup_scheduled_for: Optional[datetime] = None
    notes: Optional[str] = None

class TBAScheduleIn(BaseModel):
    scheduled_date: date_type
    scheduled_time: Optional[str] = None
    doctor_id: UUID
    duration_minutes: int = 30
    reason: Optional[str] = None

class WalkInRegisterIn(BaseModel):
    clinic_id: UUID
    patient_id: Optional[UUID] = None  # if existing patient
    # if new patient:
    new_patient_name: Optional[str] = None
    new_patient_phone: Optional[str] = None
    new_patient_age: Optional[int] = None
    new_patient_gender: Optional[str] = None
    # visit details
    visit_reason: str
    doctor_id: Optional[UUID] = None
    notes: Optional[str] = None

class WalkInOutcomeIn(BaseModel):
    outcome: str  # seen_by_doctor / left_no_treatment / rescheduled / moved_to_tba / cancelled
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# TO BE APPOINTED (TBA)
# ═══════════════════════════════════════════════════════════════════════════
@tba_router.get("/list")
async def tba_list(
    clinic_id: UUID,
    include_resolved: bool = False,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get all TBA patients (unresolved by default)"""
    sql = """
        SELECT tba.id, tba.patient_id, tba.reason, tba.proposed_service,
               tba.added_at, tba.followup_scheduled_for, tba.last_followup_at,
               tba.is_resolved, tba.notes, tba.original_appointment_id,
               p.name AS patient_name, p.phone AS patient_phone, p.age,
               s.name AS added_by_name,
               EXTRACT(DAY FROM NOW() - tba.added_at)::INT AS days_pending
        FROM to_be_appointed tba
        JOIN patients p ON p.id = tba.patient_id
        LEFT JOIN staff s ON s.id = tba.added_by_staff_id
        WHERE tba.clinic_id = :cid
    """
    params = {"cid": str(clinic_id)}
    if not include_resolved:
        sql += " AND tba.is_resolved = FALSE"
    sql += " ORDER BY tba.added_at DESC"

    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return [{
        "id": str(r["id"]),
        "patient_id": str(r["patient_id"]),
        "patient_name": r["patient_name"],
        "patient_phone": r["patient_phone"],
        "patient_age": r["age"],
        "reason": r["reason"],
        "proposed_service": r["proposed_service"],
        "added_at": r["added_at"].isoformat() if r["added_at"] else None,
        "followup_scheduled_for": r["followup_scheduled_for"].isoformat() if r["followup_scheduled_for"] else None,
        "last_followup_at": r["last_followup_at"].isoformat() if r["last_followup_at"] else None,
        "is_resolved": r["is_resolved"],
        "notes": r["notes"],
        "added_by_name": r["added_by_name"],
        "days_pending": r["days_pending"],
        "urgent": (r["days_pending"] or 0) > 7,
    } for r in rows]


@tba_router.post("/add", status_code=201)
async def tba_add(
    body: TBAAddIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Add patient to TBA list"""
    row = (await db.execute(sql_text("""
        INSERT INTO to_be_appointed
        (patient_id, clinic_id, original_appointment_id, reason, proposed_service,
         added_by_staff_id, followup_scheduled_for, notes)
        VALUES (:pid, :cid, :apt, :reason, :svc, :staff, :fup, :notes)
        RETURNING id, added_at
    """), {
        "pid": str(body.patient_id),
        "cid": str(body.clinic_id),
        "apt": str(body.original_appointment_id) if body.original_appointment_id else None,
        "reason": body.reason,
        "svc": body.proposed_service,
        "staff": str(staff["staff_id"]) if staff else None,
        "fup": body.followup_scheduled_for,
        "notes": body.notes,
    })).mappings().one()
    await db.flush()
    return {"id": str(row["id"]), "added_at": row["added_at"].isoformat()}


@tba_router.post("/{tba_id}/schedule", status_code=201)
async def tba_schedule(
    tba_id: UUID,
    body: TBAScheduleIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Create appointment from TBA entry and mark resolved"""
    # Get TBA entry
    tba = (await db.execute(sql_text(
        "SELECT patient_id, clinic_id FROM to_be_appointed WHERE id = :id"
    ), {"id": str(tba_id)})).mappings().one_or_none()
    if not tba:
        raise HTTPException(404, "TBA entry not found")

    # Create appointment
    pphone = (await db.execute(sql_text("SELECT phone FROM patients WHERE id=:pid"), {"pid": str(tba["patient_id"])})).mappings().one_or_none()
    apt = (await db.execute(sql_text("""
        INSERT INTO appointments
        (patient_id, clinic_id, doctor_id, scheduled_date, scheduled_time,
         duration_minutes, reason, status, contact_status, phone_number, created_at)
        VALUES (:pid, :cid, :did, :d, CAST(:t AS TIME), :dur, :reason, 'booked', 'not_contacted', :ph, NOW())
        RETURNING id
    """), {
        "pid": str(tba["patient_id"]),
        "cid": str(tba["clinic_id"]),
        "did": str(body.doctor_id),
        "d": body.scheduled_date,
        "t": body.scheduled_time,
        "dur": body.duration_minutes,
        "reason": body.reason or "Follow-up from TBA",
        "ph": pphone["phone"] if pphone else None,
    })).mappings().one()

    # Mark TBA resolved
    await db.execute(sql_text("""
        UPDATE to_be_appointed
        SET is_resolved = TRUE,
            resolved_at = NOW(),
            resolved_appointment_id = :apt
        WHERE id = :id
    """), {"apt": str(apt["id"]), "id": str(tba_id)})

    await db.flush()
    return {"appointment_id": str(apt["id"]), "tba_resolved": True}


@tba_router.post("/{tba_id}/resolve")
async def tba_resolve(
    tba_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Manually mark TBA as resolved (no appointment created)"""
    await db.execute(sql_text("""
        UPDATE to_be_appointed SET is_resolved = TRUE, resolved_at = NOW()
        WHERE id = :id
    """), {"id": str(tba_id)})
    await db.flush()
    return {"resolved": True}


@tba_router.delete("/{tba_id}")
async def tba_delete(
    tba_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Remove from TBA list entirely"""
    await db.execute(sql_text("DELETE FROM to_be_appointed WHERE id = :id"), {"id": str(tba_id)})
    await db.flush()
    return {"deleted": True}


# ═══════════════════════════════════════════════════════════════════════════
# WALK-IN MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════
@walkin_router.post("/register", status_code=201)
async def walkin_register(
    body: WalkInRegisterIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Quick-register walk-in patient + auto-notify doctor"""
    patient_id = body.patient_id
    is_new_patient = False

    # If new patient, create patient record first
    if not patient_id:
        if not body.new_patient_name or not body.new_patient_phone:
            raise HTTPException(400, "Either patient_id or new_patient_name+phone required")

        # Auto-set deletion date for new patient (2 days)
        auto_delete = datetime.now(timezone.utc) + timedelta(days=2)

        new_pat = (await db.execute(sql_text("""
            INSERT INTO patients
            (name, phone, age, gender, preferred_clinic_id, total_visits,
             is_new_no_treatment, auto_delete_at, created_at)
            VALUES (:n, :p, :a, :g, :c, 0, TRUE, :ad, NOW())
            RETURNING id
        """), {
            "n": body.new_patient_name,
            "p": body.new_patient_phone,
            "a": body.new_patient_age,
            "g": body.new_patient_gender,
            "c": str(body.clinic_id),
            "ad": auto_delete,
        })).mappings().one()
        patient_id = new_pat["id"]
        is_new_patient = True

    # Create walk-in record
    walkin = (await db.execute(sql_text("""
        INSERT INTO walk_in_patients
        (patient_id, clinic_id, registered_by_staff_id, visit_reason, doctor_id, notes)
        VALUES (:pid, :cid, :staff, :reason, :did, :notes)
        RETURNING id, registered_at
    """), {
        "pid": str(patient_id),
        "cid": str(body.clinic_id),
        "staff": str(staff["staff_id"]) if staff else None,
        "reason": body.visit_reason,
        "did": str(body.doctor_id) if body.doctor_id else None,
        "notes": body.notes,
    })).mappings().one()

    # Get patient + clinic info for notification
    pat = (await db.execute(sql_text("""
        SELECT p.name AS pname, p.phone, p.age, p.gender, p.total_visits,
               c.name AS cname
        FROM patients p, clinics c
        WHERE p.id = :pid AND c.id = :cid
    """), {"pid": str(patient_id), "cid": str(body.clinic_id)})).mappings().one()

    visit_count = pat["total_visits"] or 0
    patient_tag = "NEW PATIENT" if is_new_patient else f"Returning ({visit_count} visits)"

    # Auto-create notification for doctor(s)
    title = f"🚪 Walk-in: {pat['pname']}"
    msg = (f"{patient_tag} arrived at {pat['cname']}. "
           f"Reason: {body.visit_reason}. "
           f"Phone: {pat['phone']}")

    await db.execute(sql_text("""
        INSERT INTO clinic_notifications
        (clinic_id, notification_type, recipient_staff_id, recipient_role,
         sender_staff_id, title, message, data, priority,
         related_patient_id)
        VALUES (:cid, 'walk_in_arrived', :did, 'doctor',
                :sender, :title, :msg, CAST(:data AS JSONB), 'high', :pid)
    """), {
        "cid": str(body.clinic_id),
        "did": str(body.doctor_id) if body.doctor_id else None,
        "sender": str(staff["staff_id"]) if staff else None,
        "title": title,
        "msg": msg,
        "data": '{"walkin_id":"' + str(walkin["id"]) + '","visit_reason":"' + body.visit_reason.replace('"', '\\"') + '"}',
        "pid": str(patient_id),
    })

    # Mark walk-in as notified
    await db.execute(sql_text("""
        UPDATE walk_in_patients SET doctor_notified = TRUE, doctor_notified_at = NOW()
        WHERE id = :id
    """), {"id": str(walkin["id"])})

    await db.flush()

    return {
        "walkin_id": str(walkin["id"]),
        "patient_id": str(patient_id),
        "is_new_patient": is_new_patient,
        "patient_name": pat["pname"],
        "registered_at": walkin["registered_at"].isoformat(),
        "doctor_notified": True,
    }


@walkin_router.post("/{walkin_id}/outcome")
async def walkin_outcome(
    walkin_id: UUID,
    body: WalkInOutcomeIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Record what happened with the walk-in patient"""
    valid_outcomes = {
        "seen_by_doctor", "left_no_treatment", "rescheduled",
        "moved_to_tba", "cancelled"
    }
    if body.outcome not in valid_outcomes:
        raise HTTPException(400, f"Invalid outcome. Must be one of: {valid_outcomes}")

    # Get patient id from walkin
    w = (await db.execute(sql_text(
        "SELECT patient_id, clinic_id FROM walk_in_patients WHERE id = :id"
    ), {"id": str(walkin_id)})).mappings().one_or_none()
    if not w:
        raise HTTPException(404, "Walk-in not found")

    # Update walk-in record
    await db.execute(sql_text("""
        UPDATE walk_in_patients SET
            outcome = :out, outcome_recorded_at = NOW(),
            notes = COALESCE(notes || ' | ', '') || COALESCE(:notes, '')
        WHERE id = :id
    """), {"out": body.outcome, "notes": body.notes or "", "id": str(walkin_id)})

    # If "seen_by_doctor", clear the auto_delete flag on patient
    if body.outcome == "seen_by_doctor":
        await db.execute(sql_text("""
            UPDATE patients SET
                is_new_no_treatment = FALSE,
                auto_delete_at = NULL,
                total_visits = COALESCE(total_visits, 0) + 1
            WHERE id = :pid
        """), {"pid": str(w["patient_id"])})

    # If "moved_to_tba", auto-add to TBA list
    if body.outcome == "moved_to_tba":
        await db.execute(sql_text("""
            INSERT INTO to_be_appointed
            (patient_id, clinic_id, reason, added_by_staff_id, notes)
            VALUES (:pid, :cid, :reason, :staff, :notes)
        """), {
            "pid": str(w["patient_id"]),
            "cid": str(w["clinic_id"]),
            "reason": "Moved from walk-in",
            "staff": str(staff["staff_id"]) if staff else None,
            "notes": body.notes,
        })

    await db.flush()
    return {"outcome": body.outcome, "walkin_id": str(walkin_id)}


@walkin_router.get("/today")
async def walkins_today(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get today's walk-in patients"""
    rows = (await db.execute(sql_text("""
        SELECT w.id, w.patient_id, w.registered_at, w.visit_reason,
               w.outcome, w.outcome_recorded_at, w.doctor_notified,
               p.name AS patient_name, p.phone, p.age, p.gender, p.total_visits,
               p.is_new_no_treatment,
               s.name AS registered_by_name,
               d.name AS doctor_name
        FROM walk_in_patients w
        JOIN patients p ON p.id = w.patient_id
        LEFT JOIN staff s ON s.id = w.registered_by_staff_id
        LEFT JOIN staff d ON d.id = w.doctor_id
        WHERE w.clinic_id = :cid
          AND DATE(w.registered_at) = CURRENT_DATE
        ORDER BY w.registered_at DESC
    """), {"cid": str(clinic_id)})).mappings().all()

    return [{
        "id": str(r["id"]),
        "patient_id": str(r["patient_id"]),
        "patient_name": r["patient_name"],
        "patient_phone": r["phone"],
        "patient_age": r["age"],
        "patient_gender": r["gender"],
        "total_visits": r["total_visits"],
        "is_new_no_treatment": r["is_new_no_treatment"],
        "visit_reason": r["visit_reason"],
        "registered_at": r["registered_at"].isoformat() if r["registered_at"] else None,
        "registered_by_name": r["registered_by_name"],
        "doctor_name": r["doctor_name"],
        "doctor_notified": r["doctor_notified"],
        "outcome": r["outcome"],
        "outcome_recorded_at": r["outcome_recorded_at"].isoformat() if r["outcome_recorded_at"] else None,
    } for r in rows]


# ═══════════════════════════════════════════════════════════════════════════
# AUTO-CLEANUP for "New Patient - No Treatment Done"
# ═══════════════════════════════════════════════════════════════════════════
@cleanup_router.get("/no-treatment-pending")
async def no_treatment_pending(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """List patients flagged for auto-deletion (new patients with no treatment)"""
    rows = (await db.execute(sql_text("""
        SELECT id, name, phone, age, created_at, auto_delete_at,
               manually_flagged_to_keep,
               EXTRACT(EPOCH FROM (auto_delete_at - NOW()))/3600 AS hours_until_delete
        FROM patients
        WHERE preferred_clinic_id = :cid
          AND is_new_no_treatment = TRUE
          AND auto_delete_at IS NOT NULL
        ORDER BY auto_delete_at ASC
    """), {"cid": str(clinic_id)})).mappings().all()

    return [{
        "id": str(r["id"]),
        "name": r["name"],
        "phone": r["phone"],
        "age": r["age"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "auto_delete_at": r["auto_delete_at"].isoformat() if r["auto_delete_at"] else None,
        "hours_until_delete": round(float(r["hours_until_delete"] or 0), 1),
        "manually_flagged_to_keep": r["manually_flagged_to_keep"],
        "urgent": (r["hours_until_delete"] or 999) < 12,
    } for r in rows]


@cleanup_router.post("/{patient_id}/keep")
async def keep_patient(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Manually flag patient to keep (skip auto-delete)"""
    await db.execute(sql_text("""
        UPDATE patients SET
            manually_flagged_to_keep = TRUE,
            auto_delete_at = NULL,
            is_new_no_treatment = FALSE
        WHERE id = :id
    """), {"id": str(patient_id)})
    await db.flush()
    return {"kept": True, "patient_id": str(patient_id)}


@cleanup_router.post("/cleanup-expired")
async def cleanup_expired(
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Trigger cleanup of expired new patients (those past auto_delete_at).
       Call this from a cron job or manually."""
    # Soft-delete: mark inactive instead of hard delete (safer)
    deleted = (await db.execute(sql_text("""
        UPDATE patients SET
            is_active = FALSE,
            updated_at = NOW()
        WHERE is_new_no_treatment = TRUE
          AND auto_delete_at < NOW()
          AND manually_flagged_to_keep = FALSE
          AND COALESCE(is_active, TRUE) = TRUE
        RETURNING id, name
    """))).mappings().all()
    await db.flush()
    return {
        "deleted_count": len(deleted),
        "deleted_patients": [{"id": str(r["id"]), "name": r["name"]} for r in deleted],
    }
