"""Public appointment request + patient media uploads."""
from __future__ import annotations

import os
import re
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
from datetime import date as date_type
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff
from app.models.models import Clinic

router = APIRouter(prefix="/uploads", tags=["Uploads"])
public_router = APIRouter(prefix="/public", tags=["Public"])
public_site_router = APIRouter(prefix="/public-site", tags=["Public Site"])

# ── Simple in-process rate limit for the public booking form (no auth, so it's an open target) ──
_BOOKING_RATE_LIMIT = 5           # max submissions
_BOOKING_RATE_WINDOW = 300        # per 5 minutes
_booking_hits: dict[str, deque] = defaultdict(deque)


def _booking_rate_limited(key: str) -> bool:
    now = time.time()
    hits = _booking_hits[key]
    while hits and now - hits[0] > _BOOKING_RATE_WINDOW:
        hits.popleft()
    if len(hits) >= _BOOKING_RATE_LIMIT:
        return True
    hits.append(now)
    return False

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "uploads/patient_media"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
DOC_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 20 * 1024 * 1024


def _category(mime: str) -> str:
    if mime in IMAGE_TYPES:
        return "image"
    if mime in VIDEO_TYPES:
        return "video"
    if mime in DOC_TYPES:
        return "document"
    return "unknown"


# Extensions that may land on disk, per detected category. The client-supplied
# extension is never trusted on its own (an .html "image" would be stored XSS).
_CATEGORY_EXTS = {
    "image": {".jpg", ".jpeg", ".png", ".webp", ".gif"},
    "video": {".mp4", ".webm", ".mov"},
    "document": {".pdf"},
}
_CATEGORY_DEFAULT_EXT = {"image": ".jpg", "video": ".mp4", "document": ".pdf"}


def _safe_ext_for(file_type: str, filename: str | None) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    allowed = _CATEGORY_EXTS.get(file_type, set())
    return ext if ext in allowed else _CATEGORY_DEFAULT_EXT.get(file_type, ".bin")


async def _ensure_patient(db: AsyncSession, patient_id: UUID) -> None:
    res = await db.execute(text("SELECT id FROM patients WHERE id = :id"), {"id": patient_id})
    if res.first() is None:
        raise HTTPException(status_code=404, detail="Patient not found")


