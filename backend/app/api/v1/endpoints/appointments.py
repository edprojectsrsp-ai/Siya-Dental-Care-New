from datetime import date, datetime, timezone, timedelta
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, text as sql_text
from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import Appointment, Patient, Prescription
from app.schemas.schemas import AppointmentCreate, WalkinCreate, AppointmentStatusUpdate, AppointmentConfirm, AppointmentOut
from app.services.whatsapp_matrix import notify_appointment_confirmation, notify_appointment_cancelled

router = APIRouter(prefix="/appointments", tags=["Appointments"])

def _to_out(a, p=None):
    d = {c.key: getattr(a, c.key) for c in Appointment.__table__.columns}
    if p: d.update(patient_name=p.name, patient_phone=p.phone, patient_age=p.age)
    # ensure the new phone field is always present even if null
    if "phone_number" not in d:
        d["phone_number"] = getattr(a, "phone_number", None)
    return d

@router.get("/today", response_model=list[AppointmentOut])
async def today_queue(clinic_id: UUID = Query(...), db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    today = date.today()
    rows = (await db.execute(
        select(Appointment, Patient).join(Patient, Appointment.patient_id == Patient.id)
        .where(Appointment.clinic_id == clinic_id, or_(Appointment.confirmed_date == today, Appointment.requested_date == today), Appointment.status.notin_(["rejected","cancelled"]))
        .order_by(func.array_position(func.string_to_array("in_progress,arrived,confirmed,pending,done,no_show","," ), Appointment.status), func.coalesce(Appointment.confirmed_time, Appointment.requested_time))
    )).all()
    return [AppointmentOut(**_to_out(a, p)) for a, p in rows]

@router.get("/pending", response_model=list[AppointmentOut])
async def pending(clinic_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    q = select(Appointment, Patient).join(Patient).where(Appointment.status == "pending").order_by(Appointment.created_at.desc())
    if clinic_id: q = q.where(Appointment.clinic_id == clinic_id)
    return [AppointmentOut(**_to_out(a, p)) for a, p in (await db.execute(q)).all()]

@router.get("/followups/due")
async def followups_due(clinic_id: UUID = Query(...), days: int = Query(30), db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Patients whose prescription follow-up date has passed and they haven't returned."""
    today = date.today()
    cutoff = today - timedelta(days=days)
    rows = (await db.execute(
        select(Prescription, Patient)
        .join(Patient, Prescription.patient_id == Patient.id)
        .where(
            Prescription.clinic_id == clinic_id,
            Prescription.followup_date != None,
            Prescription.followup_date <= today,
            Prescription.followup_date >= cutoff,
        )
        .order_by(Prescription.followup_date.asc())
    )).all()
    results = []
    for rx, p in rows:
        latest_apt = (await db.execute(
            select(Appointment).where(
                Appointment.patient_id == p.id,
                Appointment.clinic_id == clinic_id,
                Appointment.status.in_(["confirmed", "arrived", "in_progress", "done"]),
                func.coalesce(Appointment.confirmed_date, Appointment.requested_date) >= rx.followup_date,
            ).order_by(Appointment.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        results.append({
            "prescription_id": str(rx.id),
            "patient_id": str(p.id),
            "patient_name": p.name,
            "patient_phone": p.phone,
            "patient_age": p.age,
            "followup_date": str(rx.followup_date),
            "days_overdue": (today - rx.followup_date).days,
            "complaint": rx.complaint or "",
            "diagnosis": rx.diagnosis or "",
            "visible_advice": rx.visible_advice or "",
            "has_returned": latest_apt is not None,
            "return_status": latest_apt.status if latest_apt else None,
        })
    return results

@router.get("")
async def list_range(
    clinic_id: UUID = Query(...),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    start = from_date or date.today()
    end = to_date or start
    rows = (await db.execute(sql_text("""
        SELECT
            a.id,
            a.patient_id,
            a.clinic_id,
            COALESCE(a.confirmed_date, a.requested_date) AS confirmed_date,
            COALESCE(a.confirmed_time, a.requested_time) AS confirmed_time,
            a.requested_date,
            a.requested_time,
            a.reason,
            a.appointment_type,
            a.status,
            COALESCE(a.workflow_status, a.status) AS workflow_status,
            a.specialist_id,
            a.chief_complaints,
            p.name AS patient_name,
            p.phone AS patient_phone,
            p.age AS patient_age,
            p.gender AS patient_gender
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.clinic_id = :cid
          AND COALESCE(a.confirmed_date, a.requested_date) BETWEEN :fd AND :td
        ORDER BY COALESCE(a.confirmed_date, a.requested_date), COALESCE(a.confirmed_time, a.requested_time)
    """), {"cid": str(clinic_id), "fd": start, "td": end})).mappings().all()
    return {
        "appointments": [{
            "id": str(r["id"]),
            "patient_id": str(r["patient_id"]),
            "clinic_id": str(r["clinic_id"]),
            "confirmed_date": r["confirmed_date"].isoformat() if r["confirmed_date"] else None,
            "confirmed_time": str(r["confirmed_time"])[:5] if r["confirmed_time"] else None,
            "requested_date": r["requested_date"].isoformat() if r["requested_date"] else None,
            "requested_time": str(r["requested_time"])[:5] if r["requested_time"] else None,
            "scheduled_date": r["confirmed_date"].isoformat() if r["confirmed_date"] else None,
            "scheduled_time": str(r["confirmed_time"])[:5] if r["confirmed_time"] else None,
            "reason": r["reason"],
            "appointment_type": r["appointment_type"],
            "status": r["status"],
            "workflow_status": r["workflow_status"],
            "specialist_id": str(r["specialist_id"]) if r["specialist_id"] else None,
            "chief_complaints": r["chief_complaints"] or [],
            "patient_name": r["patient_name"],
            "patient_phone": r["patient_phone"],
            "patient_age": r["patient_age"],
            "patient_gender": r["patient_gender"],
        } for r in rows]
    }

@router.get("/{aid}", response_model=AppointmentOut)
async def get_one(aid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    row = (await db.execute(select(Appointment, Patient).join(Patient).where(Appointment.id == aid))).first()
    if not row: raise HTTPException(404)
    return AppointmentOut(**_to_out(row[0], row[1]))

@router.post("/", response_model=AppointmentOut, status_code=201)
async def create(req: AppointmentCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = (await db.execute(select(Patient).where(Patient.id == req.patient_id))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Patient not found")
    data = req.model_dump()
    a = Appointment(**data)
    # Backfill modern workflow/hub fields so legacy-created appointments (e.g. "new appointment" from ClinicHub)
    # are visible and correctly categorized in AppointmentHub / DoctorQueue / hub queries.
    if not a.workflow_status:
        a.workflow_status = "scheduled"
    if not a.chief_complaints:
        a.chief_complaints = []
    if not a.contact_status:
        a.contact_status = "pending_call"
    if not a.appointment_type:
        a.appointment_type = data.get("reason") or "Consultation"
    if data.get("phone_number"):
        a.phone_number = data.get("phone_number")
    db.add(a); await db.flush(); await db.refresh(a)
    return AppointmentOut(**_to_out(a, p))

@router.post("/walkin", response_model=AppointmentOut, status_code=201)
async def walkin(req: WalkinCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = (await db.execute(select(Patient).where(Patient.phone == req.patient_phone))).scalar_one_or_none()
    if not p:
        p = Patient(name=req.patient_name, phone=req.patient_phone, age=req.patient_age, preferred_clinic_id=req.clinic_id)
        db.add(p); await db.flush(); await db.refresh(p)
    now = datetime.now(timezone.utc)
    a = Appointment(patient_id=p.id, clinic_id=req.clinic_id, requested_date=now.date(), requested_time=now.time(), confirmed_date=now.date(), confirmed_time=now.time(), source=req.source, reason=req.reason, status="arrived", arrived_at=now, phone_number=req.patient_phone)
    # modern fields for consistency with hub
    a.workflow_status = "arrived"
    a.chief_complaints = []
    a.contact_status = "pending_call"
    a.appointment_type = req.reason or "Walk-in"
    db.add(a); await db.flush(); await db.refresh(a)
    return AppointmentOut(**_to_out(a, p))

@router.patch("/{aid}/confirm", response_model=AppointmentOut)
async def confirm(aid: UUID, req: AppointmentConfirm, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    a = (await db.execute(select(Appointment).where(Appointment.id == aid))).scalar_one_or_none()
    if not a: raise HTTPException(404)
    if a.status != "pending": raise HTTPException(400, f"Cannot confirm from {a.status}")
    a.status = "confirmed"; a.confirmed_date = req.confirmed_date; a.confirmed_time = req.confirmed_time; a.staff_notes = req.staff_notes; a.updated_at = datetime.now(timezone.utc)
    await db.flush()
    try:
        await notify_appointment_confirmation(db, str(a.id))
    except Exception:
        pass
    p = (await db.execute(select(Patient).where(Patient.id == a.patient_id))).scalar_one_or_none()
    return AppointmentOut(**_to_out(a, p))

@router.patch("/{aid}/status", response_model=AppointmentOut)
async def update_status(aid: UUID, req: AppointmentStatusUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    a = (await db.execute(select(Appointment).where(Appointment.id == aid))).scalar_one_or_none()
    if not a: raise HTTPException(404)
    now = datetime.now(timezone.utc)
    valid = {"confirmed": ["arrived","no_show","cancelled"], "arrived": ["in_progress","no_show","cancelled"], "in_progress": ["done","cancelled"], "rescheduled": ["confirmed","cancelled"], "pending": ["confirmed","rejected","cancelled"]}
    if req.status not in valid.get(a.status, []):
        raise HTTPException(400, f"Cannot go from {a.status} to {req.status}")
    a.status = req.status; a.staff_notes = req.staff_notes or a.staff_notes; a.updated_at = now
    if req.status == "arrived": a.arrived_at = now
    elif req.status == "in_progress": a.started_at = now
    elif req.status == "done":
        a.completed_at = now
        p = (await db.execute(select(Patient).where(Patient.id == a.patient_id))).scalar_one_or_none()
        if p: p.total_visits = (p.total_visits or 0) + 1
    await db.flush()
    if req.status == "cancelled":
        try:
            await notify_appointment_cancelled(db, str(a.id))
        except Exception:
            pass
    p = (await db.execute(select(Patient).where(Patient.id == a.patient_id))).scalar_one_or_none()
    return AppointmentOut(**_to_out(a, p))

@router.patch("/{aid}/reject")
async def reject(aid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    a = (await db.execute(select(Appointment).where(Appointment.id == aid))).scalar_one_or_none()
    if not a: raise HTTPException(404)
    a.status = "rejected"; a.updated_at = datetime.now(timezone.utc); await db.flush()
    return {"status": "rejected"}
