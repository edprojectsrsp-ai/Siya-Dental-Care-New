"""
backend/app/api/v1/endpoints/sprint13_15.py
Sprint 13: Advanced Reports
Sprint 14: Tooth Chart (Optional)
Sprint 15: RVG Image Management
"""

from datetime import datetime, timezone, date as date_type, timedelta
from typing import Optional, List
from uuid import UUID, uuid4
import csv, io, os, json, re

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff
from app.core.upload_guard import safe_ext, check_size

reports_router = APIRouter(prefix="/reports", tags=["Reports"])
tooth_router = APIRouter(prefix="/teeth", tags=["Tooth Chart"])
image_router = APIRouter(prefix="/images", tags=["Patient Images"])


# ═══════════════════════════════════════════════════════════════════════════
# SPRINT 13: ADVANCED REPORTS
# ═══════════════════════════════════════════════════════════════════════════

@reports_router.get("/revenue/daily")
async def revenue_daily(
    clinic_id: UUID,
    date: Optional[date_type] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Daily revenue breakdown by payment mode"""
    if date is None:
        date = date_type.today()
    rows = (await db.execute(sql_text("""
        SELECT payment_mode,
               COUNT(*) AS txn_count,
               SUM(amount) AS total_amount
        FROM payment_transactions
        WHERE clinic_id = :cid AND DATE(created_at) = :d AND amount > 0
        GROUP BY payment_mode
    """), {"cid": str(clinic_id), "d": date})).mappings().all()

    by_mode = {r["payment_mode"]: {"count": r["txn_count"], "amount": float(r["total_amount"] or 0)} for r in rows}
    total = sum(v["amount"] for v in by_mode.values())

    # Patient counts
    patients = (await db.execute(sql_text("""
        SELECT COUNT(DISTINCT patient_id) AS unique_patients,
               COUNT(*) AS total_visits
        FROM payment_transactions
        WHERE clinic_id = :cid AND DATE(created_at) = :d
    """), {"cid": str(clinic_id), "d": date})).mappings().one()

    # New vs returning
    new_pat = (await db.execute(sql_text("""
        SELECT COUNT(*) AS cnt FROM patients
        WHERE preferred_clinic_id = :cid AND DATE(created_at) = :d
    """), {"cid": str(clinic_id), "d": date})).mappings().one()

    return {
        "date": date.isoformat(),
        "clinic_id": str(clinic_id),
        "total_revenue": total,
        "by_mode": by_mode,
        "unique_patients": patients["unique_patients"] or 0,
        "total_transactions": patients["total_visits"] or 0,
        "new_patients_today": new_pat["cnt"] or 0,
    }


@reports_router.get("/revenue/monthly")
async def revenue_monthly(
    clinic_id: UUID,
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Monthly revenue with daily breakdown"""
    rows = (await db.execute(sql_text("""
        SELECT DATE(created_at) AS day,
               payment_mode,
               COUNT(*) AS txn_count,
               SUM(amount) AS total_amount
        FROM payment_transactions
        WHERE clinic_id = :cid
          AND EXTRACT(YEAR FROM created_at) = :y
          AND EXTRACT(MONTH FROM created_at) = :m
          AND amount > 0
        GROUP BY DATE(created_at), payment_mode
        ORDER BY day
    """), {"cid": str(clinic_id), "y": year, "m": month})).mappings().all()

    daily: dict = {}
    by_mode_total: dict = {}
    grand_total = 0.0
    for r in rows:
        day = r["day"].isoformat()
        if day not in daily:
            daily[day] = {"total": 0, "by_mode": {}}
        amt = float(r["total_amount"] or 0)
        daily[day]["by_mode"][r["payment_mode"]] = amt
        daily[day]["total"] += amt
        by_mode_total[r["payment_mode"]] = by_mode_total.get(r["payment_mode"], 0) + amt
        grand_total += amt

    return {
        "year": year, "month": month,
        "grand_total": grand_total,
        "by_mode_total": by_mode_total,
        "daily_breakdown": daily,
    }


@reports_router.get("/outstanding-payments")
async def outstanding_payments(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Patients with unpaid balances, bucketed by age"""
    rows = (await db.execute(sql_text("""
        SELECT * FROM v_outstanding_balances
        WHERE clinic_id = :cid
        ORDER BY days_since_update DESC
    """), {"cid": str(clinic_id)})).mappings().all()

    buckets = {"0-30": [], "31-60": [], "61-90": [], "90+": []}
    total_outstanding = 0.0
    for r in rows:
        bal = float(r["balance"] or 0)
        days = r["days_since_update"] or 0
        item = {
            "patient_id": str(r["patient_id"]),
            "patient_name": r["patient_name"],
            "patient_phone": r["patient_phone"],
            "plan_id": str(r["plan_id"]),
            "plan_name": r["plan_name"],
            "balance": bal,
            "days_overdue": days,
        }
        if days <= 30: buckets["0-30"].append(item)
        elif days <= 60: buckets["31-60"].append(item)
        elif days <= 90: buckets["61-90"].append(item)
        else: buckets["90+"].append(item)
        total_outstanding += bal

    return {
        "total_outstanding": total_outstanding,
        "patient_count": len(rows),
        "buckets": buckets,
    }


@reports_router.get("/top-procedures")
async def top_procedures(
    clinic_id: UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Top procedures by revenue"""
    rows = (await db.execute(sql_text("""
        SELECT * FROM v_procedure_revenue
        WHERE clinic_id = :cid
        ORDER BY total_revenue DESC NULLS LAST
        LIMIT :lim
    """), {"cid": str(clinic_id), "lim": limit})).mappings().all()
    return [{
        "procedure_id": str(r["procedure_id"]),
        "procedure_name": r["procedure_name"],
        "category": r["category"],
        "times_used": r["times_used"],
        "avg_price": float(r["avg_price"] or 0),
        "total_revenue": float(r["total_revenue"] or 0),
    } for r in rows]


@reports_router.get("/doctor-performance")
async def doctor_performance(
    clinic_id: UUID,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Doctor performance over last N days"""
    rows = (await db.execute(sql_text("""
        SELECT doctor_id, doctor_name,
               SUM(sessions_count) AS total_sessions,
               SUM(unique_patients) AS total_patients,
               SUM(revenue_generated) AS total_revenue
        FROM v_doctor_performance
        WHERE clinic_id = :cid AND work_day >= CURRENT_DATE - INTERVAL ':n days'
        GROUP BY doctor_id, doctor_name
        ORDER BY total_revenue DESC NULLS LAST
    """).bindparams(n=days), {"cid": str(clinic_id)})).mappings().all()
    return [{
        "doctor_id": str(r["doctor_id"]),
        "doctor_name": r["doctor_name"],
        "total_sessions": r["total_sessions"] or 0,
        "total_patients": r["total_patients"] or 0,
        "total_revenue": float(r["total_revenue"] or 0),
    } for r in rows]


@reports_router.get("/export/csv")
async def export_csv(
    report_type: str,
    clinic_id: UUID,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Export report as CSV"""
    if date_from is None:
        date_from = date_type.today() - timedelta(days=30)
    if date_to is None:
        date_to = date_type.today()

    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "revenue":
        writer.writerow(["Date", "Payment Mode", "Transactions", "Amount"])
        rows = (await db.execute(sql_text("""
            SELECT DATE(created_at) AS d, payment_mode,
                   COUNT(*) AS cnt, SUM(amount) AS amt
            FROM payment_transactions
            WHERE clinic_id = :cid AND DATE(created_at) BETWEEN :df AND :dt
            GROUP BY DATE(created_at), payment_mode ORDER BY d, payment_mode
        """), {"cid": str(clinic_id), "df": date_from, "dt": date_to})).mappings().all()
        for r in rows:
            writer.writerow([r["d"], r["payment_mode"], r["cnt"], r["amt"]])
    elif report_type == "outstanding":
        writer.writerow(["Patient Name", "Phone", "Plan", "Balance", "Days Overdue"])
        rows = (await db.execute(sql_text("""
            SELECT * FROM v_outstanding_balances WHERE clinic_id = :cid
        """), {"cid": str(clinic_id)})).mappings().all()
        for r in rows:
            writer.writerow([r["patient_name"], r["patient_phone"], r["plan_name"],
                           r["balance"], r["days_since_update"]])
    else:
        raise HTTPException(400, "Unknown report_type. Use 'revenue' or 'outstanding'")

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_{date_from}_{date_to}.csv"},
    )


# ═══════════════════════════════════════════════════════════════════════════
# SPRINT 14: TOOTH CHART (OPTIONAL)
# ═══════════════════════════════════════════════════════════════════════════

class ToothConditionIn(BaseModel):
    tooth_number: int = Field(..., ge=11, le=48)
    condition: str
    surface: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None

class ToothTreatmentIn(BaseModel):
    tooth_number: int = Field(..., ge=11, le=48)
    treatment_type: str
    surface: Optional[str] = None
    notes: Optional[str] = None
    treatment_plan_id: Optional[UUID] = None
    sitting_id: Optional[UUID] = None

class MultiToothTreatmentIn(BaseModel):
    tooth_numbers: List[int]
    treatment_type: str
    notes: Optional[str] = None
    treatment_plan_id: Optional[UUID] = None


@tooth_router.get("/patient/{patient_id}")
async def get_teeth_status(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get full tooth status for patient (all 32 teeth + conditions + active treatments)"""
    conditions = (await db.execute(sql_text("""
        SELECT tooth_number, condition, surface, severity, notes, recorded_at
        FROM tooth_conditions
        WHERE patient_id = :pid AND is_active = TRUE
        ORDER BY tooth_number
    """), {"pid": str(patient_id)})).mappings().all()

    treatments = (await db.execute(sql_text("""
        SELECT tooth_number, treatment_type, surface, status, notes,
               planned_at, started_at, completed_at
        FROM tooth_treatments
        WHERE patient_id = :pid
        ORDER BY tooth_number, planned_at DESC
    """), {"pid": str(patient_id)})).mappings().all()

    # Group by tooth number
    teeth: dict = {}
    for c in conditions:
        teeth[c["tooth_number"]] = {
            "tooth_number": c["tooth_number"],
            "condition": c["condition"],
            "surface": c["surface"],
            "severity": c["severity"],
            "notes": c["notes"],
            "treatments": [],
        }
    for t in treatments:
        tn = t["tooth_number"]
        if tn not in teeth:
            teeth[tn] = {"tooth_number": tn, "condition": "healthy", "treatments": []}
        teeth[tn]["treatments"].append({
            "treatment_type": t["treatment_type"],
            "surface": t["surface"],
            "status": t["status"],
            "notes": t["notes"],
            "planned_at": t["planned_at"].isoformat() if t["planned_at"] else None,
            "completed_at": t["completed_at"].isoformat() if t["completed_at"] else None,
        })

    return {"patient_id": str(patient_id), "teeth": list(teeth.values())}


@tooth_router.post("/{tooth_number}/condition")
async def set_condition(
    tooth_number: int,
    patient_id: UUID,
    body: ToothConditionIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Set tooth condition (deactivates prior active conditions for this tooth)"""
    # Deactivate prior
    await db.execute(sql_text("""
        UPDATE tooth_conditions SET is_active = FALSE
        WHERE patient_id = :pid AND tooth_number = :tn AND is_active = TRUE
    """), {"pid": str(patient_id), "tn": tooth_number})

    # Insert new
    await db.execute(sql_text("""
        INSERT INTO tooth_conditions
        (patient_id, tooth_number, condition, surface, severity, notes, recorded_by)
        VALUES (:pid, :tn, :cond, :sur, :sev, :n, :rb)
    """), {
        "pid": str(patient_id), "tn": tooth_number,
        "cond": body.condition, "sur": body.surface, "sev": body.severity,
        "n": body.notes, "rb": str(staff["staff_id"]) if staff else None,
    })
    await db.flush()
    return {"updated": True, "tooth_number": tooth_number, "condition": body.condition}


@tooth_router.post("/treatment")
async def assign_treatment(
    patient_id: UUID,
    body: ToothTreatmentIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Assign treatment to a tooth"""
    row = (await db.execute(sql_text("""
        INSERT INTO tooth_treatments
        (patient_id, tooth_number, treatment_plan_id, sitting_id,
         treatment_type, surface, notes, status)
        VALUES (:pid, :tn, :plan, :sit, :tt, :sur, :n, 'planned')
        RETURNING id
    """), {
        "pid": str(patient_id), "tn": body.tooth_number,
        "plan": str(body.treatment_plan_id) if body.treatment_plan_id else None,
        "sit": str(body.sitting_id) if body.sitting_id else None,
        "tt": body.treatment_type, "sur": body.surface, "n": body.notes,
    })).mappings().one()
    await db.flush()
    return {"id": str(row["id"]), "tooth_number": body.tooth_number}


@tooth_router.post("/multi-treatment")
async def multi_treatment(
    patient_id: UUID,
    body: MultiToothTreatmentIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Assign same treatment to multiple teeth (e.g., bridge, ortho)"""
    inserted = []
    for tn in body.tooth_numbers:
        if not (11 <= tn <= 48): continue
        row = (await db.execute(sql_text("""
            INSERT INTO tooth_treatments
            (patient_id, tooth_number, treatment_plan_id, treatment_type, notes, status)
            VALUES (:pid, :tn, :plan, :tt, :n, 'planned')
            RETURNING id
        """), {
            "pid": str(patient_id), "tn": tn,
            "plan": str(body.treatment_plan_id) if body.treatment_plan_id else None,
            "tt": body.treatment_type, "n": body.notes,
        })).mappings().one()
        inserted.append({"id": str(row["id"]), "tooth_number": tn})
    await db.flush()
    return {"count": len(inserted), "treatments": inserted}


@tooth_router.post("/treatment/{treatment_id}/status")
async def update_treatment_status(
    treatment_id: UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Update treatment status: planned → in_progress → completed"""
    if new_status not in ("planned", "in_progress", "completed"):
        raise HTTPException(400, "Invalid status")

    set_clause = "status = :st"
    if new_status == "in_progress":
        set_clause += ", started_at = NOW()"
    elif new_status == "completed":
        set_clause += ", completed_at = NOW(), completed_by = :cb"

    await db.execute(sql_text(f"""
        UPDATE tooth_treatments SET {set_clause}
        WHERE id = :id
    """), {"st": new_status, "cb": str(staff["staff_id"]) if staff else None, "id": str(treatment_id)})
    await db.flush()
    return {"updated": True, "new_status": new_status}


@tooth_router.get("/patient/{patient_id}/history")
async def tooth_history(
    patient_id: UUID,
    tooth_number: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get treatment history for one tooth or all teeth"""
    sql = """
        SELECT tooth_number, treatment_type, surface, status, notes,
               planned_at, started_at, completed_at,
               (SELECT name FROM staff WHERE id = completed_by) AS completed_by_name
        FROM tooth_treatments WHERE patient_id = :pid
    """
    params = {"pid": str(patient_id)}
    if tooth_number:
        sql += " AND tooth_number = :tn"
        params["tn"] = tooth_number
    sql += " ORDER BY planned_at DESC"

    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return [{
        "tooth_number": r["tooth_number"],
        "treatment_type": r["treatment_type"],
        "surface": r["surface"],
        "status": r["status"],
        "notes": r["notes"],
        "planned_at": r["planned_at"].isoformat() if r["planned_at"] else None,
        "started_at": r["started_at"].isoformat() if r["started_at"] else None,
        "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
        "completed_by_name": r["completed_by_name"],
    } for r in rows]


# ═══════════════════════════════════════════════════════════════════════════
# SPRINT 15: RVG IMAGE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

class ImageAnnotationIn(BaseModel):
    annotation_type: str  # text/arrow/circle/freehand/measurement
    annotation_data: dict


@image_router.post("/upload", status_code=201)
async def upload_image(
    patient_id: UUID = Form(...),
    clinic_id: UUID = Form(...),
    image_type: str = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    linked_tooth_number: Optional[int] = Form(None),
    linked_plan_id: Optional[UUID] = Form(None),
    linked_sitting_id: Optional[UUID] = Form(None),
    captured_date: Optional[date_type] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Upload a patient image (RVG/OPG/CBCT/clinical photo)"""
    # Validate type/size before touching disk
    ext = safe_ext(file.filename)
    content = await file.read()
    check_size(content)
    safe_type = re.sub(r"[^A-Za-z0-9_-]", "", image_type)[:40] or "img"

    # Save file to disk
    upload_dir = f"uploads/patient_media/{patient_id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Unique filename (uuid suffix so same-second uploads never collide)
    fname = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_type}_{uuid4().hex[:8]}{ext}"
    fpath = os.path.join(upload_dir, fname)

    with open(fpath, "wb") as f:
        f.write(content)
    
    file_size = len(content)
    image_url = f"/uploads/patient_media/{patient_id}/{fname}"
    
    # Save record
    row = (await db.execute(sql_text("""
        INSERT INTO patient_images
        (patient_id, clinic_id, image_url, image_type, title, description,
         file_size_bytes, mime_type, linked_tooth_number, linked_plan_id,
         linked_sitting_id, captured_date, uploaded_by)
        VALUES (:pid, :cid, :url, :it, :title, :desc, :sz, :mt, :tn, :plan,
                :sit, :cd, :ub)
        RETURNING id, uploaded_at
    """), {
        "pid": str(patient_id), "cid": str(clinic_id),
        "url": image_url, "it": image_type,
        "title": title, "desc": description,
        "sz": file_size, "mt": file.content_type or "image/jpeg",
        "tn": linked_tooth_number,
        "plan": str(linked_plan_id) if linked_plan_id else None,
        "sit": str(linked_sitting_id) if linked_sitting_id else None,
        "cd": captured_date or date_type.today(),
        "ub": str(staff["staff_id"]) if staff else None,
    })).mappings().one()
    await db.flush()
    return {
        "id": str(row["id"]),
        "image_url": image_url,
        "uploaded_at": row["uploaded_at"].isoformat(),
        "file_size_bytes": file_size,
    }


@image_router.get("/patient/{patient_id}")
async def get_patient_images(
    patient_id: UUID,
    image_type: Optional[str] = None,
    tooth_number: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get all images for a patient (optionally filtered)"""
    sql = """
        SELECT id, image_url, thumbnail_url, image_type, title, description,
               linked_tooth_number, captured_date, uploaded_at,
               (SELECT name FROM staff WHERE id = uploaded_by) AS uploaded_by_name,
               (SELECT COUNT(*) FROM image_annotations WHERE image_id = patient_images.id) AS annotation_count
        FROM patient_images
        WHERE patient_id = :pid AND is_active = TRUE
    """
    params = {"pid": str(patient_id)}
    if image_type:
        sql += " AND image_type = :it"
        params["it"] = image_type
    if tooth_number:
        sql += " AND linked_tooth_number = :tn"
        params["tn"] = tooth_number
    sql += " ORDER BY captured_date DESC NULLS LAST, uploaded_at DESC"

    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return [{
        "id": str(r["id"]),
        "image_url": r["image_url"],
        "thumbnail_url": r["thumbnail_url"] or r["image_url"],
        "image_type": r["image_type"],
        "title": r["title"],
        "description": r["description"],
        "linked_tooth_number": r["linked_tooth_number"],
        "captured_date": r["captured_date"].isoformat() if r["captured_date"] else None,
        "uploaded_at": r["uploaded_at"].isoformat() if r["uploaded_at"] else None,
        "uploaded_by_name": r["uploaded_by_name"],
        "annotation_count": r["annotation_count"],
    } for r in rows]


@image_router.get("/{image_id}")
async def get_image_detail(
    image_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get image with annotations"""
    img = (await db.execute(sql_text("""
        SELECT * FROM patient_images WHERE id = :id
    """), {"id": str(image_id)})).mappings().one_or_none()
    if not img:
        raise HTTPException(404, "Image not found")

    annots = (await db.execute(sql_text("""
        SELECT id, annotation_type, annotation_data, added_at,
               (SELECT name FROM staff WHERE id = added_by) AS added_by_name
        FROM image_annotations WHERE image_id = :id
        ORDER BY added_at
    """), {"id": str(image_id)})).mappings().all()

    return {
        "id": str(img["id"]),
        "image_url": img["image_url"],
        "image_type": img["image_type"],
        "title": img["title"],
        "description": img["description"],
        "linked_tooth_number": img["linked_tooth_number"],
        "captured_date": img["captured_date"].isoformat() if img["captured_date"] else None,
        "annotations": [{
            "id": str(a["id"]),
            "annotation_type": a["annotation_type"],
            "annotation_data": a["annotation_data"],
            "added_at": a["added_at"].isoformat() if a["added_at"] else None,
            "added_by_name": a["added_by_name"],
        } for a in annots],
    }


@image_router.post("/{image_id}/annotation", status_code=201)
async def add_annotation(
    image_id: UUID,
    body: ImageAnnotationIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Add annotation to image"""
    row = (await db.execute(sql_text("""
        INSERT INTO image_annotations
        (image_id, annotation_type, annotation_data, added_by)
        VALUES (:img, :t, CAST(:d AS JSONB), :ab)
        RETURNING id
    """), {
        "img": str(image_id),
        "t": body.annotation_type,
        "d": json.dumps(body.annotation_data),
        "ab": str(staff["staff_id"]) if staff else None,
    })).mappings().one()
    await db.flush()
    return {"id": str(row["id"])}


@image_router.delete("/{image_id}")
async def delete_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Soft-delete image"""
    await db.execute(sql_text("""
        UPDATE patient_images SET is_active = FALSE WHERE id = :id
    """), {"id": str(image_id)})
    await db.flush()
    return {"deleted": True}
