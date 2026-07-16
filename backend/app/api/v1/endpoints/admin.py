"""Admin endpoints: Staff (User Control), Templates, Gallery, Website CMS."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import json, hashlib, secrets
from app.core.security import hash_pin as _bcrypt_hash_pin
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text
from pathlib import Path
from app.core.database import get_db
from app.core.security import get_current_staff
from app.core.upload_guard import safe_ext, check_size

router = APIRouter(prefix="/admin", tags=["Admin"])
public_router = APIRouter(prefix="/site", tags=["Public Site"])

GALLERY_DIR = Path("uploads/gallery")
GALLERY_DIR.mkdir(parents=True, exist_ok=True)

def _hash_pin(pin: str) -> str:
    return _bcrypt_hash_pin(pin)

def _require_admin(staff):
    if staff.get("role") not in ("admin", "doctor"):
        raise HTTPException(403, "Admin or doctor role required")

# ═════════════════════ STAFF (USER CONTROL) ═══════════════════════
class StaffCreate(BaseModel):
    name: str; phone: str; role: str
    email: Optional[str] = None
    pin: str = "0000"
    password: Optional[str] = None   # login credential; auto-generated if omitted
    clinic_id: Optional[UUID] = None
    telegram_chat_id: Optional[str] = None
    multi_clinic: bool = False       # can this account operate across all clinics?
class StaffUpdate(BaseModel):
    name: Optional[str] = None; phone: Optional[str] = None
    role: Optional[str] = None; email: Optional[str] = None
    clinic_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    telegram_chat_id: Optional[str] = None
    multi_clinic: Optional[bool] = None
class PinReset(BaseModel):
    new_pin: str
class PasswordReset(BaseModel):
    new_password: Optional[str] = None   # if omitted, a temp password is generated


_PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
def _generate_temp_password() -> str:
    return "".join(secrets.choice(_PW_ALPHABET) for _ in range(10))

@router.get("/staff")
async def list_staff(include_inactive: bool = False, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    where = "" if include_inactive else "WHERE s.is_active=TRUE"
    rows = (await db.execute(sql_text(f"""SELECT s.id, s.name, s.phone, s.email, s.role, s.is_active, s.last_login_at,
        s.created_at, s.deactivated_at, s.clinic_id, c.name AS clinic_name, s.telegram_chat_id, s.multi_clinic
        FROM staff s LEFT JOIN clinics c ON c.id=s.clinic_id {where}
        ORDER BY s.is_active DESC, s.role, s.name"""))).mappings().all()
    return [{"id": str(r["id"]), "name": r["name"], "phone": r["phone"], "email": r["email"],
             "role": r["role"], "is_active": r["is_active"],
             "last_login_at": r["last_login_at"].isoformat() if r["last_login_at"] else None,
             "created_at": r["created_at"].isoformat() if r["created_at"] else None,
             "clinic_id": str(r["clinic_id"]) if r["clinic_id"] else None,
             "clinic_name": r["clinic_name"], "telegram_chat_id": r["telegram_chat_id"],
             "multi_clinic": bool(r["multi_clinic"])} for r in rows]

@router.post("/staff", status_code=201)
async def create_staff(body: StaffCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    if body.role not in ("doctor", "specialist", "nurse", "receptionist", "admin"):
        raise HTTPException(400, "Invalid role")
    existing = (await db.execute(sql_text("SELECT id FROM staff WHERE phone=:p AND is_active=TRUE"), {"p": body.phone})).mappings().one_or_none()
    if existing: raise HTTPException(409, "Phone already in use")
    # Login uses the PASSWORD. Use the supplied one or generate a temp password to hand over.
    temp_pw = None
    if body.password:
        pw = body.password
    else:
        pw = _generate_temp_password(); temp_pw = pw
    row = (await db.execute(sql_text("""INSERT INTO staff (name, phone, email, role, pin_hash, password_hash, clinic_id, telegram_chat_id, multi_clinic, created_by, is_active)
        VALUES(:n, :p, :e, :r, :pin, :pw, :c, :tg, :mc, :by, TRUE) RETURNING id"""),
        {"n": body.name.strip(), "p": body.phone.strip(), "e": body.email, "r": body.role,
         "pin": _hash_pin(body.pin), "pw": _hash_pin(pw), "c": str(body.clinic_id) if body.clinic_id else None,
         "tg": body.telegram_chat_id, "mc": body.multi_clinic, "by": str(staff["staff_id"])})).mappings().one()
    return {"id": str(row["id"]), "default_pin": body.pin, "temp_password": temp_pw}

@router.patch("/staff/{staff_id}")
async def update_staff(staff_id: UUID, body: StaffUpdate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    sets, params = [], {"i": str(staff_id)}
    for f, v in body.dict(exclude_none=True).items():
        if f == "clinic_id": v = str(v) if v else None
        sets.append(f"{f}=:{f}"); params[f] = v
    if body.is_active is False:
        sets.append("deactivated_at=NOW()"); sets.append("deactivated_by=:by"); params["by"] = str(staff["staff_id"])
    if not sets: return {"updated": False}
    await db.execute(sql_text(f"UPDATE staff SET {','.join(sets)} WHERE id=:i"), params)
    return {"updated": True}

@router.post("/staff/{staff_id}/reset-pin")
async def reset_pin(staff_id: UUID, body: PinReset, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE staff SET pin_hash=:p WHERE id=:i"), {"p": _hash_pin(body.new_pin), "i": str(staff_id)})
    await db.commit()
    return {"reset": True}

@router.post("/staff/{staff_id}/reset-password")
async def reset_password(staff_id: UUID, body: PasswordReset, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Admin resets a staff member's login password (the 'forgot password → contact admin'
    flow). If no password is supplied, a temp one is generated and returned once so the
    admin can hand it over; the staff member changes it later in My Account."""
    _require_admin(staff)
    target = (await db.execute(sql_text("SELECT id FROM staff WHERE id=:i"), {"i": str(staff_id)})).mappings().one_or_none()
    if not target:
        raise HTTPException(404, "Staff not found")
    temp_pw = None
    if body.new_password:
        if len(body.new_password) < 8:
            raise HTTPException(400, "Password must be at least 8 characters")
        pw = body.new_password
    else:
        pw = _generate_temp_password(); temp_pw = pw
    await db.execute(sql_text("UPDATE staff SET password_hash=:p WHERE id=:i"), {"p": _hash_pin(pw), "i": str(staff_id)})
    await db.commit()
    return {"reset": True, "temp_password": temp_pw}

