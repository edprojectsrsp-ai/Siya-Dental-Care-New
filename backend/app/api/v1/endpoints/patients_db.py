"""
backend/app/api/v1/endpoints/patients_db.py
Sprint P1 — Patient Database Module

Endpoints (all prefixed /api/patients-db):
  GET  /list                       → paginated, searchable, sortable directory
  GET  /{pid}/full                 → complete record bundle (overview tab payload)
  GET  /{pid}/timeline             → chronological event log (visits + Rx + payments)
  GET  /{pid}/workspace-snapshot   → workspace data (read-only embed)
  GET  /{pid}/media                → patient media gallery
  GET  /{pid}/lab-orders           → lab orders for this patient
  GET  /{pid}/visits               → finalized treatment sessions (paginated)
  GET  /{pid}/appointments         → all appointments (paginated)
  PATCH /{pid}                     → update demographics + chairside notes
  POST /{pid}/illnesses            → update existing illnesses list

Backed by migration 018_patient_database.sql (patient_summary_v view).
"""
from datetime import datetime, timezone, date as date_type
from typing import Optional, List
from uuid import UUID
import json

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff

router = APIRouter(prefix="/patients-db", tags=["Patient Database"])


# ─────────────────────────── Schemas ───────────────────────────
class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    chairside_notes: Optional[str] = None
    existing_illnesses: Optional[List[str]] = None


class IllnessUpdate(BaseModel):
    existing_illnesses: List[str] = Field(default_factory=list)


# ─────────────────────────── Helpers ───────────────────────────
def _iso(v):
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return str(v)


def _fmt_patient_row(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "phone": r["phone"],
        "age": r["age"],
        "gender": r["gender"],
        "clinic_id": str(r["preferred_clinic_id"]) if r.get("preferred_clinic_id") else None,
        "is_active": bool(r.get("is_active", True)),
        "total_visits": r.get("total_visits") or 0,
        "existing_illnesses": r.get("existing_illnesses") or [],
        "created_at": _iso(r.get("created_at")),
        "last_visit_date": _iso(r.get("last_visit_date")),
        "active_plans": int(r.get("active_plans") or 0),
        "lifetime_billed": float(r.get("lifetime_billed") or 0),
        "lifetime_paid": float(r.get("lifetime_paid") or 0),
        "outstanding": float(r.get("outstanding") or 0),
        "rx_count": int(r.get("rx_count") or 0),
        "media_count": int(r.get("media_count") or 0),
        "has_alerts": bool(r.get("has_alerts", False)),
    }


