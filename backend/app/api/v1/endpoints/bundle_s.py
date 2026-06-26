"""
backend/app/api/v1/endpoints/bundle_s.py — Siya Dental Bundle S

Endpoint families:
  1. /clinic-info/*        — extended clinic info (logo, GST, branding)
  2. /business-hours/*     — per-day hours + holidays
  3. /service-catalog/*    — procedures with default duration + price
  4. /fee-overrides/*      — seasonal/promo price overrides
  5. /kanban/*             — kanban columns + plan reordering
  6. /illnesses/*          — diagnosis library
"""
from datetime import date as date_type, time as time_type
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff

clinic_info_router    = APIRouter(prefix="/clinic-info",     tags=["Clinic Info"])
hours_router          = APIRouter(prefix="/business-hours",  tags=["Business Hours"])
catalog_router        = APIRouter(prefix="/service-catalog", tags=["Service Catalog"])
fee_router            = APIRouter(prefix="/fee-overrides",   tags=["Fee Overrides"])
kanban_router         = APIRouter(prefix="/kanban",          tags=["Treatment Kanban"])
illness_router        = APIRouter(prefix="/illnesses",       tags=["Illness Library"])


# ═══════════════════════════════════════════════════════════════════════════
# 1. CLINIC INFO EXT
# ═══════════════════════════════════════════════════════════════════════════
class ClinicInfoUpdate(BaseModel):
    logo_url: Optional[str] = None
    letterhead_url: Optional[str] = None
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    establishment_year: Optional[int] = None
    tagline: Optional[str] = None
    primary_doctor_name: Optional[str] = None
    primary_doctor_qual: Optional[str] = None
    primary_doctor_reg: Optional[str] = None
    accent_color: Optional[str] = None
    secondary_color: Optional[str] = None
    rx_language: Optional[str] = None
    rx_format: Optional[str] = None
    rx_show_qr: Optional[bool] = None
    rx_footer_text: Optional[str] = None
    public_about: Optional[str] = None
    public_emergency_msg: Optional[str] = None
    socials: Optional[dict] = None


@clinic_info_router.get("/{clinic_id}")
async def get_clinic_info(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text("""
        SELECT ci.*, c.name AS clinic_name, c.address, c.phone
        FROM clinic_info_ext ci
        LEFT JOIN clinics c ON c.id = ci.clinic_id
        WHERE ci.clinic_id = :cid
    """), {"cid": str(clinic_id)})).mappings().one_or_none()
    if not row:
        await db.execute(sql_text("INSERT INTO clinic_info_ext (clinic_id) VALUES (:cid) ON CONFLICT DO NOTHING"),
                         {"cid": str(clinic_id)})
        return await get_clinic_info(clinic_id, db, staff)
    d = dict(row)
    d["clinic_id"] = str(d["clinic_id"])
    if d.get("updated_by"): d["updated_by"] = str(d["updated_by"])
    if d.get("updated_at"): d["updated_at"] = d["updated_at"].isoformat()
    return d


