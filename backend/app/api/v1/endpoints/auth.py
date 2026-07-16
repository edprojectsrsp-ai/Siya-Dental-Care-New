import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_pin, hash_pin, create_access_token, get_current_staff
from app.models.models import Staff, Clinic
from app.schemas.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Login brute-force protection ──────────────────────────────────────
# A 4-digit PIN has only 10,000 combinations, so without a throttle it's
# guessable in minutes. Lock out an (IP, phone+clinic) pair after repeated
# failures rather than counting attempts globally, so one bad actor can't
# lock legitimate staff out of their own accounts.
_MAX_ATTEMPTS = 5
_LOCKOUT_SECONDS = 15 * 60
_failed_attempts: dict[str, deque] = defaultdict(deque)


def _attempt_key(request: Request, req: LoginRequest) -> str:
    ip = request.client.host if request.client else "unknown"
    identity = req.staff_id or req.phone
    return f"{ip}:{req.clinic_id}:{identity}"


def _is_locked_out(key: str) -> bool:
    now = time.time()
    hits = _failed_attempts[key]
    while hits and now - hits[0] > _LOCKOUT_SECONDS:
        hits.popleft()
    return len(hits) >= _MAX_ATTEMPTS


def _record_failure(key: str) -> None:
    _failed_attempts[key].append(time.time())


def _clear_failures(key: str) -> None:
    _failed_attempts.pop(key, None)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    key = _attempt_key(request, req)
    if _is_locked_out(key):
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes or contact admin.")

    if not req.staff_id and not req.phone:
        raise HTTPException(400, "staff_id or phone is required")

    if req.staff_id:
        staff = (await db.execute(select(Staff).where(Staff.id == req.staff_id, Staff.clinic_id == req.clinic_id, Staff.is_active == True))).scalar_one_or_none()
    else:
        staff = (await db.execute(select(Staff).where(Staff.phone == req.phone, Staff.clinic_id == req.clinic_id, Staff.is_active == True))).scalar_one_or_none()

    # Login requires the account PASSWORD — the 4-digit PIN is no longer accepted for
    # login (it's easily shoulder-surfed / shared and exposed the clinic). The `pin`
    # request field now carries the password. Accounts without a password set cannot
    # log in until an admin/doctor sets one (Settings → Staff / My Account).
    valid = False
    password_missing = bool(staff and not staff.password_hash)
    if staff and staff.password_hash:
        try:
            valid = verify_pin(req.pin, staff.password_hash)
        except Exception:
            valid = False

    if not valid:
        _record_failure(key)
        if password_missing:
            raise HTTPException(403, "No password set for this account. Ask an admin to set your password before logging in.")
        raise HTTPException(401, "Invalid credentials")

    _clear_failures(key)
    clinic = (await db.execute(select(Clinic).where(Clinic.id == req.clinic_id))).scalar_one_or_none()
    token = create_access_token({"sub": str(staff.id), "clinic_id": str(staff.clinic_id), "role": staff.role, "name": staff.name})
    return TokenResponse(access_token=token, staff_id=staff.id, name=staff.name, role=staff.role, clinic_id=staff.clinic_id, clinic_name=clinic.name if clinic else "")

@router.get("/me")
async def me(staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    clinic = (await db.execute(select(Clinic).where(Clinic.id == staff["clinic_id"]))).scalar_one_or_none()
    return {
        "id": staff["staff_id"],
        "name": staff["name"],
        "role": staff["role"],
        "branch": clinic.short_name if clinic else "",
        "phone": "",
        "clinic_id": staff["clinic_id"],
    }


class SetPasswordRequest(BaseModel):
    password: str


MIN_PASSWORD_LENGTH = 8


@router.post("/set-password")
async def set_password(req: SetPasswordRequest, staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    """Staff opt in to a stronger password instead of relying on their 4-digit PIN.
    Self-service only — use PATCH /staff/{id} (admin/doctor-only) to set another
    account's password."""
    if len(req.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    row = (await db.execute(select(Staff).where(Staff.id == staff["staff_id"]))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Staff not found")
    row.password_hash = hash_pin(req.password)
    await db.flush()
    return {"status": "password set"}


@router.delete("/set-password")
async def clear_password(staff=Depends(get_current_staff), db: AsyncSession = Depends(get_db)):
    """Revert to PIN-only login."""
    row = (await db.execute(select(Staff).where(Staff.id == staff["staff_id"]))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Staff not found")
    row.password_hash = None
    await db.flush()
    return {"status": "password cleared"}
