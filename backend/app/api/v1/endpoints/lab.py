"""
Sprint A2 — Lab Module.
Mount in main.py:
    from app.api.v1.endpoints.lab import router as lab_router
    app.include_router(lab_router, prefix="/api")

Endpoints:
  Vendors:
    GET    /api/lab/vendors
    POST   /api/lab/vendors
    PATCH  /api/lab/vendors/{id}
    DELETE /api/lab/vendors/{id}        (soft — sets is_active=FALSE)
  Work types:
    GET    /api/lab/work-types
  Orders:
    GET    /api/lab/orders                (?patient_id= ?status= ?clinic_id=)
    GET    /api/lab/orders/{id}
    POST   /api/lab/orders
    PATCH  /api/lab/orders/{id}
    POST   /api/lab/orders/{id}/receive   (mark received)
    DELETE /api/lab/orders/{id}           (cancel)
  Payments:
    POST   /api/lab/orders/{id}/payments
    GET    /api/lab/orders/{id}/payments
  Scheduling guard:
    GET    /api/lab/guard/{patient_id}    (returns blockers for "Start Treatment")
"""
import json
from uuid import UUID
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff
from app.api.v1.endpoints.consult_rating import send_lab_received_message
from app.services.whatsapp_matrix import notify_lab_order_placed

router = APIRouter(prefix="/lab", tags=["Lab"])


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════
def _row(r: dict) -> dict:
    """Convert UUID/date columns to strings/ISO. Best-effort."""
    out = dict(r) if r else {}
    for k, v in list(out.items()):
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif isinstance(v, UUID):
            out[k] = str(v)
    return out


def _require_role(staff, *roles):
    if not staff or staff.get("role") not in roles:
        raise HTTPException(403, f"Requires one of: {', '.join(roles)}")