@router.delete("/staff/{staff_id}")
async def deactivate_staff(staff_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    if str(staff_id) == str(staff["staff_id"]):
        raise HTTPException(400, "Cannot deactivate yourself")
    await db.execute(sql_text("UPDATE staff SET is_active=FALSE, deactivated_at=NOW(), deactivated_by=:by WHERE id=:i"),
                     {"by": str(staff["staff_id"]), "i": str(staff_id)})
    return {"deactivated": True}

# ═════════════════════ TREATMENT TEMPLATES ════════════════════════
class TemplateIn(BaseModel):
    name: str; description: Optional[str] = None
    items: List[dict] = Field(default_factory=list)
    clinic_id: Optional[UUID] = None

@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""SELECT id, name, description, items, usage_count
        FROM treatment_templates WHERE is_active=TRUE ORDER BY usage_count DESC, name"""))).mappings().all()
    return [{"id": str(r["id"]), "name": r["name"], "description": r["description"],
             "items": r["items"] or [], "usage_count": r["usage_count"] or 0} for r in rows]

@router.post("/templates", status_code=201)
async def save_template(body: TemplateIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    existing = (await db.execute(sql_text("SELECT id FROM treatment_templates WHERE LOWER(name)=LOWER(:n) AND is_active=TRUE"),
                                 {"n": body.name.strip()})).mappings().one_or_none()
    if existing:
        await db.execute(sql_text("UPDATE treatment_templates SET items=CAST(:i AS JSONB), description=:d WHERE id=:id"),
                         {"i": json.dumps(body.items, default=str), "d": body.description, "id": str(existing["id"])})
        return {"id": str(existing["id"]), "updated": True}
    row = (await db.execute(sql_text("""INSERT INTO treatment_templates (clinic_id, name, description, items, created_by)
        VALUES (:c, :n, :d, CAST(:i AS JSONB), :by) RETURNING id"""),
        {"c": str(body.clinic_id) if body.clinic_id else None, "n": body.name.strip(),
         "d": body.description, "i": json.dumps(body.items, default=str),
         "by": str(staff["staff_id"])})).mappings().one()
    return {"id": str(row["id"]), "created": True}

@router.post("/templates/{template_id}/use")
async def use_template(template_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Increment usage count when template is applied to a plan."""
    await db.execute(sql_text("UPDATE treatment_templates SET usage_count=COALESCE(usage_count,0)+1 WHERE id=:i"), {"i": str(template_id)})
    return {"used": True}

@router.delete("/templates/{template_id}")
async def delete_template(template_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE treatment_templates SET is_active=FALSE WHERE id=:i"), {"i": str(template_id)})
    return {"deleted": True}

# ═════════════════════ GALLERY (WEBSITE IMAGES) ═══════════════════
@router.get("/gallery")
async def list_gallery(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""SELECT id, category, title, caption, image_url, order_idx, uploaded_at
        FROM gallery_images WHERE is_active=TRUE ORDER BY order_idx, uploaded_at DESC"""))).mappings().all()
    return [{"id": str(r["id"]), "category": r["category"], "title": r["title"], "caption": r["caption"],
             "image_url": r["image_url"], "order_idx": r["order_idx"],
             "uploaded_at": r["uploaded_at"].isoformat() if r["uploaded_at"] else None} for r in rows]

@router.post("/gallery", status_code=201)
async def upload_gallery_image(
    file: UploadFile = File(...),
    category: str = Form("general"),
    title: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    clinic_id: Optional[UUID] = Form(None),
    db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)
):
    _require_admin(staff)
    ext = safe_ext(file.filename)
    content = await file.read()
    check_size(content)
    safe_name = f"{secrets.token_hex(8)}{ext}"
    dest = GALLERY_DIR / safe_name
    dest.write_bytes(content)
    image_url = f"/api/site/gallery-image/{safe_name}"
    next_idx = (await db.execute(sql_text("SELECT COALESCE(MAX(order_idx),0)+1 AS n FROM gallery_images WHERE category=:c"),
                                 {"c": category})).mappings().one()["n"]
    row = (await db.execute(sql_text("""INSERT INTO gallery_images (clinic_id, category, title, caption, image_url, order_idx, uploaded_by)
        VALUES (:c, :cat, :t, :cap, :u, :o, :by) RETURNING id"""),
        {"c": str(clinic_id) if clinic_id else None, "cat": category, "t": title, "cap": caption,
         "u": image_url, "o": next_idx, "by": str(staff["staff_id"])})).mappings().one()
    return {"id": str(row["id"]), "image_url": image_url}

class GalleryReorder(BaseModel):
    ordered_ids: List[UUID]
@router.post("/gallery/reorder")
async def reorder_gallery(body: GalleryReorder, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    for idx, gid in enumerate(body.ordered_ids):
        await db.execute(sql_text("UPDATE gallery_images SET order_idx=:o WHERE id=:i"), {"o": idx, "i": str(gid)})
    return {"reordered": True}

@router.delete("/gallery/{image_id}")
async def delete_gallery_image(image_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE gallery_images SET is_active=FALSE WHERE id=:i"), {"i": str(image_id)})
    return {"deleted": True}

# ═════════════════════ WEBSITE CMS (SECTIONS) ═════════════════════
class WebsiteSection(BaseModel):
    section: str; title: Optional[str] = None
    subtitle: Optional[str] = None; body: Optional[str] = None
    image_url: Optional[str] = None; image_url_2: Optional[str] = None
    cta_text: Optional[str] = None; cta_link: Optional[str] = None
    order_idx: int = 0
    metadata: dict = Field(default_factory=dict)
    clinic_id: Optional[UUID] = None

@router.get("/website")
async def website_admin(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""SELECT id, section, title, subtitle, body, image_url, image_url_2,
        cta_text, cta_link, order_idx, metadata, is_active FROM clinic_content
        ORDER BY section, order_idx, created_at"""))).mappings().all()
    return [{"id": str(r["id"]), "section": r["section"], "title": r["title"], "subtitle": r["subtitle"],
             "body": r["body"], "image_url": r["image_url"], "image_url_2": r["image_url_2"],
             "cta_text": r["cta_text"], "cta_link": r["cta_link"], "order_idx": r["order_idx"],
             "metadata": r["metadata"] or {}, "is_active": r["is_active"]} for r in rows]

