"""Treatment Plans — Multi-sitting lifecycle, cost calculator, payment tracking"""
from datetime import date, datetime, timezone
from uuid import UUID
from typing import Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import TreatmentPlan, TreatmentPlanItem, TreatmentSitting, PaymentTransaction, Patient
from app.schemas.schemas import TreatmentPlanCreate, TreatmentPlanUpdate, SittingCreate, TreatmentPlanOut

router = APIRouter(prefix="/treatment-plans", tags=["Treatment Plans"])

def _recalc(plan):
    """Recalculate financials from items and payments."""
    est = sum(float(it.estimated_cost or 0) for it in plan.items)
    plan.estimated_cost = est
    plan.final_payable = est + float(plan.extra_charges or 0) - float(plan.discount or 0)
    total_paid = sum(float(p.amount or 0) for p in plan.payments)
    plan.total_paid = total_paid
    plan.balance = plan.final_payable - total_paid
    plan.sittings_completed = sum(1 for s in plan.sittings if s.status == "completed")

def _plan_out(plan):
    _recalc(plan)
    return {
        "id": plan.id, "patient_id": plan.patient_id, "clinic_id": plan.clinic_id, "name": plan.name,
        "complaint": plan.complaint, "diagnosis": plan.diagnosis,
        "estimated_cost": float(plan.estimated_cost or 0), "extra_charges": float(plan.extra_charges or 0),
        "discount": float(plan.discount or 0), "final_payable": float(plan.final_payable or 0),
        "total_paid": float(plan.total_paid or 0), "balance": float(plan.balance or 0),
        "total_sittings_planned": plan.total_sittings_planned, "sittings_completed": plan.sittings_completed,
        "status": plan.status, "followup_date": plan.followup_date, "followup_notes": plan.followup_notes,
        "internal_notes": plan.internal_notes, "created_at": plan.created_at,
        "items": [{"id": str(it.id), "procedure_name": it.procedure_name, "tooth_number": it.tooth_number,
                   "estimated_cost": float(it.estimated_cost or 0), "actual_cost": float(it.actual_cost or 0) if it.actual_cost else None,
                   "status": it.status, "notes": it.notes} for it in plan.items],
        "sittings": [{"id": str(s.id), "sitting_number": s.sitting_number, "date": str(s.date) if s.date else None,
                      "procedures_done": s.procedures_done, "notes": s.notes, "status": s.status,
                      "amount_collected": float(s.amount_collected or 0), "payment_mode": s.payment_mode} for s in sorted(plan.sittings, key=lambda x: x.sitting_number)],
        "payments": [{"id": str(p.id), "amount": float(p.amount), "payment_mode": p.payment_mode,
                      "remarks": p.remarks, "date": str(p.date)} for p in plan.payments],
    }

