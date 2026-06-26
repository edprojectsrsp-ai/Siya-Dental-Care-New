"""
Bundle W — Final touches:
  • QR code generation (Rx, lab orders, patient portal, smile previews)
  • Short-code resolver (public)
  • Lab order tracking landing page

Tables: qr_codes (already created by migration 025)
Storage: PNGs written to UPLOAD_DIR/qr/<id>.png

INTEGRATION:
    from app.api.v1.endpoints.bundle_w import router as bundle_w_router, public_router as bundle_w_public
    app.include_router(bundle_w_router, prefix="/api")
    app.include_router(bundle_w_public, prefix="/api")   # public (no auth) for QR resolution
"""

from __future__ import annotations

import io
import os
import secrets
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff

import qrcode
from qrcode.constants import ERROR_CORRECT_M

router = APIRouter(tags=["Bundle W"])
public_router = APIRouter(tags=["Bundle W - Public"])

UPLOAD_DIR = os.getenv("SIYA_UPLOAD_DIR", "uploads")
QR_DIR = os.path.join(UPLOAD_DIR, "qr")
os.makedirs(QR_DIR, exist_ok=True)


# ──────────────────────────────────────────────────────────────
# Short code generator — unambiguous chars only
# ──────────────────────────────────────────────────────────────

_SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"   # no 0/O/1/I

def _gen_short_code(length: int = 6) -> str:
    return "".join(secrets.choice(_SAFE_ALPHABET) for _ in range(length))


def _build_target_url(base_url: str, kind: str, target_id: str | None, code: str) -> str:
    """Compose the URL a QR resolves to. For Rx/lab — go to the API tracker
    that increments scans and redirects to actual content."""
    base = (base_url or "").rstrip("/")
    if kind == "rx":
        return f"{base}/api/qr/r/{code}"        # Rx → opens PDF
    if kind == "lab_order":
        return f"{base}/api/qr/r/{code}"        # Lab order → tracking page
    if kind == "patient_portal":
        return f"{base}/api/qr/r/{code}"
    if kind == "smile":
        return f"{base}/api/qr/r/{code}"
    return f"{base}/api/qr/r/{code}"            # generic


def _generate_png(target_url: str, qr_id: str) -> str:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0E7C7B", back_color="white")
    path = os.path.join(QR_DIR, f"{qr_id}.png")
    img.save(path)
    return f"/uploads/qr/{qr_id}.png"


# ──────────────────────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────────────────────

class QrCreateRequest(BaseModel):
    clinic_id: UUID
    kind: str                                    # 'rx'|'lab_order'|'patient_portal'|'smile'|'custom'
    target_id: Optional[UUID] = None             # id of the underlying record
    target_url_override: Optional[str] = None    # for 'custom' kind
    base_url: Optional[str] = None               # e.g. "https://siyadental.in" (else uses request host)
    expires_days: Optional[int] = None


# ──────────────────────────────────────────────────────────────
# Create QR
# ──────────────────────────────────────────────────────────────

@router.post("/qr/codes")
async def create_qr_code(
    body: QrCreateRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if staff.get("role") not in ("doctor", "admin", "nurse", "receptionist"):
        raise HTTPException(403, "Insufficient permissions")

    if body.kind not in ("rx", "lab_order", "patient_portal", "smile", "custom"):
        raise HTTPException(400, "Invalid kind")
    if body.kind == "custom" and not body.target_url_override:
        raise HTTPException(400, "target_url_override required for custom QR")

    qr_id = str(uuid4())

    # Allocate unique short_code
    for _ in range(8):
        code = _gen_short_code()
        existing = (await db.execute(
            sql_text("SELECT 1 FROM qr_codes WHERE short_code = :c"), {"c": code}
        )).first()
        if not existing:
            break
    else:
        raise HTTPException(500, "Could not allocate unique short code, try again")

    base = body.base_url or os.getenv("SIYA_PUBLIC_BASE_URL", "http://localhost:8000")

    if body.kind == "custom":
        target_url = body.target_url_override
    else:
        target_url = _build_target_url(base, body.kind, str(body.target_id) if body.target_id else None, code)

    expires_at_sql = "NOW() + (:days || ' days')::interval" if body.expires_days else "NULL"
    params = {
        "id": qr_id,
        "cid": str(body.clinic_id),
        "kind": body.kind,
        "tid": str(body.target_id) if body.target_id else None,
        "url": target_url,
        "code": code,
        "by": str(staff["staff_id"]),
    }
    if body.expires_days:
        params["days"] = body.expires_days

    await db.execute(sql_text(f"""
        INSERT INTO qr_codes
            (id, clinic_id, kind, target_id, target_url, short_code, created_by, expires_at, is_active,
             source, whatsapp_url)
        VALUES
            (:id, :cid, :kind, :tid, :url, :code, :by, {expires_at_sql}, TRUE,
             'bundle_w', :url)
    """), params)

    png_rel = _generate_png(target_url, qr_id)
    await db.execute(
        sql_text("UPDATE qr_codes SET png_path = :p WHERE id = :id"),
        {"p": png_rel, "id": qr_id},
    )

    # If Rx or lab — also stamp the source row
    if body.kind == "rx" and body.target_id:
        await db.execute(
            sql_text("UPDATE prescriptions SET qr_code_id = :qid WHERE id = :id"),
            {"qid": qr_id, "id": str(body.target_id)},
        )
    elif body.kind == "lab_order" and body.target_id:
        await db.execute(
            sql_text("UPDATE lab_orders SET qr_code_id = :qid WHERE id = :id"),
            {"qid": qr_id, "id": str(body.target_id)},
        )

    return {
        "qr_id": qr_id,
        "short_code": code,
        "target_url": target_url,
        "png_url": png_rel,
    }


# ──────────────────────────────────────────────────────────────
# Get QR PNG bytes inline (handy for embedding in PDFs)
# ──────────────────────────────────────────────────────────────

@router.get("/qr/codes/{qr_id}/png")
async def qr_png(qr_id: UUID, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        sql_text("SELECT png_path FROM qr_codes WHERE id = :id AND is_active = TRUE"),
        {"id": str(qr_id)}
    )).mappings().one_or_none()
    if not row or not row["png_path"]:
        raise HTTPException(404, "QR not found")
    full = os.path.join(UPLOAD_DIR, row["png_path"].lstrip("/").removeprefix("uploads/"))
    if not os.path.exists(full):
        raise HTTPException(404, "QR image missing on disk")
    with open(full, "rb") as f:
        return Response(content=f.read(), media_type="image/png")