@clinic_info_router.patch("/{clinic_id}")
async def update_clinic_info(clinic_id: UUID, body: ClinicInfoUpdate,
                              db: AsyncSession = Depends(get_db),
                              staff=Depends(get_current_staff)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Nothing to update")
    await db.execute(sql_text("INSERT INTO clinic_info_ext (clinic_id) VALUES (:cid) ON CONFLICT DO NOTHING"),
                     {"cid": str(clinic_id)})
    sets, params = [], {"cid": str(clinic_id)}
    for k, v in data.items():
        if k == "socials":
            sets.append("socials = CAST(:socials AS JSONB)")
            import json
            params["socials"] = json.dumps(v)
        else:
            sets.append(f"{k} = :{k}"); params[k] = v
    sets.append("updated_at = NOW()")
    sets.append("updated_by = :ub")
    params["ub"] = str(staff["staff_id"]) if staff and staff.get("staff_id") else None
    await db.execute(sql_text(f"UPDATE clinic_info_ext SET {', '.join(sets)} WHERE clinic_id = :cid"), params)
    return {"updated": True}


# ═══════════════════════════════════════════════════════════════════════════
# 2. BUSINESS HOURS + HOLIDAYS
# ═══════════════════════════════════════════════════════════════════════════
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@hours_router.get("/{clinic_id}")
async def get_business_hours(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                              staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT * FROM business_hours WHERE clinic_id = :cid ORDER BY weekday
    """), {"cid": str(clinic_id)})).mappings().all()
    days = []
    for wd in range(7):
        match = next((dict(r) for r in rows if r["weekday"] == wd), None)
        if not match:
            days.append({"weekday": wd, "weekday_name": WEEKDAYS[wd], "is_closed": False,
                         "open_time": "09:00", "close_time": "19:00"})
        else:
            days.append({
                "weekday": wd, "weekday_name": WEEKDAYS[wd],
                "is_closed": match["is_closed"],
                "open_time":   match["open_time"].strftime("%H:%M") if match.get("open_time") else None,
                "close_time":  match["close_time"].strftime("%H:%M") if match.get("close_time") else None,
                "break_start": match["break_start"].strftime("%H:%M") if match.get("break_start") else None,
                "break_end":   match["break_end"].strftime("%H:%M") if match.get("break_end") else None,
            })
    return {"clinic_id": str(clinic_id), "days": days}


class BusinessHourUpdate(BaseModel):
    weekday: int = Field(..., ge=0, le=6)
    is_closed: bool = False
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None


@hours_router.put("/{clinic_id}")
async def update_business_hours(clinic_id: UUID, body: List[BusinessHourUpdate],
                                 db: AsyncSession = Depends(get_db),
                                 staff=Depends(get_current_staff)):
    for h in body:
        await db.execute(sql_text("""
            INSERT INTO business_hours (clinic_id, weekday, is_closed,
                open_time, close_time, break_start, break_end)
            VALUES (:cid, :wd, :cl, :ot, :ct, :bs, :be)
            ON CONFLICT (clinic_id, weekday) DO UPDATE SET
                is_closed = EXCLUDED.is_closed,
                open_time = EXCLUDED.open_time,
                close_time = EXCLUDED.close_time,
                break_start = EXCLUDED.break_start,
                break_end = EXCLUDED.break_end
        """), {
            "cid": str(clinic_id), "wd": h.weekday, "cl": h.is_closed,
            "ot": h.open_time, "ct": h.close_time,
            "bs": h.break_start, "be": h.break_end,
        })
    return {"saved": True}


@hours_router.get("/{clinic_id}/holidays")
async def list_holidays(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                         staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT * FROM clinic_holidays WHERE clinic_id = :cid
          AND (holiday_date >= CURRENT_DATE - INTERVAL '30 days' OR is_recurring = TRUE)
        ORDER BY holiday_date
    """), {"cid": str(clinic_id)})).mappings().all()
    return {"holidays": [{
        "id": str(r["id"]),
        "holiday_date": r["holiday_date"].isoformat(),
        "reason": r["reason"],
        "is_recurring": r["is_recurring"],
    } for r in rows]}


class HolidayIn(BaseModel):
    holiday_date: date_type
    reason: str
    is_recurring: bool = False


@hours_router.post("/{clinic_id}/holidays")
async def add_holiday(clinic_id: UUID, body: HolidayIn,
                       db: AsyncSession = Depends(get_db),
                       staff=Depends(get_current_staff)):
    h_id = str(uuid4())
    await db.execute(sql_text("""
        INSERT INTO clinic_holidays (id, clinic_id, holiday_date, reason, is_recurring)
        VALUES (:id, :cid, :d, :r, :rec)
        ON CONFLICT (clinic_id, holiday_date) DO UPDATE SET
            reason = EXCLUDED.reason, is_recurring = EXCLUDED.is_recurring
    """), {"id": h_id, "cid": str(clinic_id), "d": body.holiday_date,
           "r": body.reason, "rec": body.is_recurring})
    return {"id": h_id, "added": True}


