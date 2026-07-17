"""
Sprint A5 — Website Manager endpoints.
Adds admin CRUD for:
- clinic public info (Google Maps, Street View, hours, theme)
- site_videos (admin-managed videos with YouTube auto-embed)
- site_doctors (public bios)
- site_testimonials (reviews/quotes)
- site_services (treatments shown on public site)
- site_theme (logo, colors, social links)

Mount in main.py:
    from app.api.v1.endpoints.website import router as website_router, public_router as website_public_router
    app.include_router(website_router, prefix="/api")
    app.include_router(website_public_router, prefix="/api")

All admin endpoints require an authenticated staff with role='doctor' or 'admin'.
"""
import re
import json
import hashlib
from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff

router = APIRouter(prefix="/admin/website-mgr", tags=["Website Manager"])
public_router = APIRouter(prefix="/site-2026", tags=["Public Site 2026"])


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════
def _require_admin(staff):
    if not staff or staff.get("role") not in ("doctor", "admin"):
        raise HTTPException(403, "Admin / doctor access required")


def _extract_youtube_id(url: str) -> Optional[str]:
    """Extract video id from various YouTube URL formats."""
    if not url:
        return None
    # https://youtu.be/<id>
    m = re.search(r"youtu\.be/([A-Za-z0-9_\-]{6,15})", url)
    if m: return m.group(1)
    # https://www.youtube.com/watch?v=<id>
    m = re.search(r"[?&]v=([A-Za-z0-9_\-]{6,15})", url)
    if m: return m.group(1)
    # https://www.youtube.com/embed/<id>
    m = re.search(r"youtube\.com/embed/([A-Za-z0-9_\-]{6,15})", url)
    if m: return m.group(1)
    return None


# ════════════════════════════════════════════════════════════════════
# Schemas
# ════════════════════════════════════════════════════════════════════
class ClinicPublicInfoIn(BaseModel):
    tagline: Optional[str] = None
    google_place_id: Optional[str] = None
    google_maps_embed_url: Optional[str] = None
    street_view_embed_url: Optional[str] = None
    directions_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hero_image_url: Optional[str] = None
    theme_color: Optional[str] = None
    public_phone: Optional[str] = None
    whatsapp_link: Optional[str] = None
    show_on_public_site: Optional[bool] = True
    display_order: Optional[int] = 0


class VideoIn(BaseModel):
    clinic_id: Optional[UUID] = None
    category: str = "general"
    title: Optional[str] = None
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    autoplay: bool = False
    loop_video: bool = False
    order_idx: int = 0


class DoctorIn(BaseModel):
    staff_id: Optional[UUID] = None
    display_name: str
    qualification: Optional[str] = None
    designation: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    years_experience: Optional[int] = None
    specializations: List[str] = Field(default_factory=list)
    show_on_public_site: bool = True
    order_idx: int = 0


class TestimonialIn(BaseModel):
    patient_name: str
    patient_photo_url: Optional[str] = None
    rating: int = Field(default=5, ge=1, le=5)
    text: str
    treatment_type: Optional[str] = None
    source: str = "manual"
    is_featured: bool = False
    order_idx: int = 0


class ServiceIn(BaseModel):
    name: str
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    icon_emoji: str = "🦷"
    icon_image_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    price_starting_from: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_featured: bool = False
    order_idx: int = 0