# ═══════════════════════════════════════════════════════════════
# LIST  — paginated, searchable, sortable
# ═══════════════════════════════════════════════════════════════
@router.get("/list")
async def list_patients(
    clinic_id: Optional[UUID] = None,
    q: Optional[str] = Query(None, description="search by name or phone"),
    sort: str = Query("recent", regex="^(recent|name|visits|outstanding|alerts)$"),
    filter_alerts: bool = False,
    filter_active_plans: bool = False,
    filter_outstanding: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Patient directory. Powers the left-side list of the Patient Database screen."""
    where = ["COALESCE(is_active, TRUE) = TRUE"]
    params: dict = {"lim": limit, "off": offset}

    if clinic_id:
        where.append("preferred_clinic_id = :cid")
        params["cid"] = str(clinic_id)

    if q and q.strip():
        # Use trigram index when available; fall back to ILIKE otherwise
        qs = q.strip()
        where.append("(LOWER(name) LIKE LOWER(:qpat) OR phone LIKE :qpat)")
        params["qpat"] = f"%{qs}%"

    if filter_alerts:
        where.append("has_alerts = TRUE")
    if filter_active_plans:
        where.append("active_plans > 0")
    if filter_outstanding:
        where.append("outstanding > 0")

    where_sql = " WHERE " + " AND ".join(where) if where else ""

    sort_sql = {
        "recent":      "ORDER BY COALESCE(last_visit_date, created_at::date) DESC NULLS LAST",
        "name":        "ORDER BY LOWER(name) ASC",
        "visits":      "ORDER BY total_visits DESC NULLS LAST, last_visit_date DESC NULLS LAST",
        "outstanding": "ORDER BY outstanding DESC, name ASC",
        "alerts":      "ORDER BY has_alerts DESC, last_visit_date DESC NULLS LAST",
    }[sort]

    rows = (await db.execute(sql_text(f"""
        SELECT * FROM patient_summary_v
        {where_sql}
        {sort_sql}
        LIMIT :lim OFFSET :off
    """), params)).mappings().all()

    total = (await db.execute(sql_text(f"""
        SELECT COUNT(*)::int AS c FROM patient_summary_v {where_sql}
    """), {k: v for k, v in params.items() if k not in ("lim", "off")})).mappings().one()["c"]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "patients": [_fmt_patient_row(r) for r in rows],
    }


# ═══════════════════════════════════════════════════════════════
# FULL detail — everything for the Overview tab in one fetch
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/full")
async def patient_full(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    pid = str(patient_id)

    # Patient core
    p = (await db.execute(sql_text("""
        SELECT p.id, p.name, p.phone, p.age, p.gender, p.address, p.preferred_clinic_id,
               p.total_visits, p.existing_illnesses, p.chairside_notes,
               p.created_at, p.updated_at, p.is_active,
               c.name AS clinic_name
        FROM patients p
        LEFT JOIN clinics c ON c.id = p.preferred_clinic_id
        WHERE p.id = :p
    """), {"p": pid})).mappings().one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    # Health history + alerts
    h = (await db.execute(sql_text("""
        SELECT * FROM patient_health WHERE patient_id = :p
    """), {"p": pid})).mappings().one_or_none()

    alerts: List[dict] = []
    if h:
        if h.get("diabetes"):       alerts.append({"icon": "🩸", "label": "Diabetes — slow healing", "severity": "high"})
        if h.get("hypertension"):   alerts.append({"icon": "🩺", "label": "Hypertension — BP monitoring", "severity": "high"})
        if h.get("heart_disease"):  alerts.append({"icon": "❤️", "label": "Heart disease — cardiac care", "severity": "critical"})
        if h.get("blood_thinner"):  alerts.append({"icon": "💉", "label": "Blood thinners — bleeding risk", "severity": "critical"})
        if h.get("pregnant"):       alerts.append({"icon": "🤰", "label": "Pregnant — no X-ray", "severity": "critical"})
        if h.get("allergies") and str(h.get("allergies")).strip():
            alerts.append({"icon": "⚠️", "label": f"Allergy: {h['allergies']}", "severity": "critical"})
        if h.get("asthma"):         alerts.append({"icon": "🫁", "label": "Asthma", "severity": "medium"})
        if h.get("smoking") or h.get("tobacco"):
            alerts.append({"icon": "🚬", "label": "Smoker/tobacco", "severity": "medium"})

    # Illness chips from patients.existing_illnesses also count as alerts
    for ill in (p.get("existing_illnesses") or []):
        alerts.append({"icon": "⚠", "label": str(ill), "severity": "medium"})

    # Treatment plans (all, with sitting counts)
    plans = (await db.execute(sql_text("""
        SELECT tp.id, tp.name, tp.status, tp.is_archived, tp.complaint,
               tp.estimated_cost, tp.final_payable, tp.total_paid, tp.balance,
               tp.created_at, tp.updated_at, tp.archived_at,
               (SELECT COUNT(*) FROM treatment_plan_items tpi
                  WHERE tpi.plan_id=tp.id AND tpi.status != 'cancelled') AS items_count,
               (SELECT COUNT(*) FROM treatment_plan_items tpi
                  WHERE tpi.plan_id=tp.id AND tpi.status = 'completed') AS items_completed,
               (SELECT COUNT(*) FROM treatment_sessions ts
                  WHERE ts.patient_id = tp.patient_id
                    AND ts.finalized_at IS NOT NULL
                    AND ts.started_at >= tp.created_at) AS sittings_completed
        FROM treatment_plans tp
        WHERE tp.patient_id = :p
        ORDER BY tp.is_archived ASC, tp.created_at DESC
    """), {"p": pid})).mappings().all()

    # Latest prescriptions (10)
    rxs = (await db.execute(sql_text("""
        SELECT id, serial_number, complaint, diagnosis, medicines,
               visible_advice, followup_date, pdf_url, created_at
        FROM prescriptions
        WHERE patient_id = :p
        ORDER BY created_at DESC
        LIMIT 50
    """), {"p": pid})).mappings().all()

    # Payment ledger
    pays = (await db.execute(sql_text("""
        SELECT id, amount, payment_mode, razorpay_payment_id, remarks, date, created_at
        FROM payment_transactions
        WHERE patient_id = :p
        ORDER BY date DESC, created_at DESC
        LIMIT 100
    """), {"p": pid})).mappings().all()

    # Lifetime totals (from view for consistency)
    summary = (await db.execute(sql_text("""
        SELECT lifetime_billed, lifetime_paid, outstanding, last_visit_date, total_visits
        FROM patient_summary_v WHERE id = :p
    """), {"p": pid})).mappings().one_or_none() or {}

    return {
        "patient": {
            "id": pid,
            "name": p["name"],
            "phone": p["phone"],
            "age": p["age"],
            "gender": p["gender"],
            "address": p.get("address"),
            "clinic_id": str(p["preferred_clinic_id"]) if p.get("preferred_clinic_id") else None,
            "clinic_name": p.get("clinic_name"),
            "total_visits": p.get("total_visits") or 0,
            "existing_illnesses": p.get("existing_illnesses") or [],
            "chairside_notes": p.get("chairside_notes"),
            "created_at": _iso(p.get("created_at")),
            "updated_at": _iso(p.get("updated_at")),
            "last_visit_date": _iso(summary.get("last_visit_date")),
        },
        "health": ({k: h[k] for k in h.keys() if k not in ("id",)} if h else None),
        "alerts": alerts,
        "summary": {
            "lifetime_billed": float(summary.get("lifetime_billed") or 0),
            "lifetime_paid": float(summary.get("lifetime_paid") or 0),
            "outstanding": float(summary.get("outstanding") or 0),
        },
        "treatment_plans": [{
            "id": str(pl["id"]),
            "name": pl["name"],
            "status": pl["status"],
            "is_archived": bool(pl.get("is_archived", False)),
            "complaint": pl.get("complaint"),
            "estimated_cost": float(pl.get("estimated_cost") or 0),
            "final_payable": float(pl.get("final_payable") or 0),
            "total_paid": float(pl.get("total_paid") or 0),
            "balance": float(pl.get("balance") or 0),
            "items_count": int(pl.get("items_count") or 0),
            "items_completed": int(pl.get("items_completed") or 0),
            "sittings_completed": int(pl.get("sittings_completed") or 0),
            "created_at": _iso(pl.get("created_at")),
            "archived_at": _iso(pl.get("archived_at")),
        } for pl in plans],
        "prescriptions": [{
            "id": str(r["id"]),
            "serial_number": r["serial_number"],
            "complaint": r.get("complaint"),
            "diagnosis": r.get("diagnosis"),
            "medicines": r.get("medicines") or [],
            "advice": r.get("visible_advice"),
            "followup_date": _iso(r.get("followup_date")),
            "pdf_url": r.get("pdf_url"),
            "created_at": _iso(r.get("created_at")),
        } for r in rxs],
        "payments": [{
            "id": str(pay["id"]),
            "amount": float(pay["amount"] or 0),
            "payment_mode": pay.get("payment_mode"),
            "reference": pay.get("razorpay_payment_id"),
            "remarks": pay.get("remarks"),
            "date": _iso(pay.get("date")),
            "created_at": _iso(pay.get("created_at")),
        } for pay in pays],
    }


# ═══════════════════════════════════════════════════════════════
# TIMELINE — chronological event log
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/timeline")
async def patient_timeline(
    patient_id: UUID,
    limit: int = Query(100, ge=1, le=300),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    pid = str(patient_id)
    events: List[dict] = []

    # Finalized treatment sessions
    visits = (await db.execute(sql_text("""
        SELECT id, started_at, finalized_at, procedures_done, treatment_notes,
               amount_payable, amount_collected
        FROM treatment_sessions
        WHERE patient_id = :p AND finalized_at IS NOT NULL
        ORDER BY finalized_at DESC
    """), {"p": pid})).mappings().all()
    for v in visits:
        procs = v.get("procedures_done") or []
        proc_names = ", ".join(p.get("procedure_name", "") for p in procs if isinstance(p, dict))[:80]
        events.append({
            "kind": "visit",
            "icon": "🦷",
            "at": _iso(v.get("finalized_at")),
            "title": "Treatment session",
            "subtitle": proc_names or "—",
            "amount": float(v.get("amount_collected") or 0),
            "notes": v.get("treatment_notes"),
        })

    # Appointments (booked / confirmed / cancelled / completed)
    apts = (await db.execute(sql_text("""
        SELECT id,
               COALESCE(confirmed_date, requested_date) AS d,
               COALESCE(confirmed_time, requested_time) AS t,
               reason, appointment_type, source,
               COALESCE(workflow_status, status) AS ws,
               created_at
        FROM appointments
        WHERE patient_id = :p
        ORDER BY COALESCE(confirmed_date, requested_date) DESC NULLS LAST
        LIMIT 200
    """), {"p": pid})).mappings().all()
    for a in apts:
        ws = a.get("ws") or "scheduled"
        if ws in ("cancelled", "rejected"):
            icon = "✖"
        elif ws in ("completed", "done"):
            icon = "✓"
        elif ws == "in_treatment":
            icon = "🩺"
        else:
            icon = "📅"
        events.append({
            "kind": "appointment",
            "icon": icon,
            "at": _iso(a.get("d")),
            "title": f"Appointment — {a.get('appointment_type') or a.get('reason') or 'Visit'}",
            "subtitle": f"Status: {ws.replace('_', ' ')}",
            "notes": None,
        })

    # Prescriptions
    rxs = (await db.execute(sql_text("""
        SELECT id, serial_number, diagnosis, medicines, created_at
        FROM prescriptions
        WHERE patient_id = :p
        ORDER BY created_at DESC
    """), {"p": pid})).mappings().all()
    for r in rxs:
        meds = r.get("medicines") or []
        med_names = ", ".join(m.get("name", "") for m in meds if isinstance(m, dict))[:80]
        events.append({
            "kind": "prescription",
            "icon": "💊",
            "at": _iso(r.get("created_at")),
            "title": f"Rx #{r.get('serial_number') or ''}",
            "subtitle": r.get("diagnosis") or med_names or "Prescribed",
            "notes": None,
        })

    # Payments
    pays = (await db.execute(sql_text("""
        SELECT amount, payment_mode, date, remarks
        FROM payment_transactions
        WHERE patient_id = :p
        ORDER BY date DESC, created_at DESC
        LIMIT 100
    """), {"p": pid})).mappings().all()
    for pay in pays:
        events.append({
            "kind": "payment",
            "icon": "💰",
            "at": _iso(pay.get("date")),
            "title": f"Payment ₹{float(pay.get('amount') or 0):,.0f}",
            "subtitle": (pay.get("payment_mode") or "cash").title() + (f" · {pay.get('remarks')}" if pay.get("remarks") else ""),
            "amount": float(pay.get("amount") or 0),
            "notes": None,
        })

    # Lab orders
    labs = (await db.execute(sql_text("""
        SELECT lo.work_type, lo.status, lo.sent_date, lo.expected_date, lo.received_date,
               lo.created_at, v.name AS vendor_name
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        WHERE lo.patient_id = :p
        ORDER BY lo.created_at DESC
    """), {"p": pid})).mappings().all()
    for lo in labs:
        st = lo.get("status") or "pending"
        received = st in ("received", "fitted", "completed")
        events.append({
            "kind": "lab",
            "icon": "🧪",
            "at": _iso(lo.get("received_date") if received else (lo.get("sent_date") or lo.get("created_at"))),
            "title": f"Lab — {lo.get('work_type') or 'Order'}",
            "subtitle": f"{lo.get('vendor_name') or 'Lab'} · {st.replace('_', ' ')}",
            "notes": None,
        })

    # WhatsApp / messages to the patient
    try:
        msgs = (await db.execute(sql_text("""
            SELECT body, transport, direction, status, trigger, template_key,
                   COALESCE(sent_at, created_at) AS at
            FROM message_log
            WHERE recipient_kind = 'patient' AND recipient_id = :p
            ORDER BY created_at DESC
            LIMIT 100
        """), {"p": pid})).mappings().all()
    except Exception:
        msgs = []
    for m in msgs:
        body = (m.get("body") or "").strip()
        events.append({
            "kind": "message",
            "icon": "💬",
            "at": _iso(m.get("at")),
            "title": f"Message — {m.get('template_key') or m.get('trigger') or m.get('transport') or 'WhatsApp'}",
            "subtitle": f"{(m.get('direction') or 'out').title()} · {m.get('status') or 'sent'}",
            "notes": body[:160] if body else None,
        })

    # Sort all events descending by date
    events.sort(key=lambda e: e.get("at") or "", reverse=True)
    return {"events": events[:limit], "total": len(events)}


# ═══════════════════════════════════════════════════════════════
# WORKSPACE SNAPSHOT — read-only embed
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/workspace-snapshot")
async def workspace_snapshot(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Lighter version of /api/ws/{pid}/full for read-only display in the
    Patient Database 'Workspace' tab. Doesn't create a draft plan."""
    pid = str(patient_id)

    # Plan (no auto-create)
    plan_row = (await db.execute(sql_text("""
        SELECT id, name, status, estimated_cost, created_at
        FROM treatment_plans
        WHERE patient_id = :p AND is_archived = FALSE
          AND status NOT IN ('closed','cancelled')
        ORDER BY created_at DESC LIMIT 1
    """), {"p": pid})).mappings().one_or_none()

    items: List[dict] = []
    if plan_row:
        rows = (await db.execute(sql_text("""
            SELECT id, procedure_name, teeth, area_label, doctor_rate, discount,
                   final_amount, notes, status, examination_summary, diagnosis, created_at
            FROM treatment_plan_items
            WHERE plan_id = :pl AND status != 'cancelled'
            ORDER BY created_at
        """), {"pl": str(plan_row["id"])})).mappings().all()
        for r in rows:
            items.append({
                "id": str(r["id"]),
                "treatment_name": r["procedure_name"],
                "teeth": r.get("teeth") or [],
                "area_label": r.get("area_label"),
                "doctor_rate": float(r.get("doctor_rate") or 0),
                "discount": float(r.get("discount") or 0),
                "final_amount": float(r.get("final_amount") or 0),
                "notes": r.get("notes"),
                "status": r.get("status"),
                "examination_summary": r.get("examination_summary"),
                "diagnosis": r.get("diagnosis"),
                "created_at": _iso(r.get("created_at")),
            })

    # Tooth chart status
    tt = (await db.execute(sql_text("""
        SELECT tooth_number, treatment_type, treatment_kind, status, planned_at, completed_at
        FROM tooth_treatments
        WHERE patient_id = :p
        ORDER BY planned_at
    """), {"p": pid})).mappings().all()
    tc = (await db.execute(sql_text("""
        SELECT id, tooth_number, condition, notes, recorded_at
        FROM tooth_conditions
        WHERE patient_id = :p AND is_active = TRUE
        ORDER BY recorded_at
    """), {"p": pid})).mappings().all()
    tex = (await db.execute(sql_text("""
        SELECT id, tooth_number, finding, notes, recorded_at
        FROM tooth_examinations
        WHERE patient_id = :p AND is_active = TRUE
        ORDER BY recorded_at
    """), {"p": pid})).mappings().all()
    tdx = (await db.execute(sql_text("""
        SELECT id, tooth_number, diagnosis, notes, recorded_at
        FROM tooth_diagnoses
        WHERE patient_id = :p AND is_active = TRUE
        ORDER BY recorded_at
    """), {"p": pid})).mappings().all()

    return {
        "plan": ({
            "id": str(plan_row["id"]),
            "name": plan_row["name"],
            "status": plan_row["status"],
            "total_value": float(plan_row.get("estimated_cost") or 0),
            "created_at": _iso(plan_row.get("created_at")),
        } if plan_row else None),
        "items": items,
        "tooth_treatments": [{
            "tooth": r["tooth_number"],
            "treatment": r.get("treatment_type"),
            "kind": r.get("treatment_kind") or "other",
            "status": r.get("status"),
        } for r in tt],
        "tooth_conditions": [{
            "id": str(r["id"]), "tooth": r["tooth_number"],
            "condition": r.get("condition"), "notes": r.get("notes"),
        } for r in tc],
        "tooth_examinations": [{
            "id": str(r["id"]), "tooth": r["tooth_number"],
            "finding": r.get("finding"), "notes": r.get("notes"),
            "at": _iso(r.get("recorded_at")),
        } for r in tex],
        "tooth_diagnoses": [{
            "id": str(r["id"]), "tooth": r["tooth_number"],
            "diagnosis": r.get("diagnosis"), "notes": r.get("notes"),
            "at": _iso(r.get("recorded_at")),
        } for r in tdx],
    }


# ═══════════════════════════════════════════════════════════════
# MEDIA GALLERY — patient images & uploaded files
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/media")
async def patient_media(
    patient_id: UUID,
    image_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    pid = str(patient_id)
    sql = """
        SELECT id, image_url, thumbnail_url, image_type, title, description,
               linked_tooth_number, captured_date, uploaded_at,
               (SELECT name FROM staff WHERE id = uploaded_by) AS uploaded_by_name,
               file_size_bytes, mime_type
        FROM patient_images
        WHERE patient_id = :p AND is_active = TRUE
    """
    params: dict = {"p": pid}
    if image_type:
        sql += " AND image_type = :it"
        params["it"] = image_type
    sql += " ORDER BY captured_date DESC NULLS LAST, uploaded_at DESC"

    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return {
        "media": [{
            "id": str(r["id"]),
            "url": r.get("image_url"),
            "thumbnail_url": r.get("thumbnail_url") or r.get("image_url"),
            "image_type": r.get("image_type"),
            "title": r.get("title"),
            "description": r.get("description"),
            "linked_tooth_number": r.get("linked_tooth_number"),
            "captured_date": _iso(r.get("captured_date")),
            "uploaded_at": _iso(r.get("uploaded_at")),
            "uploaded_by_name": r.get("uploaded_by_name"),
            "file_size_kb": int((r.get("file_size_bytes") or 0) / 1024),
            "mime_type": r.get("mime_type"),
        } for r in rows],
        "total": len(rows),
    }


# ═══════════════════════════════════════════════════════════════
# LAB ORDERS — for this patient
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/lab-orders")
async def patient_lab_orders(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    pid = str(patient_id)
    rows = (await db.execute(sql_text("""
        SELECT lo.id, lo.work_type, lo.teeth, lo.shade, lo.status,
               lo.sent_date, lo.expected_date, lo.received_date,
               lo.cost, lo.invoice_no, lo.notes,
               v.name AS vendor_name, v.phone AS vendor_phone,
               (SELECT COALESCE(SUM(amount),0) FROM lab_order_payments WHERE lab_order_id=lo.id) AS amount_paid
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        WHERE lo.patient_id = :p
        ORDER BY lo.created_at DESC
    """), {"p": pid})).mappings().all()
    return {
        "orders": [{
            "id": str(r["id"]),
            "work_type": r.get("work_type"),
            "teeth": r.get("teeth") or [],
            "shade": r.get("shade"),
            "status": r.get("status"),
            "sent_date": _iso(r.get("sent_date")),
            "expected_date": _iso(r.get("expected_date")),
            "received_date": _iso(r.get("received_date")),
            "cost": float(r.get("cost") or 0),
            "amount_paid": float(r.get("amount_paid") or 0),
            "balance": float(r.get("cost") or 0) - float(r.get("amount_paid") or 0),
            "invoice_no": r.get("invoice_no"),
            "notes": r.get("notes"),
            "vendor_name": r.get("vendor_name"),
            "vendor_phone": r.get("vendor_phone"),
        } for r in rows],
        "total": len(rows),
    }


# ═══════════════════════════════════════════════════════════════
# VISITS — paginated treatment sessions
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/visits")
async def patient_visits(
    patient_id: UUID,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    pid = str(patient_id)
    rows = (await db.execute(sql_text("""
        SELECT ts.id, ts.started_at, ts.finalized_at, ts.procedures_done,
               ts.treatment_notes, ts.next_step,
               ts.amount_payable, ts.amount_collected, ts.discount_amount,
               s.name AS doctor_name
        FROM treatment_sessions ts
        LEFT JOIN staff s ON s.id = ts.doctor_id
        WHERE ts.patient_id = :p AND ts.finalized_at IS NOT NULL
        ORDER BY ts.finalized_at DESC
        LIMIT :lim OFFSET :off
    """), {"p": pid, "lim": limit, "off": offset})).mappings().all()
    return {
        "visits": [{
            "id": str(r["id"]),
            "date": _iso(r.get("finalized_at")),
            "started_at": _iso(r.get("started_at")),
            "doctor_name": r.get("doctor_name"),
            "procedures": r.get("procedures_done") or [],
            "notes": r.get("treatment_notes"),
            "next_step": r.get("next_step"),
            "amount_payable": float(r.get("amount_payable") or 0),
            "amount_collected": float(r.get("amount_collected") or 0),
            "discount": float(r.get("discount_amount") or 0),
        } for r in rows],
        "limit": limit, "offset": offset,
    }


# ═══════════════════════════════════════════════════════════════
# APPOINTMENTS — all appointments for the patient (paginated)
# ═══════════════════════════════════════════════════════════════
@router.get("/{patient_id}/appointments")
async def patient_appointments(
    patient_id: UUID,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    pid = str(patient_id)
    rows = (await db.execute(sql_text("""
        SELECT a.id,
               COALESCE(a.confirmed_date, a.requested_date) AS d,
               COALESCE(a.confirmed_time, a.requested_time) AS t,
               a.reason, a.appointment_type, a.source, a.duration_minutes,
               COALESCE(a.workflow_status, a.status) AS ws,
               a.chief_complaints, a.arrived_at, a.completed_at,
               s.name AS doctor_name,
               c.name AS clinic_name
        FROM appointments a
        LEFT JOIN staff s ON s.id = a.doctor_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        WHERE a.patient_id = :p
        ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC NULLS LAST
        LIMIT :lim OFFSET :off
    """), {"p": pid, "lim": limit, "off": offset})).mappings().all()
    return {
        "appointments": [{
            "id": str(r["id"]),
            "date": _iso(r.get("d")),
            "time": str(r["t"])[:5] if r.get("t") else None,
            "reason": r.get("reason"),
            "appointment_type": r.get("appointment_type"),
            "source": r.get("source"),
            "duration_minutes": r.get("duration_minutes"),
            "workflow_status": r.get("ws"),
            "chief_complaints": r.get("chief_complaints") or [],
            "doctor_name": r.get("doctor_name"),
            "clinic_name": r.get("clinic_name"),
            "arrived_at": _iso(r.get("arrived_at")),
            "completed_at": _iso(r.get("completed_at")),
        } for r in rows],
        "limit": limit, "offset": offset,
    }


# ═══════════════════════════════════════════════════════════════
# PATCH — update demographics + chairside notes
# ═══════════════════════════════════════════════════════════════
@router.patch("/{patient_id}")
async def update_patient(
    patient_id: UUID,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    sets: List[str] = []
    params: dict = {"id": str(patient_id)}
    for field in ("name", "phone", "age", "gender", "address", "chairside_notes"):
        v = getattr(body, field)
        if v is not None:
            sets.append(f"{field} = :{field}")
            params[field] = v
    if body.existing_illnesses is not None:
        sets.append("existing_illnesses = CAST(:ill AS JSONB)")
        params["ill"] = json.dumps(body.existing_illnesses)
    if not sets:
        raise HTTPException(400, "Nothing to update")
    sets.append("updated_at = NOW()")
    sql = f"UPDATE patients SET {', '.join(sets)} WHERE id = :id RETURNING id, name, phone"
    row = (await db.execute(sql_text(sql), params)).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Patient not found")
    return {"updated": True, "id": str(row["id"]), "name": row["name"], "phone": row["phone"]}


@router.post("/{patient_id}/illnesses")
async def update_illnesses(
    patient_id: UUID,
    body: IllnessUpdate,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    await db.execute(sql_text("""
        UPDATE patients SET existing_illnesses = CAST(:i AS JSONB), updated_at = NOW()
        WHERE id = :id
    """), {"i": json.dumps(body.existing_illnesses), "id": str(patient_id)})
    return {"updated": True, "count": len(body.existing_illnesses)}
