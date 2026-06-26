from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import Patient, PatientHealth, Appointment, TreatmentPlan, TreatmentPlanItem, Prescription, PaymentTransaction
from app.schemas.schemas import PatientCreate, PatientUpdate, PatientOut, HealthHistoryUpdate, HealthHistoryOut

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/search", response_model=list[PatientOut])
async def search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    result = await db.execute(select(Patient).where(or_(Patient.name.ilike(f"%{q}%"), Patient.phone.like(f"%{q}%"))).order_by(Patient.name).limit(30))
    return [PatientOut.model_validate(p) for p in result.scalars().all()]

@router.get("/phone/{phone}")
async def by_phone(phone: str, db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Patient).where(Patient.phone == phone))).scalar_one_or_none()
    if not p: return {"found": False}
    return {"found": True, "patient_id": str(p.id), "name": p.name, "phone": p.phone, "age": p.age}

@router.get("/{pid}", response_model=PatientOut)
async def get_patient(pid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = (await db.execute(select(Patient).where(Patient.id == pid))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Not found")
    return PatientOut.model_validate(p)

@router.post("/", response_model=PatientOut, status_code=201)
async def create(req: PatientCreate, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(Patient).where(Patient.phone == req.phone))).scalar_one_or_none()
    if existing: raise HTTPException(409, "Phone already exists")
    p = Patient(**req.model_dump())
    db.add(p); await db.flush(); await db.refresh(p)
    return PatientOut.model_validate(p)

@router.patch("/{pid}", response_model=PatientOut)
async def update(pid: UUID, req: PatientUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = (await db.execute(select(Patient).where(Patient.id == pid))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Not found")
    for k, v in req.model_dump(exclude_unset=True).items(): setattr(p, k, v)
    p.updated_at = datetime.now(timezone.utc)
    await db.flush(); await db.refresh(p)
    return PatientOut.model_validate(p)

@router.get("/{pid}/health")
async def get_health(pid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    h = (await db.execute(select(PatientHealth).where(PatientHealth.patient_id == pid))).scalar_one_or_none()
    if not h: return {"patient_id": str(pid), "alerts": [], "exists": False}
    alerts = []
    if h.diabetes: alerts.append({"icon": "🔴", "text": "Diabetic — healing may be slower"})
    if h.hypertension: alerts.append({"icon": "🟠", "text": "High BP — monitor during procedure"})
    if h.heart_disease: alerts.append({"icon": "❤️", "text": "Heart disease — cardiac precaution"})
    if h.blood_thinner: alerts.append({"icon": "💉", "text": "On blood thinners — bleeding risk"})
    if h.pregnant: alerts.append({"icon": "🤰", "text": "Pregnant — avoid X-ray, limit meds"})
    if h.allergies and h.allergies.strip(): alerts.append({"icon": "⚠️", "text": f"Allergy: {h.allergies}"})
    if h.smoking or h.tobacco: alerts.append({"icon": "🚬", "text": "Smoker/tobacco — healing affected"})
    if h.asthma: alerts.append({"icon": "🫁", "text": "Asthma — precaution with sedation"})
    data = {c.key: getattr(h, c.key) for c in PatientHealth.__table__.columns if c.key not in ("id",)}
    data["alerts"] = alerts; data["exists"] = True
    return data

@router.post("/{pid}/health")
async def save_health(pid: UUID, req: HealthHistoryUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    h = (await db.execute(select(PatientHealth).where(PatientHealth.patient_id == pid))).scalar_one_or_none()
    if h:
        for k, v in req.model_dump().items(): setattr(h, k, v)
        h.updated_at = datetime.now(timezone.utc)
    else:
        h = PatientHealth(patient_id=pid, **req.model_dump())
        db.add(h)
    await db.flush()
    return {"status": "saved"}

@router.get("/{pid}/history")
async def history(pid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = (await db.execute(select(Patient).where(Patient.id == pid))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Not found")
    apts = (await db.execute(select(Appointment).where(Appointment.patient_id == pid).order_by(Appointment.created_at.desc()))).scalars().all()
    plans = (await db.execute(select(TreatmentPlan).where(TreatmentPlan.patient_id == pid).order_by(TreatmentPlan.created_at.desc()))).scalars().all()
    rxs = (await db.execute(select(Prescription).where(Prescription.patient_id == pid).order_by(Prescription.created_at.desc()))).scalars().all()
    pays = (await db.execute(select(PaymentTransaction).where(PaymentTransaction.patient_id == pid).order_by(PaymentTransaction.created_at.desc()))).scalars().all()
    total_charged = sum(float(pl.final_payable or 0) for pl in plans)
    total_paid = sum(float(pay.amount or 0) for pay in pays)
    return {
        "patient": {"id": str(p.id), "name": p.name, "phone": p.phone, "age": p.age, "gender": p.gender, "total_visits": p.total_visits or 0},
        "summary": {"total_plans": len(plans), "active_plans": sum(1 for pl in plans if pl.status not in ("closed","cancelled")), "total_charged": total_charged, "total_paid": total_paid, "balance": total_charged - total_paid},
        "appointments": [{"id": str(a.id), "date": str(a.confirmed_date or a.requested_date), "time": str(a.confirmed_time or a.requested_time), "reason": a.reason, "status": a.status, "source": a.source} for a in apts[:20]],
        "treatment_plans": [{"id": str(pl.id), "name": pl.name, "status": pl.status, "estimated_cost": float(pl.estimated_cost or 0), "final_payable": float(pl.final_payable or 0), "total_paid": float(pl.total_paid or 0), "balance": float(pl.balance or 0)} for pl in plans],
        "prescriptions": [{"id": str(rx.id), "diagnosis": rx.diagnosis, "medicines": rx.medicines, "date": str(rx.created_at)} for rx in rxs[:10]],
        "payments": [{"id": str(pay.id), "amount": float(pay.amount), "mode": pay.payment_mode, "remarks": pay.remarks, "date": str(pay.date)} for pay in pays[:20]],
    }