class ThemeIn(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    dark_bg: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    site_title: Optional[str] = None
    site_tagline: Optional[str] = None
    meta_description: Optional[str] = None
    google_analytics_id: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    twitter_url: Optional[str] = None
    google_reviews_url: Optional[str] = None
    google_rating: Optional[str] = None
    google_review_count: Optional[str] = None


class PublicVisitIn(BaseModel):
    visitor_id: UUID


# ════════════════════════════════════════════════════════════════════
# ADMIN — Clinic public info
# ════════════════════════════════════════════════════════════════════
@router.get("/clinics")
async def list_clinics_admin(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """All clinics with public-website fields. Used by the Website Manager UI."""
    rows = (await db.execute(sql_text("""
        SELECT id, name, short_name, address, phone, whatsapp_number, tagline, google_place_id,
               google_maps_embed_url, street_view_embed_url, directions_url,
               latitude, longitude, hero_image_url, theme_color, public_phone,
               whatsapp_link, show_on_public_site, display_order, logo_url
        FROM clinics ORDER BY display_order, name
    """))).mappings().all()
    return [dict(r) | {"id": str(r["id"])} for r in rows]


@router.patch("/clinics/{clinic_id}")
async def update_clinic_public(clinic_id: UUID, body: ClinicPublicInfoIn,
                                db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        return {"ok": True, "updated": 0}
    set_clause = ", ".join(f"{k} = :{k}" for k in fields.keys())
    params = {**fields, "id": str(clinic_id)}
    await db.execute(sql_text(f"UPDATE clinics SET {set_clause}, updated_at=NOW() WHERE id = :id"), params)
    await db.commit()
    return {"ok": True, "updated": len(fields)}


# ════════════════════════════════════════════════════════════════════
# ADMIN — Videos
# ════════════════════════════════════════════════════════════════════
@router.get("/videos")
async def list_videos(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT id, clinic_id, category, title, caption, video_url, thumbnail_url,
               is_youtube, youtube_id, autoplay, loop_video, order_idx, is_active
        FROM site_videos ORDER BY category, order_idx
    """))).mappings().all()
    return [dict(r) | {"id": str(r["id"]),
                       "clinic_id": str(r["clinic_id"]) if r["clinic_id"] else None} for r in rows]


@router.post("/videos", status_code=201)
async def add_video(body: VideoIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    yid = _extract_youtube_id(body.video_url)
    is_yt = yid is not None
    row = (await db.execute(sql_text("""
        INSERT INTO site_videos (clinic_id, category, title, caption, video_url, thumbnail_url,
                                 is_youtube, youtube_id, autoplay, loop_video, order_idx, uploaded_by)
        VALUES (:c, :cat, :t, :cap, :v, :th, :iy, :yid, :ap, :lp, :o, :ub)
        RETURNING id
    """), {
        "c": str(body.clinic_id) if body.clinic_id else None,
        "cat": body.category, "t": body.title, "cap": body.caption,
        "v": body.video_url,
        "th": body.thumbnail_url or (f"https://img.youtube.com/vi/{yid}/maxresdefault.jpg" if yid else None),
        "iy": is_yt, "yid": yid,
        "ap": body.autoplay, "lp": body.loop_video, "o": body.order_idx,
        "ub": staff.get("staff_id") if staff else None,
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"]), "is_youtube": is_yt, "youtube_id": yid}


@router.patch("/videos/{video_id}")
async def update_video(video_id: UUID, body: VideoIn,
                        db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    yid = _extract_youtube_id(body.video_url)
    await db.execute(sql_text("""
        UPDATE site_videos SET clinic_id=:c, category=:cat, title=:t, caption=:cap,
               video_url=:v, thumbnail_url=:th, is_youtube=:iy, youtube_id=:yid,
               autoplay=:ap, loop_video=:lp, order_idx=:o
         WHERE id = :id
    """), {
        "id": str(video_id),
        "c": str(body.clinic_id) if body.clinic_id else None,
        "cat": body.category, "t": body.title, "cap": body.caption,
        "v": body.video_url, "th": body.thumbnail_url, "iy": yid is not None, "yid": yid,
        "ap": body.autoplay, "lp": body.loop_video, "o": body.order_idx,
    })
    await db.commit()
    return {"ok": True}


@router.delete("/videos/{video_id}")
async def delete_video(video_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE site_videos SET is_active=FALSE WHERE id=:id"), {"id": str(video_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# ADMIN — Doctors
# ════════════════════════════════════════════════════════════════════
@router.get("/doctors")
async def list_doctors(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT id, staff_id, display_name, qualification, designation, bio, photo_url,
               years_experience, specializations, show_on_public_site, order_idx
        FROM site_doctors ORDER BY order_idx, display_name
    """))).mappings().all()
    return [dict(r) | {"id": str(r["id"]),
                       "staff_id": str(r["staff_id"]) if r["staff_id"] else None} for r in rows]


@router.post("/doctors", status_code=201)
async def add_doctor(body: DoctorIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    row = (await db.execute(sql_text("""
        INSERT INTO site_doctors (staff_id, display_name, qualification, designation, bio, photo_url,
                                  years_experience, specializations, show_on_public_site, order_idx)
        VALUES (:s, :n, :q, :d, :b, :p, :y, CAST(:sp AS JSONB), :sh, :o)
        RETURNING id
    """), {
        "s": str(body.staff_id) if body.staff_id else None,
        "n": body.display_name, "q": body.qualification, "d": body.designation, "b": body.bio,
        "p": body.photo_url, "y": body.years_experience,
        "sp": json.dumps(body.specializations), "sh": body.show_on_public_site, "o": body.order_idx,
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.patch("/doctors/{doc_id}")
async def update_doctor(doc_id: UUID, body: DoctorIn,
                         db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("""
        UPDATE site_doctors SET staff_id=:s, display_name=:n, qualification=:q, designation=:d,
               bio=:b, photo_url=:p, years_experience=:y, specializations=CAST(:sp AS JSONB),
               show_on_public_site=:sh, order_idx=:o, updated_at=NOW()
         WHERE id=:id
    """), {
        "id": str(doc_id),
        "s": str(body.staff_id) if body.staff_id else None,
        "n": body.display_name, "q": body.qualification, "d": body.designation, "b": body.bio,
        "p": body.photo_url, "y": body.years_experience,
        "sp": json.dumps(body.specializations), "sh": body.show_on_public_site, "o": body.order_idx,
    })
    await db.commit()
    return {"ok": True}


@router.delete("/doctors/{doc_id}")
async def delete_doctor(doc_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("DELETE FROM site_doctors WHERE id=:id"), {"id": str(doc_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# ADMIN — Testimonials
# ════════════════════════════════════════════════════════════════════
@router.get("/testimonials")
async def list_testimonials(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT id, patient_name, patient_photo_url, rating, text, treatment_type,
               source, is_featured, is_active, order_idx
        FROM site_testimonials ORDER BY is_featured DESC, order_idx
    """))).mappings().all()
    return [dict(r) | {"id": str(r["id"])} for r in rows]


@router.post("/testimonials", status_code=201)
async def add_testimonial(body: TestimonialIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    row = (await db.execute(sql_text("""
        INSERT INTO site_testimonials (patient_name, patient_photo_url, rating, text, treatment_type,
                                       source, is_featured, order_idx)
        VALUES (:n, :p, :r, :t, :tt, :src, :f, :o)
        RETURNING id
    """), {"n": body.patient_name, "p": body.patient_photo_url, "r": body.rating, "t": body.text,
           "tt": body.treatment_type, "src": body.source, "f": body.is_featured, "o": body.order_idx})).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.patch("/testimonials/{t_id}")
async def update_testimonial(t_id: UUID, body: TestimonialIn,
                              db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("""
        UPDATE site_testimonials SET patient_name=:n, patient_photo_url=:p, rating=:r, text=:t,
               treatment_type=:tt, source=:src, is_featured=:f, order_idx=:o
         WHERE id=:id
    """), {"id": str(t_id), "n": body.patient_name, "p": body.patient_photo_url, "r": body.rating,
           "t": body.text, "tt": body.treatment_type, "src": body.source,
           "f": body.is_featured, "o": body.order_idx})
    await db.commit()
    return {"ok": True}


@router.delete("/testimonials/{t_id}")
async def delete_testimonial(t_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE site_testimonials SET is_active=FALSE WHERE id=:id"), {"id": str(t_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# ADMIN — Services
# ════════════════════════════════════════════════════════════════════
@router.get("/services")
async def list_services(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT id, name, short_description, full_description, icon_emoji, icon_image_url,
               hero_image_url, cta_text, cta_link, price_starting_from, duration_minutes,
               is_featured, is_active, order_idx
        FROM site_services ORDER BY order_idx, name
    """))).mappings().all()
    return [dict(r) | {"id": str(r["id"]),
                       "price_starting_from": float(r["price_starting_from"]) if r["price_starting_from"] else None}
            for r in rows]


@router.post("/services", status_code=201)
async def add_service(body: ServiceIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    row = (await db.execute(sql_text("""
        INSERT INTO site_services (name, short_description, full_description, icon_emoji, icon_image_url,
                                   hero_image_url, cta_text, cta_link, price_starting_from, duration_minutes,
                                   is_featured, order_idx)
        VALUES (:n, :sd, :fd, :ie, :ii, :hi, :ct, :cl, :pr, :du, :f, :o)
        RETURNING id
    """), {"n": body.name, "sd": body.short_description, "fd": body.full_description,
           "ie": body.icon_emoji, "ii": body.icon_image_url, "hi": body.hero_image_url,
           "ct": body.cta_text, "cl": body.cta_link, "pr": body.price_starting_from,
           "du": body.duration_minutes, "f": body.is_featured, "o": body.order_idx})).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.patch("/services/{s_id}")
async def update_service(s_id: UUID, body: ServiceIn,
                          db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("""
        UPDATE site_services SET name=:n, short_description=:sd, full_description=:fd,
               icon_emoji=:ie, icon_image_url=:ii, hero_image_url=:hi, cta_text=:ct, cta_link=:cl,
               price_starting_from=:pr, duration_minutes=:du, is_featured=:f, order_idx=:o
         WHERE id=:id
    """), {"id": str(s_id), "n": body.name, "sd": body.short_description, "fd": body.full_description,
           "ie": body.icon_emoji, "ii": body.icon_image_url, "hi": body.hero_image_url,
           "ct": body.cta_text, "cl": body.cta_link, "pr": body.price_starting_from,
           "du": body.duration_minutes, "f": body.is_featured, "o": body.order_idx})
    await db.commit()
    return {"ok": True}


@router.delete("/services/{s_id}")
async def delete_service(s_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    await db.execute(sql_text("UPDATE site_services SET is_active=FALSE WHERE id=:id"), {"id": str(s_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# ADMIN — Theme (single-row)
# ════════════════════════════════════════════════════════════════════
@router.get("/theme")
async def get_theme(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text("SELECT * FROM site_theme WHERE id = 1"))).mappings().one_or_none()
    return dict(row) if row else {}


@router.patch("/theme")
async def update_theme(body: ThemeIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_admin(staff)
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        return {"ok": True, "updated": 0}
    set_clause = ", ".join(f"{k} = :{k}" for k in fields.keys())
    await db.execute(sql_text(f"UPDATE site_theme SET {set_clause}, updated_at=NOW() WHERE id = 1"), fields)
    await db.commit()
    return {"ok": True, "updated": len(fields)}


# ════════════════════════════════════════════════════════════════════
# PUBLIC — single endpoint returning the entire site payload
# ════════════════════════════════════════════════════════════════════
@public_router.get("/content")
async def public_site_2026(db: AsyncSession = Depends(get_db)):
    """One-shot payload for the public 2026 website."""
    theme = (await db.execute(sql_text("SELECT * FROM site_theme WHERE id=1"))).mappings().one_or_none()
    clinics = (await db.execute(sql_text("""
        SELECT id, name, short_name, address, public_phone, phone, whatsapp_number, whatsapp_link,
               tagline, google_maps_embed_url, street_view_embed_url, directions_url,
               latitude, longitude, hero_image_url, theme_color, logo_url, timings
        FROM clinics
        WHERE show_on_public_site = TRUE AND COALESCE(is_active, TRUE) = TRUE
        ORDER BY display_order, name
    """))).mappings().all()
    services = (await db.execute(sql_text("""
        SELECT id, name, short_description, full_description, icon_emoji, icon_image_url,
               hero_image_url, cta_text, cta_link, price_starting_from, duration_minutes, is_featured
        FROM site_services WHERE is_active = TRUE ORDER BY is_featured DESC, order_idx
    """))).mappings().all()
    doctors = (await db.execute(sql_text("""
        SELECT id, display_name, qualification, designation, bio, photo_url,
               years_experience, specializations
        FROM site_doctors WHERE show_on_public_site = TRUE ORDER BY order_idx
    """))).mappings().all()
    testimonials = (await db.execute(sql_text("""
        SELECT id, patient_name, patient_photo_url, rating, text, treatment_type, source, is_featured,
               google_review_url, google_author_url, google_flag_url,
               google_publish_time, google_synced_at
        FROM site_testimonials
        WHERE is_active = TRUE
          AND rating >= 4
          AND NULLIF(BTRIM(COALESCE(text, '')), '') IS NOT NULL
        ORDER BY is_featured DESC, order_idx
    """))).mappings().all()
    videos = (await db.execute(sql_text("""
        SELECT id, clinic_id, category, title, caption, video_url, thumbnail_url,
               is_youtube, youtube_id, autoplay, loop_video
        FROM site_videos WHERE is_active = TRUE ORDER BY category, order_idx
    """))).mappings().all()
    # Existing tables — keep for back-compat
    sections = (await db.execute(sql_text("""
        SELECT section, title, subtitle, body, image_url, image_url_2, cta_text, cta_link, order_idx, metadata
        FROM clinic_content WHERE is_active=TRUE ORDER BY order_idx, created_at
    """))).mappings().all()
    gallery = (await db.execute(sql_text("""
        SELECT category, title, caption, image_url FROM gallery_images
        WHERE is_active=TRUE ORDER BY category, order_idx
    """))).mappings().all()
    visitor_stats = (await db.execute(sql_text("""
        SELECT
            COUNT(DISTINCT visitor_hash) AS total,
            COUNT(DISTINCT visitor_hash) FILTER (WHERE visit_date = CURRENT_DATE) AS today
        FROM public_site_visitor_days
    """))).mappings().one()
    return {
        "theme": dict(theme) if theme else {},
        "clinics": [dict(c) | {"id": str(c["id"])} for c in clinics],
        "services": [dict(s) | {"id": str(s["id"]),
                                "price_starting_from": float(s["price_starting_from"]) if s["price_starting_from"] else None}
                     for s in services],
        "doctors": [dict(d) | {"id": str(d["id"])} for d in doctors],
        "testimonials": [dict(t) | {"id": str(t["id"])} for t in testimonials],
        "videos": [dict(v) | {"id": str(v["id"]),
                              "clinic_id": str(v["clinic_id"]) if v["clinic_id"] else None}
                   for v in videos],
        "sections": [dict(s) for s in sections],
        "gallery": [dict(g) for g in gallery],
        "visitors": {
            "total": int(visitor_stats["total"] or 0),
            "today": int(visitor_stats["today"] or 0),
        },
    }


@public_router.post("/visit")
async def record_public_visit(body: PublicVisitIn, db: AsyncSession = Depends(get_db)):
    """Count one browser once per day without retaining its raw identifier or IP."""
    from app.core.config import get_settings

    secret = get_settings().SECRET_KEY
    visitor_hash = hashlib.sha256(f"{secret}:{body.visitor_id}".encode("utf-8")).hexdigest()
    await db.execute(sql_text("""
        INSERT INTO public_site_visitor_days (visitor_hash, visit_date)
        VALUES (:visitor_hash, CURRENT_DATE)
        ON CONFLICT (visitor_hash, visit_date) DO UPDATE SET
            last_seen_at = now(),
            page_views = public_site_visitor_days.page_views + 1
    """), {"visitor_hash": visitor_hash})
    stats = (await db.execute(sql_text("""
        SELECT
            COUNT(DISTINCT visitor_hash) AS total,
            COUNT(DISTINCT visitor_hash) FILTER (WHERE visit_date = CURRENT_DATE) AS today
        FROM public_site_visitor_days
    """))).mappings().one()
    return {
        "total": int(stats["total"] or 0),
        "today": int(stats["today"] or 0),
    }