@hours_router.delete("/{clinic_id}/holidays/{holiday_id}")
async def remove_holiday(clinic_id: UUID, holiday_id: UUID,
                          db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    await db.execute(sql_text("DELETE FROM clinic_holidays WHERE id = :id AND clinic_id = :cid"),
                     {"id": str(holiday_id), "cid": str(clinic_id)})
    return {"deleted": True}


# ═══════════════════════════════════════════════════════════════════════════
# 3. SERVICE CATALOG
# ═══════════════════════════════════════════════════════════════════════════
class ServiceIn(BaseModel):
    clinic_id: UUID
    category: str
    name: str
    code: Optional[str] = None
    default_duration_min: int = 30
    default_price: Optional[float] = None
    description: Optional[str] = None
    requires_lab: bool = False
    requires_specialist: bool = False
    typical_sittings: int = 1


@catalog_router.get("")
async def list_services(clinic_id: UUID, category: Optional[str] = None,
                        db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    where = ["clinic_id = :cid", "is_active = TRUE"]
    params: Dict[str, Any] = {"cid": str(clinic_id)}
    if category:
        where.append("category = :cat"); params["cat"] = category
    rows = (await db.execute(sql_text(f"""
        SELECT * FROM service_catalog WHERE {' AND '.join(where)}
        ORDER BY category, name
    """), params)).mappings().all()
    services = [{
        "id": str(r["id"]), "category": r["category"], "name": r["name"], "code": r["code"],
        "default_duration_min": r["default_duration_min"],
        "default_price": float(r["default_price"]) if r["default_price"] else None,
        "description": r["description"],
        "requires_lab": r["requires_lab"],
        "requires_specialist": r["requires_specialist"],
        "typical_sittings": r["typical_sittings"],
    } for r in rows]
    return {"services": services, "categories": sorted({s["category"] for s in services})}


@catalog_router.post("")
async def upsert_service(body: ServiceIn, db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    sid = str(uuid4())
    await db.execute(sql_text("""
        INSERT INTO service_catalog
            (id, clinic_id, category, name, code, default_duration_min, default_price,
             description, requires_lab, requires_specialist, typical_sittings)
        VALUES (:id, :cid, :cat, :n, :code, :dur, :price, :desc, :lab, :spec, :sit)
        ON CONFLICT (clinic_id, name) DO UPDATE SET
            category = EXCLUDED.category, code = EXCLUDED.code,
            default_duration_min = EXCLUDED.default_duration_min,
            default_price = EXCLUDED.default_price,
            description = EXCLUDED.description,
            requires_lab = EXCLUDED.requires_lab,
            requires_specialist = EXCLUDED.requires_specialist,
            typical_sittings = EXCLUDED.typical_sittings
    """), {
        "id": sid, "cid": str(body.clinic_id), "cat": body.category,
        "n": body.name, "code": body.code, "dur": body.default_duration_min,
        "price": body.default_price, "desc": body.description,
        "lab": body.requires_lab, "spec": body.requires_specialist,
        "sit": body.typical_sittings,
    })
    return {"saved": True, "id": sid}


@catalog_router.delete("/{service_id}")
async def remove_service(service_id: UUID, db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE service_catalog SET is_active = FALSE WHERE id = :id"),
                     {"id": str(service_id)})
    return {"deactivated": True}


# ═══════════════════════════════════════════════════════════════════════════
# 4. FEE OVERRIDES
# ═══════════════════════════════════════════════════════════════════════════
@fee_router.get("")
async def list_overrides(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT fo.*, sc.name AS service_name FROM fee_schedule_overrides fo
        LEFT JOIN service_catalog sc ON sc.id = fo.service_id
        WHERE fo.clinic_id = :cid AND fo.is_active = TRUE
        ORDER BY fo.valid_from DESC NULLS LAST
    """), {"cid": str(clinic_id)})).mappings().all()
    return {"overrides": [{
        "id": str(r["id"]),
        "service_id": str(r["service_id"]) if r["service_id"] else None,
        "service_name": r["service_name"],
        "category": r["category"],
        "label": r["label"],
        "override_price": float(r["override_price"]) if r["override_price"] else None,
        "discount_percent": float(r["discount_percent"]) if r["discount_percent"] else None,
        "valid_from": r["valid_from"].isoformat() if r["valid_from"] else None,
        "valid_until": r["valid_until"].isoformat() if r["valid_until"] else None,
    } for r in rows]}


class OverrideIn(BaseModel):
    clinic_id: UUID
    service_id: Optional[UUID] = None
    category: Optional[str] = None
    label: str
    override_price: Optional[float] = None
    discount_percent: Optional[float] = None
    valid_from: Optional[date_type] = None
    valid_until: Optional[date_type] = None


@fee_router.post("")
async def add_override(body: OverrideIn, db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    oid = str(uuid4())
    await db.execute(sql_text("""
        INSERT INTO fee_schedule_overrides
            (id, clinic_id, service_id, category, label, override_price,
             discount_percent, valid_from, valid_until)
        VALUES (:id, :cid, :sid, :cat, :lab, :p, :dp, :vf, :vu)
    """), {
        "id": oid, "cid": str(body.clinic_id),
        "sid": str(body.service_id) if body.service_id else None,
        "cat": body.category, "lab": body.label,
        "p": body.override_price, "dp": body.discount_percent,
        "vf": body.valid_from, "vu": body.valid_until,
    })
    return {"id": oid, "saved": True}


@fee_router.delete("/{override_id}")
async def remove_override(override_id: UUID, db: AsyncSession = Depends(get_db),
                           staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE fee_schedule_overrides SET is_active = FALSE WHERE id = :id"),
                     {"id": str(override_id)})
    return {"deactivated": True}


# ═══════════════════════════════════════════════════════════════════════════
# 5. KANBAN
# ═══════════════════════════════════════════════════════════════════════════
@kanban_router.get("/columns")
async def list_columns(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT * FROM kanban_columns WHERE clinic_id = :cid AND is_active = TRUE
        ORDER BY column_order
    """), {"cid": str(clinic_id)})).mappings().all()
    return {"columns": [{
        "id": str(r["id"]),
        "label": r["label"],
        "plan_status": r["plan_status"],
        "column_order": r["column_order"],
        "color": r["color"],
    } for r in rows]}


@kanban_router.get("/plans")
async def kanban_plans(clinic_id: UUID, doctor_id: Optional[UUID] = None,
                        days_back: int = Query(60, ge=1, le=365),
                        db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    """Returns all treatment plans grouped by status for kanban view."""
    where = ["tp.clinic_id = :cid",
             "tp.created_at >= NOW() - INTERVAL '1 day' * :db"]
    params: Dict[str, Any] = {"cid": str(clinic_id), "db": days_back}
    if doctor_id:
        where.append("tp.doctor_id = :did"); params["did"] = str(doctor_id)

    plans = (await db.execute(sql_text(f"""
        SELECT tp.id, tp.patient_id, tp.doctor_id, tp.name AS title,
               CASE
                   WHEN tp.status = 'new' THEN 'proposed'
                   WHEN tp.status = 'closed' THEN 'completed'
                   ELSE COALESCE(tp.status, 'proposed')
               END AS status,
               tp.final_payable AS amount_total, tp.total_paid AS amount_paid, tp.created_at,
               COALESCE(tp.kanban_position, 0) AS kanban_position,
               p.name AS patient_name, p.phone AS patient_phone,
               d.name AS doctor_name,
               (SELECT COUNT(*) FROM treatment_sittings ts WHERE ts.plan_id = tp.id) AS sittings_count,
               (SELECT COUNT(*) FROM treatment_sittings ts
                WHERE ts.plan_id = tp.id AND ts.status = 'completed') AS sittings_done,
               (SELECT MAX(COALESCE(ts.date::timestamp, ts.created_at)) FROM treatment_sittings ts WHERE ts.plan_id = tp.id) AS last_touch
        FROM treatment_plans tp
        LEFT JOIN patients p ON p.id = tp.patient_id
        LEFT JOIN staff d ON d.id = tp.doctor_id
        WHERE {' AND '.join(where)}
        ORDER BY tp.kanban_position, tp.created_at DESC
    """), params)).mappings().all()

    grouped: Dict[str, List[dict]] = {}
    for p in plans:
        status = p["status"]
        if status not in grouped: grouped[status] = []
        grouped[status].append({
            "id": str(p["id"]),
            "patient_id": str(p["patient_id"]),
            "patient_name": p["patient_name"],
            "patient_phone": p["patient_phone"],
            "doctor_name": p["doctor_name"],
            "title": p["title"],
            "amount_total": float(p["amount_total"]) if p["amount_total"] else 0,
            "amount_paid": float(p["amount_paid"]) if p["amount_paid"] else 0,
            "sittings_count": p["sittings_count"],
            "sittings_done": p["sittings_done"],
            "last_touch": p["last_touch"].isoformat() if p["last_touch"] else None,
            "created_at": p["created_at"].isoformat() if p["created_at"] else None,
            "kanban_position": p["kanban_position"],
        })
    return {"by_status": grouped, "total": sum(len(v) for v in grouped.values())}


class MoveCard(BaseModel):
    plan_id: UUID
    new_status: str
    new_position: int = 0


@kanban_router.post("/move")
async def move_card(body: MoveCard, db: AsyncSession = Depends(get_db),
                     staff=Depends(get_current_staff)):
    await db.execute(sql_text("""
        UPDATE treatment_plans
        SET status = :st, kanban_position = :p
        WHERE id = :id
    """), {"st": body.new_status, "p": body.new_position, "id": str(body.plan_id)})
    return {"moved": True}


# ═══════════════════════════════════════════════════════════════════════════
# 6. ILLNESS LIBRARY
# ═══════════════════════════════════════════════════════════════════════════
@illness_router.get("")
async def list_illnesses(clinic_id: Optional[UUID] = None, category: Optional[str] = None,
                          q: Optional[str] = None,
                          db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    """Effective list: clinic-overrides + globals not overridden."""
    where = ["is_active = TRUE"]
    params: Dict[str, Any] = {}
    if clinic_id:
        where.append("(clinic_id = :cid OR clinic_id IS NULL)"); params["cid"] = str(clinic_id)
    else:
        where.append("clinic_id IS NULL")
    if category:
        where.append("category = :cat"); params["cat"] = category
    if q:
        where.append("LOWER(name) LIKE :q"); params["q"] = f"%{q.lower()}%"
    rows = (await db.execute(sql_text(f"""
        SELECT * FROM illness_library WHERE {' AND '.join(where)}
        ORDER BY category, name
    """), params)).mappings().all()
    return {"illnesses": [{
        "id": str(r["id"]),
        "name": r["name"],
        "category": r["category"],
        "icd_code": r["icd_code"],
        "severity_default": r["severity_default"],
        "suggested_treatment_default": r["suggested_treatment_default"],
        "is_global": r["clinic_id"] is None,
    } for r in rows]}


class IllnessIn(BaseModel):
    clinic_id: UUID
    name: str
    category: str
    icd_code: Optional[str] = None
    severity_default: Optional[str] = None
    suggested_treatment_default: Optional[str] = None


@illness_router.post("")
async def add_illness(body: IllnessIn, db: AsyncSession = Depends(get_db),
                       staff=Depends(get_current_staff)):
    iid = str(uuid4())
    await db.execute(sql_text("""
        INSERT INTO illness_library
            (id, clinic_id, name, category, icd_code, severity_default, suggested_treatment_default)
        VALUES (:id, :cid, :n, :cat, :icd, :sev, :sug)
        ON CONFLICT (clinic_id, name) DO UPDATE SET
            category = EXCLUDED.category,
            severity_default = EXCLUDED.severity_default,
            suggested_treatment_default = EXCLUDED.suggested_treatment_default
    """), {
        "id": iid, "cid": str(body.clinic_id), "n": body.name, "cat": body.category,
        "icd": body.icd_code, "sev": body.severity_default,
        "sug": body.suggested_treatment_default,
    })
    return {"saved": True, "id": iid}
