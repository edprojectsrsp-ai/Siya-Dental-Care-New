"""Admin: Medicine + Procedure catalog management + Smart suggestions"""
from uuid import UUID
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import MedicineCatalog, ProcedureCatalog, ProcedureMedicineMap
from app.schemas.schemas import MedicineCatalogCreate, MedicineCatalogUpdate, ProcedureCatalogCreate, ProcedureCatalogUpdate

router = APIRouter(prefix="/catalog", tags=["Catalog"])

# ─── MEDICINES ────────────────────────────────────────
@router.get("/medicines")
async def list_medicines(category: Optional[str] = None, search: Optional[str] = None, active_only: bool = True, db: AsyncSession = Depends(get_db)):
    q = select(MedicineCatalog).order_by(MedicineCatalog.sort_order, MedicineCatalog.name)
    if active_only: q = q.where(MedicineCatalog.is_active == True)
    if category: q = q.where(MedicineCatalog.category == category)
    if search: q = q.where(MedicineCatalog.name.ilike(f"%{search}%"))
    result = await db.execute(q)
    return [{"id": str(m.id), "name": m.name, "category": m.category, "default_strength": m.default_strength, "default_dose": m.default_dose, "default_frequency": m.default_frequency, "default_duration": m.default_duration, "instructions": m.instructions, "strengths": m.strengths, "frequencies": m.frequencies, "contraindications": m.contraindications, "is_active": m.is_active} for m in result.scalars().all()]

@router.post("/medicines", status_code=201)
async def add_medicine(req: MedicineCatalogCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    m = MedicineCatalog(**req.model_dump()); db.add(m); await db.flush(); await db.refresh(m)
    return {"id": str(m.id), "name": m.name, "status": "created"}

@router.patch("/medicines/{mid}")
async def update_medicine(mid: UUID, req: MedicineCatalogUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    m = (await db.execute(select(MedicineCatalog).where(MedicineCatalog.id == mid))).scalar_one_or_none()
    if not m: raise HTTPException(404)
    for k, v in req.model_dump(exclude_unset=True).items(): setattr(m, k, v)
    m.updated_at = datetime.now(timezone.utc); await db.flush()
    return {"status": "updated"}

@router.delete("/medicines/{mid}")
async def toggle_medicine(mid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    m = (await db.execute(select(MedicineCatalog).where(MedicineCatalog.id == mid))).scalar_one_or_none()
    if not m: raise HTTPException(404)
    m.is_active = not m.is_active; await db.flush()
    return {"is_active": m.is_active}

# ─── PROCEDURES ───────────────────────────────────────
@router.get("/procedures")
async def list_procedures(category: Optional[str] = None, active_only: bool = True, db: AsyncSession = Depends(get_db)):
    q = select(ProcedureCatalog).order_by(ProcedureCatalog.sort_order, ProcedureCatalog.name)
    if active_only: q = q.where(ProcedureCatalog.is_active == True)
    if category: q = q.where(ProcedureCatalog.category == category)
    result = await db.execute(q)
    procs = []
    for p in result.scalars().all():
        # Get linked medicines
        maps = (await db.execute(select(ProcedureMedicineMap).where(ProcedureMedicineMap.procedure_id == p.id))).scalars().all()
        med_ids = [str(m.medicine_id) for m in maps]
        procs.append({"id": str(p.id), "name": p.name, "category": p.category, "cost_min": float(p.cost_min or 0), "cost_max": float(p.cost_max or 0), "default_cost": float(p.default_cost or 0), "followup_days": p.followup_days, "common_advice": p.common_advice, "linked_medicine_ids": med_ids, "is_active": p.is_active})
    return procs

@router.post("/procedures", status_code=201)
async def add_procedure(req: ProcedureCatalogCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = ProcedureCatalog(name=req.name, category=req.category, cost_min=req.cost_min, cost_max=req.cost_max, default_cost=req.default_cost, followup_days=req.followup_days, common_advice=req.common_advice)
    db.add(p); await db.flush(); await db.refresh(p)
    for mid in req.medicine_ids:
        db.add(ProcedureMedicineMap(procedure_id=p.id, medicine_id=mid))
    await db.flush()
    return {"id": str(p.id), "name": p.name, "status": "created"}

@router.patch("/procedures/{pid}")
async def update_procedure(pid: UUID, req: ProcedureCatalogUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    p = (await db.execute(select(ProcedureCatalog).where(ProcedureCatalog.id == pid))).scalar_one_or_none()
    if not p: raise HTTPException(404)
    for k, v in req.model_dump(exclude_unset=True).items(): setattr(p, k, v)
    p.updated_at = datetime.now(timezone.utc); await db.flush()
    return {"status": "updated"}

# ─── SMART SUGGESTIONS ───────────────────────────────
@router.get("/suggestions")
async def get_suggestions(procedure_ids: str = Query(..., description="Comma-separated procedure catalog IDs"), db: AsyncSession = Depends(get_db)):
    """Given procedure IDs, return suggested medicines + advice + follow-up"""
    pids = [pid.strip() for pid in procedure_ids.split(",") if pid.strip()]
    suggestions = []
    for pid in pids:
        proc = (await db.execute(select(ProcedureCatalog).where(ProcedureCatalog.id == pid))).scalar_one_or_none()
        if not proc: continue
        maps = (await db.execute(select(ProcedureMedicineMap).where(ProcedureMedicineMap.procedure_id == pid))).scalars().all()
        meds = []
        for m in maps:
            med = (await db.execute(select(MedicineCatalog).where(MedicineCatalog.id == m.medicine_id, MedicineCatalog.is_active == True))).scalar_one_or_none()
            if med:
                meds.append({"id": str(med.id), "name": med.name, "category": med.category, "default_strength": med.default_strength, "default_dose": med.default_dose, "default_frequency": med.default_frequency, "default_duration": med.default_duration, "instructions": med.instructions})
        suggestions.append({"procedure_id": str(proc.id), "procedure_name": proc.name, "default_cost": float(proc.default_cost or 0), "suggested_medicines": meds, "suggested_advice": proc.common_advice or [], "followup_days": proc.followup_days})
    return suggestions

# ─── MEDICINE CATEGORIES ─────────────────────────────
@router.get("/medicine-categories")
async def med_cats(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import distinct
    result = await db.execute(select(distinct(MedicineCatalog.category)).where(MedicineCatalog.is_active == True).order_by(MedicineCatalog.category))
    return [r[0] for r in result.all()]

@router.get("/procedure-categories")
async def proc_cats(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import distinct
    result = await db.execute(select(distinct(ProcedureCatalog.category)).where(ProcedureCatalog.is_active == True).order_by(ProcedureCatalog.category))
    return [r[0] for r in result.all()]
