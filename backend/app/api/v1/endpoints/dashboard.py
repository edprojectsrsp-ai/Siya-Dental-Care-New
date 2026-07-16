"""Dashboard stats + clinics + webhooks"""
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import Appointment, PaymentTransaction, TreatmentPlan, Clinic
from app.schemas.schemas import DashboardStats

router = APIRouter(tags=["Dashboard"])


def _require_role(staff, *roles):
    if staff.get("role") not in roles:
        raise HTTPException(403, f"Requires: {', '.join(roles)}")

@router.get("/dashboard/stats", response_model=DashboardStats)
async def stats(clinic_id: UUID = Query(...), db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    today = date.today()
    sc = (await db.execute(select(Appointment.status, func.count(Appointment.id)).where(Appointment.clinic_id == clinic_id, func.coalesce(Appointment.confirmed_date, Appointment.requested_date) == today).group_by(Appointment.status))).all()
    counts = dict(sc)
    rev = (await db.execute(select(func.coalesce(func.sum(PaymentTransaction.amount), 0)).where(PaymentTransaction.clinic_id == clinic_id, PaymentTransaction.date == today))).scalar() or 0
    from sqlalchemy import text as sql_text
    pend = (
        await db.execute(
            sql_text(
                "SELECT COUNT(*) FROM appointment_requests "
                "WHERE status = 'pending' AND (clinic_id = :c OR clinic_id IS NULL)"
            ),
            {"c": str(clinic_id)},
        )
    ).scalar() or 0
    outstanding = (await db.execute(select(func.coalesce(func.sum(TreatmentPlan.balance), 0)).where(TreatmentPlan.clinic_id == clinic_id, TreatmentPlan.status.notin_(["closed","cancelled"])))).scalar() or 0
    return DashboardStats(pending=counts.get("pending", 0), confirmed=counts.get("confirmed", 0), arrived=counts.get("arrived", 0), in_progress=counts.get("in_progress", 0), done=counts.get("done", 0), no_show=counts.get("no_show", 0), total_today=sum(counts.values()), revenue_today=float(rev), outstanding_total=float(outstanding), pending_requests=pend)

@router.get("/clinics")
async def list_clinics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic).where(Clinic.is_active == True).order_by(Clinic.name))
    return [{"id": str(c.id), "name": c.name, "short_name": c.short_name, "address": c.address, "phone": c.phone, "whatsapp_number": c.whatsapp_number, "timings": c.timings, "doctor_name": c.doctor_name, "doctor_degree": c.doctor_degree} for c in result.scalars().all()]

@router.patch("/clinics/{cid}")
async def update_clinic(cid: UUID, data: dict, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    c = (await db.execute(select(Clinic).where(Clinic.id == cid))).scalar_one_or_none()
    if not c: raise HTTPException(404)
    for k, v in data.items():
        if hasattr(c, k): setattr(c, k, v)
    await db.flush()
    return {"status": "updated"}

# ─── STAFF MANAGEMENT ─────────────────────────────────
# Create/edit/deactivate staff and PIN resets are admin/doctor-only — any other
# role could otherwise grant itself admin or spin up a rogue account.
import secrets
import string

from app.models.models import Staff as StaffModel
from app.core.security import hash_pin


def _generate_temp_pin() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(4))


def _generate_temp_password() -> str:
    # Readable 10-char temp password (letters+digits, no ambiguous chars).
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(10))


@router.get("/staff/public")
async def public_staff_list(db: AsyncSession = Depends(get_db)):
    """No auth — returns staff names for the login page dropdown. Phone numbers are
    withheld here (they double as the login username) so an unauthenticated caller
    can't harvest staff phone numbers to attempt PIN brute-forcing."""
    result = await db.execute(
        select(StaffModel.id, StaffModel.name, StaffModel.role, StaffModel.clinic_id, Clinic.name.label("clinic_name"))
        .join(Clinic, StaffModel.clinic_id == Clinic.id)
        .where(StaffModel.is_active == True)
        .order_by(StaffModel.name)
    )
    return [{"id": str(r.id), "name": r.name, "role": r.role, "clinic_id": str(r.clinic_id), "clinic_name": r.clinic_name} for r in result.all()]

@router.get("/staff")
async def list_staff(clinic_id: UUID = Query(None), db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    q = select(StaffModel).order_by(StaffModel.name)
    if clinic_id: q = q.where(StaffModel.clinic_id == clinic_id)
    result = await db.execute(q)
    return [{"id": str(s.id), "name": s.name, "role": s.role, "phone": s.phone, "clinic_id": str(s.clinic_id), "is_active": s.is_active} for s in result.scalars().all()]

@router.post("/staff", status_code=201)
async def add_staff(data: dict, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    # Login uses the PASSWORD, so a new account needs one to be able to sign in.
    # If the admin didn't supply a password, generate a temporary one and return it
    # once so it can be handed to the staff member (they change it in My Account).
    supplied_pw = data.get("password")
    temp_pw = None
    if supplied_pw:
        password_hash = hash_pin(supplied_pw)
    else:
        temp_pw = _generate_temp_password()
        password_hash = hash_pin(temp_pw)
    # Keep an optional PIN too (used for quick in-app confirmations, not for login).
    pin = data.get("pin") or _generate_temp_pin()
    s = StaffModel(
        clinic_id=data.get("clinic_id", staff["clinic_id"]), name=data["name"],
        role=data.get("role", "nurse"), phone=data["phone"],
        pin_hash=hash_pin(pin), password_hash=password_hash, is_active=True,
    )
    db.add(s); await db.flush(); await db.refresh(s)
    return {"id": str(s.id), "name": s.name, "status": "created", "temp_password": temp_pw}

@router.patch("/staff/{sid}")
async def update_staff(sid: UUID, data: dict, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    s = (await db.execute(select(StaffModel).where(StaffModel.id == sid))).scalar_one_or_none()
    if not s: raise HTTPException(404)
    for k in ["name", "role", "phone", "is_active"]:
        if k in data: setattr(s, k, data[k])
    if "pin" in data: s.pin_hash = hash_pin(data["pin"])
    if "password" in data:
        pw = data["password"]
        if pw is None:
            s.password_hash = None
        elif len(pw) < 8:
            raise HTTPException(400, "Password must be at least 8 characters")
        else:
            s.password_hash = hash_pin(pw)
    await db.flush()
    return {"status": "updated"}

@router.delete("/staff/{sid}")
async def toggle_staff(sid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    s = (await db.execute(select(StaffModel).where(StaffModel.id == sid))).scalar_one_or_none()
    if not s: raise HTTPException(404)
    s.is_active = not s.is_active; await db.flush()
    return {"is_active": s.is_active}