def _patient_dir(patient_id: UUID) -> Path:
    path = UPLOAD_DIR / str(patient_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def _read_public_booking_payload(request: Request) -> dict:
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        try:
            data = await request.json()
        except Exception:
            data = {}
    else:
        form = await request.form()
        data = dict(form)
    return data if isinstance(data, dict) else {}


async def _table_columns(db: AsyncSession, table_name: str) -> set[str]:
    result = await db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return {row[0] for row in result.fetchall()}


@router.post("/patient/{patient_id}")
async def upload_patient_file(
    patient_id: UUID,
    file: UploadFile = File(...),
    appointment_id: UUID | None = Form(None),
    caption: str | None = Form(None),
    tooth_number: int | None = Form(None),
    file_kind: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    await _ensure_patient(db, patient_id)
    mime = file.content_type or ""
    file_type = _category(mime)
    if file_type == "unknown":
        raise HTTPException(status_code=400, detail="File type not allowed")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size is 20MB.")

    ext = _safe_ext_for(file_type, file.filename)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = _patient_dir(patient_id) / unique_name
    file_path.write_bytes(contents)

    result = await db.execute(
        text(
            """
            INSERT INTO patient_uploads
                (patient_id, appointment_id, file_name, file_path, file_type, mime_type, caption, uploaded_by, tooth_number, file_kind)
            VALUES
                (:patient_id, :appointment_id, :file_name, :file_path, :file_type, :mime_type, :caption, :uploaded_by, :tooth_number, :file_kind)
            RETURNING id, file_name, file_type, caption, uploaded_at
            """
        ),
        {
            "patient_id": patient_id,
            "appointment_id": appointment_id,
            "file_name": file.filename or unique_name,
            "file_path": f"{patient_id}/{unique_name}",
            "file_type": file_type,
            "mime_type": mime,
            "caption": caption,
            "uploaded_by": staff["staff_id"],
            "tooth_number": tooth_number,
            "file_kind": file_kind,
        },
    )
    row = result.mappings().one()
    return {
        "id": row["id"],
        "file_name": row["file_name"],
        "file_url": f"/api/uploads/serve/{patient_id}/{unique_name}",
        "file_type": row["file_type"],
        "caption": row["caption"],
        "uploaded_at": row["uploaded_at"].isoformat() if row["uploaded_at"] else None,
        "uploaded_by": staff["name"],
    }


@router.get("/patient/{patient_id}")
async def list_patient_uploads(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    await _ensure_patient(db, patient_id)
    result = await db.execute(
        text(
            """
            SELECT pu.id, pu.file_name, pu.file_path, pu.file_type, pu.caption, pu.uploaded_at,
                   pu.tooth_number, pu.file_kind,
                   s.name AS uploaded_by_name
            FROM patient_uploads pu
            LEFT JOIN staff s ON s.id = pu.uploaded_by
            WHERE pu.patient_id = :patient_id
            ORDER BY pu.uploaded_at DESC
            """
        ),
        {"patient_id": patient_id},
    )
    rows = result.mappings().all()
    return [
        {
            "id": r["id"],
            "file_name": r["file_name"],
            "file_url": f"/api/uploads/serve/{patient_id}/{Path(r['file_path']).name}",
            "file_type": r["file_type"],
            "caption": r["caption"],
            "uploaded_at": r["uploaded_at"].isoformat() if r["uploaded_at"] else None,
            "uploaded_by": r["uploaded_by_name"],
            "tooth_number": r["tooth_number"],
            "file_kind": r["file_kind"],
        }
        for r in rows
    ]


@router.get("/serve/{patient_id}/{filename}")
async def serve_upload(
    patient_id: UUID,
    filename: str,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    await _ensure_patient(db, patient_id)
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = _patient_dir(patient_id) / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


# ── Share links: HMAC-signed, expiring, no login needed ─────────────────
# Upload ids are sequential ints, so a raw public serve-by-id would be
# enumerable. The signature binds id + expiry to SECRET_KEY.

def _share_sig(upload_id: int, expires: int) -> str:
    import hashlib
    import hmac as hmac_mod

    from app.core.config import settings

    msg = f"upload-share:{upload_id}:{expires}".encode()
    return hmac_mod.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:32]


@router.get("/{upload_id}/share-link")
async def create_share_link(
    upload_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Staff-only: mint a 7-day public link for one upload (to WhatsApp a patient their X-ray)."""
    import time

    row = (await db.execute(
        text("SELECT id, file_name FROM patient_uploads WHERE id = :id"), {"id": upload_id}
    )).mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Upload not found")
    expires = int(time.time()) + 7 * 86400
    sig = _share_sig(upload_id, expires)
    base = str(request.base_url).rstrip("/")
    return {
        "url": f"{base}/api/uploads/shared/{upload_id}/{expires}/{sig}",
        "file_name": row["file_name"],
        "expires_at": expires,
    }


@router.get("/shared/{upload_id}/{expires}/{sig}", dependencies=[])
async def serve_shared_upload(
    upload_id: int,
    expires: int,
    sig: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: serve an upload if the signed link is valid and not expired."""
    import hmac as hmac_mod
    import time

    if time.time() > expires:
        raise HTTPException(status_code=410, detail="Link expired — ask the clinic to resend")
    if not hmac_mod.compare_digest(sig, _share_sig(upload_id, expires)):
        raise HTTPException(status_code=403, detail="Invalid link")
    row = (await db.execute(
        text("SELECT patient_id, file_path FROM patient_uploads WHERE id = :id"), {"id": upload_id}
    )).mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="File not found")
    path = UPLOAD_DIR / row["file_path"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@router.delete("/{upload_id}")
async def delete_upload(
    upload_id: int,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if staff["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Only doctors can delete uploads")
    result = await db.execute(
        text("SELECT file_path FROM patient_uploads WHERE id = :id"),
        {"id": upload_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Upload not found")
    full_path = UPLOAD_DIR / row["file_path"]
    if full_path.exists():
        full_path.unlink()
    await db.execute(text("DELETE FROM patient_uploads WHERE id = :id"), {"id": upload_id})
    return {"message": "Deleted"}


@public_router.get("/clinic-info")
async def clinic_info(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT key, value FROM clinic_info"))
    rows = result.mappings().all()
    return {r["key"]: r["value"] for r in rows}


async def _store_public_appointment_request(request: Request, db: AsyncSession):
    payload = await _read_public_booking_payload(request)
    columns = await _table_columns(db, "appointment_requests")

    def _clean(value):
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    # Honeypot — a hidden field real users never fill in; bots that auto-fill every field trip it.
    if _clean(payload.get("website")) or _clean(payload.get("hp_field")):
        return {"request_id": None, "message": "Appointment request received. Our team will confirm it shortly."}

    patient_name = str(payload.get("patient_name") or payload.get("name") or "").strip()
    phone_raw = str(payload.get("phone") or "").strip()
    if not patient_name or not phone_raw:
        raise HTTPException(status_code=400, detail="patient_name and phone are required")

    phone_digits = re.sub(r"\D", "", phone_raw)
    if len(phone_digits) < 10 or len(phone_digits) > 13:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")
    phone = phone_raw

    client_ip = request.client.host if request.client else "unknown"
    if _booking_rate_limited(f"ip:{client_ip}") or _booking_rate_limited(f"phone:{phone_digits}"):
        raise HTTPException(status_code=429, detail="Too many requests — please try again in a few minutes or call the clinic directly.")

    preferred_date_raw = _clean(payload.get("preferred_date") or payload.get("date"))
    preferred_date = None
    if preferred_date_raw:
        if isinstance(preferred_date_raw, date_type):
            preferred_date = preferred_date_raw
        elif isinstance(preferred_date_raw, str):
            try:
                preferred_date = date_type.fromisoformat(preferred_date_raw[:10])
            except ValueError:
                raise HTTPException(status_code=400, detail="preferred_date must be YYYY-MM-DD")
        else:
            preferred_date = preferred_date_raw
    preferred_time = _clean(payload.get("preferred_time") or payload.get("time"))
    branch = _clean(payload.get("branch") or payload.get("clinic_name"))
    service = _clean(payload.get("service"))
    message = _clean(payload.get("message") or payload.get("reason") or payload.get("notes"))
    clinic_id = _clean(payload.get("clinic_id"))
    source = _clean(payload.get("source")) or "public_site"

    if service and message and f"Service: {service}" not in message:
        message = f"Service: {service}\n{message}"
    elif service and not message:
        message = f"Service: {service}"

    values = {
        "patient_name": patient_name,
        "phone": phone,
        "preferred_date": preferred_date,
        "preferred_time": preferred_time,
        "branch": branch,
        "message": message,
        "service": service,
        "clinic_id": clinic_id if clinic_id else None,
        "source": source,
        "status": "pending",
    }

    # De-dupe by phone (last 10 digits) so "+91 98765 43210" matches "9876543210".
    # Clinical websites almost never force patient accounts for first booking — instead
    # they coalesce open requests so the staff queue doesn't fill with spam duplicates.
    cid_param = clinic_id or None
    last10 = phone_digits[-10:]

    existing = (await db.execute(
        text(
            "SELECT id FROM appointment_requests "
            "WHERE status = 'pending' AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = :last10 "
            "AND (CAST(:cid AS uuid) IS NULL OR clinic_id IS NULL OR clinic_id = CAST(:cid AS uuid)) "
            "ORDER BY created_at DESC LIMIT 1"
        ),
        {"last10": last10, "cid": cid_param},
    )).mappings().first()

    if existing:
        update_columns = ["patient_name", "phone"]
        for extra_column in ("preferred_date", "preferred_time", "branch", "message", "service", "clinic_id", "source"):
            if extra_column in columns and values.get(extra_column) is not None:
                update_columns.append(extra_column)
        set_sql = ", ".join(f"{c} = :{c}" for c in update_columns)
        params = {key: values[key] for key in update_columns}
        params["id"] = existing["id"]
        await db.execute(text(f"UPDATE appointment_requests SET {set_sql} WHERE id = :id"), params)
        return {
            "request_id": existing["id"],
            "updated": True,
            "duplicate": True,
            "message": (
                "We already have an open request for this mobile number — "
                "updated it with your latest details. The clinic will call to confirm. "
                "No need to submit again."
            ),
        }

    # Soft notice if this phone already has a visit on the preferred day.
    # Do not hard-block — staff may still accept a second concern or family member.
    already_booked_note = ""
    if preferred_date is not None:
        try:
            same_day = (await db.execute(
                text(
                    """
                    SELECT a.id
                    FROM appointments a
                    LEFT JOIN patients p ON p.id = a.patient_id
                    WHERE right(
                            regexp_replace(
                              COALESCE(a.phone_number, p.phone, ''),
                              '\\D', '', 'g'
                            ),
                            10
                          ) = :last10
                      AND COALESCE(a.scheduled_date, a.confirmed_date, a.requested_date) = :day
                      AND COALESCE(a.status, '') NOT IN ('cancelled', 'no_show', 'rejected', 'completed')
                    LIMIT 1
                    """
                ),
                {"last10": last10, "day": preferred_date},
            )).mappings().first()
            if same_day:
                already_booked_note = (
                    " Note: this number already has a visit on that date — "
                    "the desk will check before confirming another slot."
                )
        except Exception:
            # Schema can vary slightly across environments — never fail public booking for this check
            already_booked_note = ""

    insert_columns = ["patient_name", "phone"]
    for extra_column in (
        "preferred_date",
        "preferred_time",
        "branch",
        "message",
        "service",
        "clinic_id",
        "source",
        "status",
    ):
        if extra_column in columns and values.get(extra_column) is not None:
            insert_columns.append(extra_column)

    params = {key: values[key] for key in insert_columns}
    columns_sql = ", ".join(insert_columns)
    placeholders_sql = ", ".join(f":{column}" for column in insert_columns)
    result = await db.execute(
        text(f"INSERT INTO appointment_requests ({columns_sql}) VALUES ({placeholders_sql}) RETURNING id"),
        params,
    )
    row = result.mappings().one()
    return {
        "request_id": row["id"],
        "updated": False,
        "duplicate": False,
        "message": (
            "Appointment request received. Our team will call to confirm shortly."
            + already_booked_note
        ),
    }


@public_router.post("/appointment-request")
async def appointment_request(request: Request, db: AsyncSession = Depends(get_db)):
    return await _store_public_appointment_request(request, db)


@public_site_router.post("/appointment-request")
async def public_site_appointment_request(request: Request, db: AsyncSession = Depends(get_db)):
    return await _store_public_appointment_request(request, db)


@public_site_router.get("/clinics")
async def public_site_clinics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic).where(Clinic.is_active == True).order_by(Clinic.name))
    clinics = []
    for c in result.scalars().all():
        clinics.append({
            "id": str(c.id),
            "name": c.name,
            "short_name": c.short_name,
            "address": c.address,
            "phone": c.phone,
            "whatsapp_number": getattr(c, "whatsapp_number", ""),
            "timings": getattr(c, "timings", {}),
            "doctor_name": getattr(c, "doctor_name", ""),
            "doctor_degree": getattr(c, "doctor_degree", ""),
            "google_maps_link": getattr(c, "google_maps_link", ""),
        })
    return clinics


@public_site_router.get("/clinic/{clinic_id}")
async def public_site_clinic(clinic_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic).where(Clinic.id == clinic_id, Clinic.is_active == True))
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    info_rows = await db.execute(text("SELECT key, value FROM clinic_info"))
    info = {r[0]: r[1] for r in info_rows.fetchall()}

    clinic_data = {
        "id": str(clinic.id),
        "name": clinic.name,
        "address": clinic.address,
        "phone": clinic.phone,
        "whatsapp_number": getattr(clinic, "whatsapp_number", ""),
        "timings": getattr(clinic, "timings", {}),
        "doctor_name": getattr(clinic, "doctor_name", ""),
        "doctor_degree": getattr(clinic, "doctor_degree", ""),
        "doctor_reg_no": getattr(clinic, "doctor_reg_no", ""),
        "google_maps_link": getattr(clinic, "google_maps_link", ""),
    }

    hero = {
        "id": "hero",
        "title": info.get("clinic_name", clinic.name),
        "body": info.get("tagline", "Expert dental care with a gentle touch."),
        "image_url": info.get("hero_image_url", ""),
    }

    about = {
        "id": "about",
        "title": info.get("about_title", "About the Doctor"),
        "body": info.get("about", info.get("clinic_about", "Expert dental care with a gentle touch. Specializing in implants, orthodontics, and family dentistry.")),
        "image_url": info.get("about_image_url", ""),
    }

    services = []
    for idx in range(1, 7):
        title = info.get(f"service{idx}_title")
        body = info.get(f"service{idx}_body")
        if title or body:
            services.append({"id": f"service{idx}", "title": title or f"Service {idx}", "body": body or "Top-quality care."})

    testimonials = []
    faqs = []
    gallery = []

    return {
        "clinic": clinic_data,
        "hero": hero,
        "about": about,
        "services": services,
        "testimonials": testimonials,
        "faqs": faqs,
        "gallery": gallery,
    }