# ════════════════════════════════════════════════════════════════════
# Schemas
# ════════════════════════════════════════════════════════════════════
class VendorIn(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst: Optional[str] = None
    specialities: List[str] = Field(default_factory=list)
    is_preferred: bool = False
    notes: Optional[str] = None
    clinic_id: Optional[UUID] = None


class OrderIn(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    treatment_plan_item_id: Optional[UUID] = None
    vendor_id: Optional[UUID] = None
    work_type: Optional[str] = None
    teeth: List[int] = Field(default_factory=list)
    shade: Optional[str] = None
    sent_date: Optional[date] = None
    expected_date: Optional[date] = None
    cost: float = 0
    details: Optional[str] = None
    notes: Optional[str] = None
    invoice_no: Optional[str] = None


class OrderPatch(BaseModel):
    vendor_id: Optional[UUID] = None
    work_type: Optional[str] = None
    teeth: Optional[List[int]] = None
    shade: Optional[str] = None
    sent_date: Optional[date] = None
    expected_date: Optional[date] = None
    received_date: Optional[date] = None
    status: Optional[str] = None
    cost: Optional[float] = None
    invoice_no: Optional[str] = None
    details: Optional[str] = None
    notes: Optional[str] = None
    vendor_notes: Optional[str] = None


class OrderClosureIn(BaseModel):
    closure_notes: Optional[str] = None


def _normalize_shade(shade: Optional[str]) -> Optional[str]:
    if shade is None:
        return None
    value = str(shade).strip().upper()
    return value or None


def _normalize_work_type(work_type: Optional[str]) -> str:
    value = (work_type or "").strip()
    return value or "Lab Work"


class PaymentIn(BaseModel):
    amount: float
    paid_date: Optional[date] = None
    payment_mode: Optional[str] = None       # cash | upi | bank
    reference: Optional[str] = None
    notes: Optional[str] = None


# ════════════════════════════════════════════════════════════════════
# VENDORS
# ════════════════════════════════════════════════════════════════════
@router.get("/vendors")
async def list_vendors(
    include_inactive: bool = False,
    clinic_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    where = []
    params = {}
    if not include_inactive:
        where.append("is_active = TRUE")
    if clinic_id:
        where.append("(clinic_id IS NULL OR clinic_id = :cid)")
        params["cid"] = str(clinic_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    rows = (await db.execute(sql_text(f"""
        SELECT id, name, contact_person, phone, whatsapp_number, email, address, gst,
               specialities, rating, is_preferred, is_active, notes, clinic_id
        FROM lab_vendors {where_sql}
        ORDER BY is_preferred DESC, rating DESC NULLS LAST, name
    """), params)).mappings().all()
    return [_row(r) for r in rows]


@router.post("/vendors", status_code=201)
async def create_vendor(body: VendorIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin", "receptionist")
    row = (await db.execute(sql_text("""
        INSERT INTO lab_vendors (name, contact_person, phone, whatsapp_number, email, address, gst,
                                  specialities, is_preferred, notes, clinic_id)
        VALUES (:n, :cp, :ph, :wa, :em, :ad, :gst, CAST(:sp AS JSONB), :ip, :nt, :cl)
        RETURNING id
    """), {
        "n": body.name, "cp": body.contact_person, "ph": body.phone, "wa": body.whatsapp_number,
        "em": body.email, "ad": body.address, "gst": body.gst,
        "sp": json.dumps(body.specialities), "ip": body.is_preferred, "nt": body.notes,
        "cl": str(body.clinic_id) if body.clinic_id else None,
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.patch("/vendors/{vendor_id}")
async def update_vendor(vendor_id: UUID, body: VendorIn,
                         db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin", "receptionist")
    await db.execute(sql_text("""
        UPDATE lab_vendors SET name=:n, contact_person=:cp, phone=:ph, whatsapp_number=:wa,
               email=:em, address=:ad, gst=:gst, specialities=CAST(:sp AS JSONB),
               is_preferred=:ip, notes=:nt, clinic_id=:cl, updated_at=NOW()
         WHERE id=:id
    """), {
        "id": str(vendor_id),
        "n": body.name, "cp": body.contact_person, "ph": body.phone, "wa": body.whatsapp_number,
        "em": body.email, "ad": body.address, "gst": body.gst,
        "sp": json.dumps(body.specialities), "ip": body.is_preferred, "nt": body.notes,
        "cl": str(body.clinic_id) if body.clinic_id else None,
    })
    await db.commit()
    return {"ok": True}


@router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    await db.execute(sql_text("UPDATE lab_vendors SET is_active=FALSE WHERE id=:id"), {"id": str(vendor_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# WORK TYPES — Bundle X: usage-tracked, inline-add catalog
# ════════════════════════════════════════════════════════════════════
@router.get("/work-types")
async def list_work_types(
    clinic_id: Optional[UUID] = None,
    q: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """List active lab work types. Sorted by usage_count DESC, then sort_order, then name.
       Filters by clinic_id (NULL = global types included). Optional fuzzy `q` substring."""
    where = ["is_active=TRUE"]
    params: dict = {"lim": limit}
    if clinic_id:
        where.append("(clinic_id = :cid OR clinic_id IS NULL)")
        params["cid"] = str(clinic_id)
    if q:
        where.append("LOWER(name) LIKE :qq")
        params["qq"] = f"%{q.lower()}%"
    rows = (await db.execute(sql_text(f"""
        SELECT id, name, category, typical_days, typical_cost, sort_order,
               COALESCE(usage_count,0) AS usage_count, last_used_at, added_from, clinic_id
        FROM lab_work_types
        WHERE {' AND '.join(where)}
        ORDER BY COALESCE(usage_count,0) DESC, sort_order NULLS LAST, name
        LIMIT :lim
    """), params)).mappings().all()
    return [_row(r) | {"usage_count": int(r["usage_count"] or 0),
                        "typical_cost": float(r["typical_cost"] or 0)} for r in rows]


class WorkTypeIn(BaseModel):
    name: str
    clinic_id: Optional[UUID] = None
    category: Optional[str] = None
    typical_days: int = 7
    typical_cost: float = 0

@router.post("/work-types", status_code=201)
async def upsert_work_type(body: WorkTypeIn, db: AsyncSession = Depends(get_db),
                            staff=Depends(get_current_staff)):
    """Inline-add a lab work type. If name already exists for the clinic (case-insensitive),
       returns the existing row + bumps usage_count. Otherwise creates new."""
    name = (body.name or "").strip()
    if not name: raise HTTPException(400, "Name required")
    cid = str(body.clinic_id) if body.clinic_id else None

    # Look for existing (clinic-specific OR global)
    existing = (await db.execute(sql_text("""
        SELECT id, name FROM lab_work_types
         WHERE LOWER(name) = LOWER(:n)
           AND (clinic_id = CAST(:cid AS UUID) OR clinic_id IS NULL)
         ORDER BY clinic_id NULLS LAST LIMIT 1
    """), {"n": name, "cid": cid})).mappings().first()

    if existing:
        await db.execute(sql_text("""
            UPDATE lab_work_types
               SET usage_count = COALESCE(usage_count,0) + 1, last_used_at = NOW()
             WHERE id = :id
        """), {"id": str(existing["id"])})
        await db.commit()
        return {"id": str(existing["id"]), "name": existing["name"], "created": False}

    # Compute next sort_order
    next_order = (await db.execute(sql_text(
        "SELECT COALESCE(MAX(sort_order),0)+10 AS n FROM lab_work_types"
    ))).scalar() or 10

    row = (await db.execute(sql_text("""
        INSERT INTO lab_work_types
            (name, category, typical_days, typical_cost, is_active, sort_order,
             clinic_id, usage_count, last_used_at, added_from)
        VALUES (:n, :cat, :td, :tc, TRUE, :so,
                CAST(:cid AS UUID), 1, NOW(), 'inline')
        RETURNING id, name
    """), {
        "n": name, "cat": body.category, "td": body.typical_days,
        "tc": body.typical_cost, "so": next_order, "cid": cid,
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"]), "name": row["name"], "created": True}


@router.post("/work-types/{wt_id}/bump", status_code=200)
async def bump_work_type(wt_id: UUID, db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    """Bump usage_count when a work type is actually used in a lab order.
       Called by frontend after successful order creation."""
    res = await db.execute(sql_text("""
        UPDATE lab_work_types
           SET usage_count = COALESCE(usage_count,0) + 1, last_used_at = NOW()
         WHERE id = :id
    """), {"id": str(wt_id)})
    await db.commit()
    return {"ok": res.rowcount > 0}


# ════════════════════════════════════════════════════════════════════
# ORDERS
# ════════════════════════════════════════════════════════════════════
@router.get("/orders")
async def list_orders(
    patient_id: Optional[UUID] = None,
    status: Optional[str] = None,
    clinic_id: Optional[UUID] = None,
    vendor_id: Optional[UUID] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    where = []
    params = {"lim": limit}
    if patient_id:
        where.append("lo.patient_id = :pid")
        params["pid"] = str(patient_id)
    if status:
        # Accept a single status or a comma-separated list (e.g. "pending,sent")
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if len(statuses) == 1:
            where.append("lo.status = :st")
            params["st"] = statuses[0]
        elif statuses:
            keys = []
            for i, s in enumerate(statuses):
                k = f"st{i}"
                keys.append(f":{k}")
                params[k] = s
            where.append(f"lo.status IN ({', '.join(keys)})")
    if clinic_id:
        where.append("lo.clinic_id = :cid")
        params["cid"] = str(clinic_id)
    if vendor_id:
        where.append("lo.vendor_id = :vid")
        params["vid"] = str(vendor_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    rows = (await db.execute(sql_text(f"""
        SELECT lo.id, lo.serial_no, lo.clinic_id, lo.patient_id, lo.appointment_id, lo.treatment_plan_item_id,
               lo.vendor_id, v.name AS vendor_name, v.phone AS vendor_phone, v.whatsapp_number AS vendor_whatsapp,
               lo.work_type, lo.teeth, lo.shade, lo.sent_date, lo.expected_date, lo.received_date,
               lo.status, lo.cost, lo.invoice_no, lo.details, lo.notes, lo.vendor_notes,
               tpi.teeth AS linked_treatment_teeth,
               p.name AS patient_name, p.phone AS patient_phone, lo.created_at,
               (SELECT COALESCE(SUM(amount),0) FROM lab_order_payments WHERE lab_order_id=lo.id) AS amount_paid
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN patients p ON p.id = lo.patient_id
        LEFT JOIN treatment_plan_items tpi ON tpi.id = lo.treatment_plan_item_id
        {where_sql}
        ORDER BY lo.created_at DESC
        LIMIT :lim
    """), params)).mappings().all()
    return {"orders": [_row(r) | {"amount_paid": float(r["amount_paid"] or 0),
                                  "cost": float(r["cost"] or 0),
                                  "linked_treatment_teeth": r["linked_treatment_teeth"] or []} for r in rows]}


@router.get("/orders/{order_id}")
async def get_order(order_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    r = (await db.execute(sql_text("""
        SELECT lo.*, v.name AS vendor_name, v.phone AS vendor_phone, v.whatsapp_number AS vendor_whatsapp,
               p.name AS patient_name, p.phone AS patient_phone, tpi.teeth AS linked_treatment_teeth
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN patients p ON p.id = lo.patient_id
        LEFT JOIN treatment_plan_items tpi ON tpi.id = lo.treatment_plan_item_id
        WHERE lo.id = :id
    """), {"id": str(order_id)})).mappings().one_or_none()
    if not r: raise HTTPException(404, "Order not found")
    payments = (await db.execute(sql_text("""
        SELECT id, amount, paid_date, payment_mode, reference, notes
        FROM lab_order_payments WHERE lab_order_id=:id ORDER BY paid_date DESC
    """), {"id": str(order_id)})).mappings().all()
    return _row(r) | {
        "amount_paid": sum(float(p["amount"] or 0) for p in payments),
        "payments": [_row(p) | {"amount": float(p["amount"] or 0)} for p in payments],
    }


@router.post("/orders", status_code=201)
async def create_order(body: OrderIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin", "receptionist", "nurse")
    # Resolve clinic_id from staff or from the patient
    cid = staff.get("clinic_id")
    if not cid:
        pat = (await db.execute(sql_text(
            "SELECT clinic_id FROM patients WHERE id=:p"), {"p": str(body.patient_id)})).mappings().one_or_none()
        if not pat: raise HTTPException(404, "Patient not found")
        cid = pat["clinic_id"]
    order_status = "sent" if body.sent_date else "pending"
    work_type = _normalize_work_type(body.work_type)
    row = (await db.execute(sql_text("""
        INSERT INTO lab_orders (clinic_id, patient_id, appointment_id, treatment_plan_item_id, vendor_id,
                                 work_type, teeth, shade, sent_date, expected_date, cost, details, notes,
                                 invoice_no, status, created_by)
        VALUES (:cl, :pa, :ap, :tpi, :v, :w, CAST(:t AS JSONB), :sh, :sd, :ed, :co, :de, :nt, :inv,
                :status, :cb)
        RETURNING id, serial_no, status
    """), {
        "cl": str(cid), "pa": str(body.patient_id),
        "ap": str(body.appointment_id) if body.appointment_id else None,
        "tpi": str(body.treatment_plan_item_id) if body.treatment_plan_item_id else None,
        "v": str(body.vendor_id) if body.vendor_id else None,
        "w": work_type, "t": json.dumps(body.teeth), "sh": _normalize_shade(body.shade),
        "sd": body.sent_date, "ed": body.expected_date, "co": body.cost,
        "de": body.details, "nt": body.notes, "inv": body.invoice_no,
        "status": order_status, "cb": staff.get("staff_id"),
    })).mappings().one()
    # If linked to a plan item, flag the plan item as requires_lab + lab_status pending
    if body.treatment_plan_item_id:
        await db.execute(sql_text("""
            UPDATE treatment_plan_items SET requires_lab = TRUE, lab_status = 'pending'
             WHERE id = :id
        """), {"id": str(body.treatment_plan_item_id)})
    await db.commit()
    if order_status == "sent":
        try:
            await notify_lab_order_placed(db, str(row["id"]))
        except Exception:
            pass
    return _row(row)


@router.patch("/orders/{order_id}")
async def update_order(order_id: UUID, body: OrderPatch,
                        db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin", "receptionist", "nurse")
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        return {"ok": True, "updated": 0}
    role = (staff or {}).get("role")
    if role == "nurse":
        relevant = {"vendor_id", "work_type", "teeth", "shade", "expected_date"}
        if any(k in fields for k in relevant):
            existing = (await db.execute(sql_text("""
                SELECT vendor_id, work_type, teeth, shade, expected_date
                FROM lab_orders WHERE id=:id
            """), {"id": str(order_id)})).mappings().one_or_none()
            if not existing:
                raise HTTPException(404, "Order not found")
            final_vendor = fields["vendor_id"] if "vendor_id" in fields else existing["vendor_id"]
            final_work_type = fields["work_type"] if "work_type" in fields else existing["work_type"]
            final_teeth = fields["teeth"] if "teeth" in fields else (existing["teeth"] or [])
            final_shade = fields["shade"] if "shade" in fields else existing["shade"]
            final_expected = fields["expected_date"] if "expected_date" in fields else existing["expected_date"]
            if not final_vendor:
                raise HTTPException(400, "Lab vendor is required before nurse confirmation")
            if not (final_work_type or "").strip():
                raise HTTPException(400, "Work type is required before nurse confirmation")
            if not final_teeth:
                raise HTTPException(400, "Tooth number is required before nurse confirmation")
            if not _normalize_shade(final_shade):
                raise HTTPException(400, "Shade is required before nurse confirmation")
            if not final_expected:
                raise HTTPException(400, "Expected date is required before nurse confirmation")
    params = {"id": str(order_id)}
    sets = []
    for k, v in fields.items():
        if k == "teeth":
            sets.append("teeth = CAST(:teeth AS JSONB)")
            params["teeth"] = json.dumps(v)
        elif k == "vendor_id":
            sets.append("vendor_id = :vendor_id")
            params["vendor_id"] = str(v) if v else None
        elif k == "shade":
            sets.append("shade = :shade")
            params["shade"] = _normalize_shade(v)
        elif k == "work_type":
            sets.append("work_type = :work_type")
            params["work_type"] = _normalize_work_type(v)
        elif k == "cost" and role == "nurse":
            continue
        else:
            sets.append(f"{k} = :{k}")
            params[k] = v
    if body.sent_date is not None:
        sets.append("status = 'sent'")
    sets.append("updated_at = NOW()")
    await db.execute(sql_text(f"UPDATE lab_orders SET {', '.join(sets)} WHERE id = :id"), params)
    await db.commit()
    if body.sent_date is not None:
        try:
            await notify_lab_order_placed(db, str(order_id))
        except Exception:
            pass
    return {"ok": True}


@router.post("/orders/{order_id}/receive")
async def receive_order(order_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Mark order received — also flips linked plan item lab_status to 'received'."""
    _require_role(staff, "doctor", "admin", "receptionist", "nurse")
    r = (await db.execute(sql_text("""
        UPDATE lab_orders SET status='received', received_date=COALESCE(received_date, CURRENT_DATE),
               received_by=:rb, updated_at=NOW()
         WHERE id=:id RETURNING treatment_plan_item_id
    """), {"id": str(order_id), "rb": staff.get("staff_id")})).mappings().one_or_none()
    if not r: raise HTTPException(404, "Order not found")
    if r["treatment_plan_item_id"]:
        await db.execute(sql_text("UPDATE treatment_plan_items SET lab_status='received' WHERE id=:id"),
                         {"id": str(r["treatment_plan_item_id"])})
    await db.commit()
    try:
        await send_lab_received_message(db, str(order_id))
    except Exception:
        pass
    return {"ok": True}


@router.post("/orders/{order_id}/approve")
async def approve_order(order_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Doctor approves receipt of the lab order so it becomes payable to the vendor."""
    _require_role(staff, "doctor", "admin")

    r = (await db.execute(sql_text("""
        SELECT o.cost, o.status, o.treatment_plan_item_id
        FROM lab_orders o
        WHERE o.id = :id
    """), {"id": str(order_id)})).mappings().one_or_none()

    if not r: raise HTTPException(404, "Order not found")
    if r["status"] == "fitted": raise HTTPException(400, "Order is already approved")

    await db.execute(sql_text("""
        UPDATE lab_orders 
           SET status='fitted', updated_at=NOW()
         WHERE id=:id
    """), {"id": str(order_id)})

    if r["treatment_plan_item_id"]:
        await db.execute(sql_text("""
            UPDATE treatment_plan_items
               SET lab_status='approved', updated_at=NOW()
             WHERE id=:id
        """), {"id": str(r["treatment_plan_item_id"])})

    await db.commit()
    return {"ok": True, "cost_approved": float(r["cost"] or 0)}


@router.post("/orders/{order_id}/complete")
async def complete_order(order_id: UUID, body: OrderClosureIn,
                         db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Close a fitted order only after the doctor has approved its receipt/cost."""
    _require_role(staff, "doctor", "admin", "nurse")
    row = (await db.execute(sql_text("""
        UPDATE lab_orders
           SET status='completed', closure_notes=:notes, closed_by=:by,
               closed_at=NOW(), updated_at=NOW()
         WHERE id=:id AND status = 'fitted'
        RETURNING treatment_plan_item_id
    """), {"id": str(order_id), "notes": body.closure_notes,
            "by": staff.get("staff_id")})).mappings().one_or_none()
    if not row:
        raise HTTPException(409, "Doctor must approve the received lab work before it can be completed")
    if row["treatment_plan_item_id"]:
        await db.execute(sql_text("""
            UPDATE treatment_plan_items SET lab_status='completed', updated_at=NOW() WHERE id=:id
        """), {"id": str(row["treatment_plan_item_id"])})
    await db.commit()
    return {"ok": True, "status": "completed"}



@router.delete("/orders/{order_id}")
async def cancel_order(order_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin")
    await db.execute(sql_text("UPDATE lab_orders SET status='cancelled', updated_at=NOW() WHERE id=:id"),
                     {"id": str(order_id)})
    await db.commit()
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════
# PAYMENTS
# ════════════════════════════════════════════════════════════════════
@router.post("/orders/{order_id}/payments", status_code=201)
async def add_payment(order_id: UUID, body: PaymentIn,
                       db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_role(staff, "doctor", "admin", "receptionist", "nurse")
    row = (await db.execute(sql_text("""
        INSERT INTO lab_order_payments (lab_order_id, amount, paid_date, payment_mode, reference, notes, recorded_by)
        VALUES (:lo, :am, COALESCE(:pd, CURRENT_DATE), :pm, :ref, :nt, :rb)
        RETURNING id
    """), {
        "lo": str(order_id), "am": body.amount, "pd": body.paid_date,
        "pm": body.payment_mode, "ref": body.reference, "nt": body.notes,
        "rb": staff.get("staff_id"),
    })).mappings().one()
    await db.commit()
    return {"id": str(row["id"])}


@router.get("/orders/{order_id}/payments")
async def list_payments(order_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""
        SELECT id, amount, paid_date, payment_mode, reference, notes, created_at
        FROM lab_order_payments WHERE lab_order_id=:id ORDER BY paid_date DESC, created_at DESC
    """), {"id": str(order_id)})).mappings().all()
    return [_row(r) | {"amount": float(r["amount"] or 0)} for r in rows]


# ════════════════════════════════════════════════════════════════════
# SCHEDULING GUARD
# ════════════════════════════════════════════════════════════════════
@router.get("/guard/{patient_id}")
async def lab_guard(patient_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Returns ANY pending lab orders for this patient.
    The frontend uses this before allowing a session to start, or when
    booking the next appointment.
    Shape:
      {
        "blocked": false | true,
        "pending": [{order_id, work_type, vendor_name, expected_date, status, is_overdue}, ...],
        "received_ready": [{...}]
      }
    """
    rows = (await db.execute(sql_text("""
        SELECT lo.id, lo.work_type, lo.expected_date, lo.status, lo.teeth,
               v.name AS vendor_name, v.phone AS vendor_phone, v.whatsapp_number AS vendor_whatsapp,
               (lo.expected_date < CURRENT_DATE AND lo.status IN ('pending','sent')) AS is_overdue
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        WHERE lo.patient_id = :pid AND lo.status NOT IN ('cancelled','fitted')
        ORDER BY lo.expected_date NULLS LAST
    """), {"pid": str(patient_id)})).mappings().all()
    pending, ready = [], []
    for r in rows:
        d = _row(r)
        if r["status"] in ("pending", "sent"):
            pending.append(d)
        elif r["status"] == "received":
            ready.append(d)
    return {
        "blocked": len(pending) > 0,
        "pending": pending,
        "received_ready": ready,
        "summary": f"{len(pending)} lab order(s) pending" + (f" · {len(ready)} ready to fit" if ready else ""),
    }
