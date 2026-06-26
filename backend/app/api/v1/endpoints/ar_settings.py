"""
backend/app/api/v1/endpoints/ar_settings.py — Bundle T.2

AR (Augmented Reality) Smile Preview settings.
Stores Banuba SDK token, enabled effects, and default parameters.
Public endpoint (no auth) for reading; admin endpoint for updating.
"""
from typing import Optional, List
from uuid import uuid4

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff

ar_public_router = APIRouter(tags=["AR Settings"])
ar_admin_router  = APIRouter(prefix="/ar-settings", tags=["AR Settings Admin"])

# ── Schemas ──

class ARSettingsOut(BaseModel):
    banuba_token: Optional[str] = None
    enabled_effects: List[str] = ["whitening"]
    default_whitening_intensity: int = 60
    braces_style: str = "metal"
    veneer_shade: str = "natural"
    show_alignment_guide: bool = True
    custom_branding_text: Optional[str] = None

class ARSettingsUpdate(BaseModel):
    banuba_token: Optional[str] = None
    enabled_effects: Optional[List[str]] = None
    default_whitening_intensity: Optional[int] = None
    braces_style: Optional[str] = None
    veneer_shade: Optional[str] = None
    show_alignment_guide: Optional[bool] = None
    custom_branding_text: Optional[str] = None


# ── Public: Get AR settings (no auth — used by /public/smile page) ──

@ar_public_router.get("/api/ar-settings")
async def get_ar_settings(db: AsyncSession = Depends(get_db)):
    """Return AR settings for the smile preview page. No auth required."""
    row = await db.execute(sql_text(
        "SELECT banuba_token, enabled_effects, default_whitening_intensity, "
        "braces_style, veneer_shade, show_alignment_guide, custom_branding_text "
        "FROM ar_preview_settings LIMIT 1"
    ))
    r = row.mappings().first()
    if not r:
        return ARSettingsOut()  # defaults

    # Only expose token existence, not the actual token, for public endpoint
    has_token = bool(r["banuba_token"])
    return {
        "banuba_token": r["banuba_token"] if has_token else None,  # actual token needed for SDK init
        "enabled_effects": r["enabled_effects"] or ["whitening"],
        "default_whitening_intensity": r["default_whitening_intensity"] or 60,
        "braces_style": r["braces_style"] or "metal",
        "veneer_shade": r["veneer_shade"] or "natural",
        "show_alignment_guide": r["show_alignment_guide"] if r["show_alignment_guide"] is not None else True,
        "custom_branding_text": r["custom_branding_text"],
    }


# ── Admin: Update AR settings ──

@ar_admin_router.put("")
async def update_ar_settings(
    body: ARSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Update AR preview settings. Doctor/admin only."""
    # Check if row exists
    exists = await db.execute(sql_text("SELECT id FROM ar_preview_settings LIMIT 1"))
    row = exists.scalars().first()

    updates = {}
    if body.banuba_token is not None:
        updates["banuba_token"] = body.banuba_token
    if body.enabled_effects is not None:
        updates["enabled_effects"] = body.enabled_effects
    if body.default_whitening_intensity is not None:
        updates["default_whitening_intensity"] = body.default_whitening_intensity
    if body.braces_style is not None:
        updates["braces_style"] = body.braces_style
    if body.veneer_shade is not None:
        updates["veneer_shade"] = body.veneer_shade
    if body.show_alignment_guide is not None:
        updates["show_alignment_guide"] = body.show_alignment_guide
    if body.custom_branding_text is not None:
        updates["custom_branding_text"] = body.custom_branding_text

    if not updates:
        raise HTTPException(400, "No fields to update")

    if row:
        # Update existing
        set_parts = ", ".join(f"{k} = :{k}" for k in updates)
        await db.execute(
            sql_text(f"UPDATE ar_preview_settings SET {set_parts}, updated_at = NOW() WHERE id = :id"),
            {**updates, "id": row},
        )
    else:
        # Insert new
        updates.setdefault("banuba_token", None)
        updates.setdefault("enabled_effects", ["whitening"])
        updates.setdefault("default_whitening_intensity", 60)
        updates.setdefault("braces_style", "metal")
        updates.setdefault("veneer_shade", "natural")
        updates.setdefault("show_alignment_guide", True)
        updates.setdefault("custom_branding_text", None)
        await db.execute(
            sql_text(
                "INSERT INTO ar_preview_settings (id, banuba_token, enabled_effects, "
                "default_whitening_intensity, braces_style, veneer_shade, show_alignment_guide, "
                "custom_branding_text) VALUES (:id, :banuba_token, :enabled_effects, "
                ":default_whitening_intensity, :braces_style, :veneer_shade, :show_alignment_guide, "
                ":custom_branding_text)"
            ),
            {"id": str(uuid4()), **updates},
        )

    await db.commit()
    return {"status": "ok"}