async def _load_plan(plan_id, db):
    result = await db.execute(select(TreatmentPlan).where(TreatmentPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan: raise HTTPException(404, "Treatment plan not found")
    await db.refresh(plan, ["items", "sittings", "payments"])
    return plan

@router.post("/", status_code=201)
async def create_plan(req: TreatmentPlanCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    plan = TreatmentPlan(
        patient_id=req.patient_id, clinic_id=req.clinic_id, doctor_id=req.doctor_id or staff["staff_id"],
        name=req.name, complaint=req.complaint, diagnosis=req.diagnosis,
        total_sittings_planned=req.total_sittings_planned, discount=req.discount, extra_charges=req.extra_charges,
        status="new"
    )
    db.add(plan); await db.flush(); await db.refresh(plan)
    for item in req.items:
        pi = TreatmentPlanItem(plan_id=plan.id, procedure_catalog_id=item.procedure_catalog_id,
                               procedure_name=item.procedure_name, tooth_number=item.tooth_number,
                               estimated_cost=item.estimated_cost)
        db.add(pi)
    # Create planned sittings
    for i in range(1, req.total_sittings_planned + 1):
        db.add(TreatmentSitting(plan_id=plan.id, sitting_number=i, status="planned"))
    await db.flush()
    plan = await _load_plan(plan.id, db)
    return _plan_out(plan)

@router.get("/{plan_id}")
async def get_plan(plan_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    plan = await _load_plan(plan_id, db)
    return _plan_out(plan)

@router.get("/patient/{patient_id}")
async def patient_plans(patient_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    result = await db.execute(select(TreatmentPlan).where(TreatmentPlan.patient_id == patient_id).order_by(TreatmentPlan.created_at.desc()))
    plans = result.scalars().all()
    out = []
    for plan in plans:
        await db.refresh(plan, ["items", "sittings", "payments"])
        out.append(_plan_out(plan))
    return out

@router.get("/active/list")
async def active_plans(clinic_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    q = select(TreatmentPlan).where(TreatmentPlan.status.notin_(["closed", "cancelled"])).order_by(TreatmentPlan.updated_at.desc())
    if clinic_id: q = q.where(TreatmentPlan.clinic_id == clinic_id)
    result = await db.execute(q)
    plans = result.scalars().all()
    out = []
    for plan in plans:
        await db.refresh(plan, ["items", "sittings", "payments"])
        p = (await db.execute(select(Patient).where(Patient.id == plan.patient_id))).scalar_one_or_none()
        d = _plan_out(plan)
        d["patient_name"] = p.name if p else None
        d["patient_phone"] = p.phone if p else None
        out.append(d)
    return out

@router.patch("/{plan_id}")
async def update_plan(plan_id: UUID, req: TreatmentPlanUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    plan = await _load_plan(plan_id, db)
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    plan.updated_at = datetime.now(timezone.utc)
    _recalc(plan)
    await db.flush()
    return _plan_out(plan)

@router.post("/{plan_id}/items")
async def add_item(plan_id: UUID, procedure_name: str, tooth_number: str = None, estimated_cost: float = 0, procedure_catalog_id: str = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    plan = await _load_plan(plan_id, db)
    item = TreatmentPlanItem(plan_id=plan_id, procedure_name=procedure_name, tooth_number=tooth_number, estimated_cost=estimated_cost, procedure_catalog_id=procedure_catalog_id)
    db.add(item); await db.flush()
    plan = await _load_plan(plan_id, db)
    return _plan_out(plan)

@router.delete("/{plan_id}/items/{item_id}")
async def remove_item(plan_id: UUID, item_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    item = (await db.execute(select(TreatmentPlanItem).where(TreatmentPlanItem.id == item_id, TreatmentPlanItem.plan_id == plan_id))).scalar_one_or_none()
    if not item: raise HTTPException(404)
    await db.delete(item); await db.flush()
    plan = await _load_plan(plan_id, db)
    return _plan_out(plan)

@router.post("/{plan_id}/sittings")
async def record_sitting(plan_id: UUID, req: SittingCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    plan = await _load_plan(plan_id, db)
    # Find or create sitting
    existing = [s for s in plan.sittings if s.sitting_number == req.sitting_number]
    if existing:
        s = existing[0]
        s.date = req.date or date.today(); s.procedures_done = req.procedures_done; s.notes = req.notes
        s.status = "completed"; s.amount_collected = req.amount_collected; s.payment_mode = req.payment_mode
    else:
        s = TreatmentSitting(plan_id=plan_id, sitting_number=req.sitting_number, date=req.date or date.today(),
                             procedures_done=req.procedures_done, notes=req.notes, status="completed",
                             amount_collected=req.amount_collected, payment_mode=req.payment_mode)
        db.add(s)
    # Record payment if amount > 0
    if req.amount_collected and req.amount_collected > 0:
        pay = PaymentTransaction(patient_id=plan.patient_id, plan_id=plan_id, clinic_id=plan.clinic_id,
                                 amount=req.amount_collected, payment_mode=req.payment_mode or "cash",
                                 remarks=f"Sitting {req.sitting_number}", date=req.date or date.today())
        db.add(pay)
    if plan.status in ("new", "consultation_done", "treatment_advised"):
        plan.status = "treatment_started"
    elif plan.status == "treatment_started":
        plan.status = "in_progress"
    plan.updated_at = datetime.now(timezone.utc)
    await db.flush()
    plan = await _load_plan(plan_id, db)
    return _plan_out(plan)

@router.patch("/{plan_id}/close")
async def close_plan(plan_id: UUID, approve_pending: bool = False, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    plan = await _load_plan(plan_id, db)
    _recalc(plan)
    if plan.balance > 0 and not approve_pending:
        raise HTTPException(400, f"Balance ₹{plan.balance} pending. Set approve_pending=true to close with balance.")
    plan.status = "closed"; plan.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return _plan_out(plan)