@router.post("/website", status_code=201)
async def add_section(body: WebsiteSection, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    row = (await db.execute(sql_text("""INSERT INTO clinic_content (clinic_id, section, title, subtitle, body,
        image_url, image_url_2, cta_text, cta_link, order_idx, metadata)
        VALUES (:c, :s, :t, :sub, :b, :i1, :i2, :ct, :cl, :o, CAST(:m AS JSONB)) RETURNING id"""),
        {"c": str(body.clinic_id) if body.clinic_id else None, "s": body.section, "t": body.title,
         "sub": body.subtitle, "b": body.body, "i1": body.image_url, "i2": body.image_url_2,
         "ct": body.cta_text, "cl": body.cta_link, "o": body.order_idx,
         "m": json.dumps(body.metadata, default=str)})).mappings().one()
    return {"id": str(row["id"])}

@router.patch("/website/{section_id}")
async def update_section(section_id: UUID, body: WebsiteSection, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("""UPDATE clinic_content SET title=:t, subtitle=:sub, body=:b,
        image_url=:i1, image_url_2=:i2, cta_text=:ct, cta_link=:cl, order_idx=:o,
        metadata=CAST(:m AS JSONB), updated_at=NOW() WHERE id=:id"""),
        {"t": body.title, "sub": body.subtitle, "b": body.body, "i1": body.image_url,
         "i2": body.image_url_2, "ct": body.cta_text, "cl": body.cta_link, "o": body.order_idx,
         "m": json.dumps(body.metadata, default=str), "id": str(section_id)})
    return {"updated": True}

@router.delete("/website/{section_id}")
async def delete_section(section_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE clinic_content SET is_active=FALSE WHERE id=:i"), {"i": str(section_id)})
    return {"deleted": True}

# ═════════════════════ PUBLIC SITE (no auth) ══════════════════════
@public_router.get("/content")
async def public_content(db: AsyncSession = Depends(get_db)):
    sections = (await db.execute(sql_text("""SELECT section, title, subtitle, body, image_url, image_url_2,
        cta_text, cta_link, order_idx, metadata FROM clinic_content
        WHERE is_active=TRUE ORDER BY order_idx, created_at"""))).mappings().all()
    gallery = (await db.execute(sql_text("""SELECT category, title, caption, image_url
        FROM gallery_images WHERE is_active=TRUE ORDER BY category, order_idx"""))).mappings().all()
    clinics = (await db.execute(sql_text("SELECT name, address, phone FROM clinics WHERE COALESCE(is_active,TRUE)=TRUE"))).mappings().all()
    return {
        "sections": [dict(s) for s in sections],
        "gallery": [dict(g) for g in gallery],
        "clinics": [dict(c) for c in clinics],
    }

@public_router.get("/gallery-image/{filename}")
async def serve_gallery_image(filename: str):
    from fastapi.responses import FileResponse
    # Reject any directory components (../, ..\) — serve only files directly in GALLERY_DIR
    if "/" in filename or "\\" in filename or filename in ("", ".", ".."):
        raise HTTPException(404, "Image not found")
    path = (GALLERY_DIR / filename).resolve()
    if path.parent != GALLERY_DIR.resolve() or not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(path)
