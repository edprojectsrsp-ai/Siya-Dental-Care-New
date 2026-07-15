"""Payment collection + revenue reports"""
from datetime import date, datetime, timezone
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import PaymentTransaction, TreatmentPlan, Patient
from app.schemas.schemas import PaymentCollect, PaymentCollectMulti, PaymentOut

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/collect", response_model=PaymentOut, status_code=201)
async def collect(req: PaymentCollect, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    if req.amount is None or req.amount <= 0:
        raise HTTPException(400, "Payment amount must be greater than zero")
    if req.payment_mode not in {"cash", "upi", "card", "razorpay", "bank_transfer", "other"}:
        raise HTTPException(400, f"Unsupported payment_mode: {req.payment_mode}")
    pay = PaymentTransaction(patient_id=req.patient_id, plan_id=req.plan_id, appointment_id=req.appointment_id,
                              clinic_id=req.clinic_id, amount=req.amount, payment_mode=req.payment_mode,
                              remarks=req.remarks, date=req.date or date.today())
    db.add(pay); await db.flush(); await db.refresh(pay)
    # Update plan totals if linked
    if req.plan_id:
        plan = (await db.execute(select(TreatmentPlan).where(TreatmentPlan.id == req.plan_id))).scalar_one_or_none()
        if plan:
            await db.refresh(plan, ["payments"])
            plan.total_paid = sum(float(p.amount or 0) for p in plan.payments)
            plan.balance = float(plan.final_payable or 0) - plan.total_paid
            plan.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return PaymentOut.model_validate(pay)


# ─────────────────────────────────────────────────────────────────────────────
# Bundle X — Multi-mode payment (restored from pre-Bundle-T regression)
# Records one payment_transactions row per split. Returns array.
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/collect-multi", status_code=201)
async def collect_multi(req: PaymentCollectMulti, db: AsyncSession = Depends(get_db),
                         staff=Depends(get_current_staff)):
    if not req.splits:
        raise HTTPException(400, "At least one payment split required")

    # Validate amounts
    for s in req.splits:
        if s.amount is None or s.amount <= 0:
            raise HTTPException(400, f"Invalid amount in split (mode={s.mode})")
        if s.mode not in {"cash","upi","card","razorpay","bank_transfer","other"}:
            raise HTTPException(400, f"Unsupported payment_mode: {s.mode}")

    total = sum(float(s.amount) for s in req.splits)
    today = req.date or date.today()

    created: list[PaymentTransaction] = []
    for s in req.splits:
        # Build remark: per-split reference appended to global remarks
        remark_parts = []
        if req.remarks: remark_parts.append(req.remarks)
        if s.reference: remark_parts.append(f"[{s.mode} ref: {s.reference}]")
        pay = PaymentTransaction(
            patient_id=req.patient_id, plan_id=req.plan_id,
            appointment_id=req.appointment_id, clinic_id=req.clinic_id,
            amount=float(s.amount), payment_mode=s.mode,
            remarks=" ".join(remark_parts) or None,
            transaction_reference=s.reference, date=today,
        )
        db.add(pay); created.append(pay)
    await db.flush()
    for p in created: await db.refresh(p)

    # Update plan totals once after all splits
    if req.plan_id:
        plan = (await db.execute(select(TreatmentPlan).where(TreatmentPlan.id == req.plan_id))).scalar_one_or_none()
        if plan:
            await db.refresh(plan, ["payments"])
            plan.total_paid = sum(float(p.amount or 0) for p in plan.payments)
            plan.balance = float(plan.final_payable or 0) - plan.total_paid
            plan.updated_at = datetime.now(timezone.utc)
            await db.flush()

    return {
        "ok": True,
        "total": total,
        "count": len(created),
        "transactions": [PaymentOut.model_validate(p).model_dump(mode="json") for p in created],
    }

@router.get("/patient/{pid}", response_model=list[PaymentOut])
async def patient_payments(pid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.patient_id == pid).order_by(PaymentTransaction.created_at.desc()))
    return [PaymentOut.model_validate(p) for p in result.scalars().all()]

@router.get("/plan/{plan_id}", response_model=list[PaymentOut])
async def plan_payments(plan_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.plan_id == plan_id).order_by(PaymentTransaction.date))
    return [PaymentOut.model_validate(p) for p in result.scalars().all()]

@router.get("/outstanding")
async def outstanding(clinic_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    q = select(TreatmentPlan, Patient).join(Patient, TreatmentPlan.patient_id == Patient.id).where(TreatmentPlan.status.notin_(["closed","cancelled"]))
    if clinic_id: q = q.where(TreatmentPlan.clinic_id == clinic_id)
    rows = (await db.execute(q)).all()
    out = []
    for plan, patient in rows:
        await db.refresh(plan, ["payments"])
        total_paid = sum(float(p.amount or 0) for p in plan.payments)
        balance = float(plan.final_payable or 0) - total_paid
        if balance > 0:
            out.append({"patient_id": str(patient.id), "patient_name": patient.name, "patient_phone": patient.phone,
                        "plan_name": plan.name, "final_payable": float(plan.final_payable or 0),
                        "total_paid": total_paid, "balance": balance})
    return sorted(out, key=lambda x: -x["balance"])

@router.get("/revenue/daily")
async def daily_revenue(d: Optional[date] = None, clinic_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    target = d or date.today()
    q = select(func.coalesce(func.sum(PaymentTransaction.amount), 0), PaymentTransaction.payment_mode).where(PaymentTransaction.date == target).group_by(PaymentTransaction.payment_mode)
    if clinic_id: q = q.where(PaymentTransaction.clinic_id == clinic_id)
    rows = (await db.execute(q)).all()
    total = sum(float(r[0]) for r in rows)
    return {"date": str(target), "total": total, "by_mode": {r[1]: float(r[0]) for r in rows}}

@router.get("/revenue/monthly")
async def monthly_revenue(month: int = Query(...), year: int = Query(...), clinic_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    q = select(func.coalesce(func.sum(PaymentTransaction.amount), 0), PaymentTransaction.payment_mode).where(func.extract("month", PaymentTransaction.date) == month, func.extract("year", PaymentTransaction.date) == year).group_by(PaymentTransaction.payment_mode)
    if clinic_id: q = q.where(PaymentTransaction.clinic_id == clinic_id)
    rows = (await db.execute(q)).all()
    total = sum(float(r[0]) for r in rows)
    return {"month": month, "year": year, "total": total, "by_mode": {r[1]: float(r[0]) for r in rows}}