# ──────────────────────────────────────────────────────────────
# List QR codes (admin view + filters)
# ──────────────────────────────────────────────────────────────

@router.get("/qr/codes")
async def list_qr_codes(
    clinic_id: UUID,
    kind: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if staff.get("role") not in ("doctor", "admin", "nurse"):
        raise HTTPException(403, "Insufficient permissions")
    sql = """
        SELECT id, kind, target_id, target_url, short_code, scans_count, last_scanned_at,
               png_path, created_at, expires_at, is_active
        FROM qr_codes
        WHERE clinic_id = :cid AND is_active = TRUE
    """
    params: dict = {"cid": str(clinic_id), "limit": limit}
    if kind:
        sql += " AND kind = :kind"
        params["kind"] = kind
    sql += " ORDER BY created_at DESC LIMIT :limit"
    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return {"qr_codes": [dict(r) for r in rows]}


# ──────────────────────────────────────────────────────────────
# Lab order tracking page (returned as JSON; frontend renders)
# ──────────────────────────────────────────────────────────────

@router.get("/qr/lab/{order_id}/track")
async def lab_tracking(order_id: UUID, db: AsyncSession = Depends(get_db)):
    """Public — used by vendors after scanning QR on a lab slip."""
    row = (await db.execute(sql_text("""
        SELECT lo.id, lo.serial_no, lo.work_type, lo.teeth, lo.shade,
               lo.sent_date, lo.expected_date, lo.received_date,
               lo.status, lo.notes, lo.vendor_notes,
               p.name AS patient_name,
               c.name AS clinic_name, c.phone AS clinic_phone,
               v.name AS vendor_name
        FROM lab_orders lo
        JOIN clinics c ON c.id = lo.clinic_id
        JOIN patients p ON p.id = lo.patient_id
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        WHERE lo.id = :id
    """), {"id": str(order_id)})).mappings().one_or_none()

    if not row:
        raise HTTPException(404, "Lab order not found")

    return {
        "order": dict(row),
        # Vendors only see patient initial for privacy
        "display_patient": ((row["patient_name"] or "").split() or [""])[0][:1].upper() + ".",
    }


# ──────────────────────────────────────────────────────────────
# PUBLIC: resolve short code → bump scan count → redirect
# ──────────────────────────────────────────────────────────────

@public_router.get("/qr/r/{short_code}")
async def resolve_short_code(short_code: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(sql_text("""
        SELECT id, kind, target_id, target_url, is_active, expires_at
        FROM qr_codes
        WHERE short_code = :code
    """), {"code": short_code.upper()})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "QR not found")
    if not row["is_active"]:
        raise HTTPException(410, "QR code disabled")

    await db.execute(sql_text("""
        UPDATE qr_codes
        SET scans_count = COALESCE(scans_count, 0) + 1,
            last_scanned_at = NOW()
        WHERE id = :id
    """), {"id": str(row["id"])})

    kind = row["kind"]
    target_id = row["target_id"]

    # Decide real destination based on kind
    if kind == "rx" and target_id:
        return RedirectResponse(url=f"/api/prescriptions/{target_id}/pdf-v2", status_code=302)
    if kind == "lab_order" and target_id:
        return RedirectResponse(url=f"/lab-track/{target_id}", status_code=302)
    if kind == "patient_portal" and target_id:
        return RedirectResponse(url=f"/p/{target_id}", status_code=302)
    # Custom or fallback — return the stored target URL
    return RedirectResponse(url=row["target_url"], status_code=302)


# ──────────────────────────────────────────────────────────────
# PUBLIC: lab tracking lookup by short code (no auth)
# ──────────────────────────────────────────────────────────────

@public_router.get("/qr/lab-track/{short_code}")
async def public_lab_track(short_code: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(sql_text("""
        SELECT q.target_id, q.scans_count
        FROM qr_codes q
        WHERE q.short_code = :code AND q.kind = 'lab_order' AND q.is_active = TRUE
    """), {"code": short_code.upper()})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Tracking not found")
    return await lab_tracking(row["target_id"], db)
