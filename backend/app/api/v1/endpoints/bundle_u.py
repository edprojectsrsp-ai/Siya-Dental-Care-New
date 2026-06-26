from __future__ import annotations

import io
import json
import secrets
from datetime import date as date_type, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.messaging import send_message

router = APIRouter(tags=["Bundle U"])
scheduler_router = APIRouter(tags=["Bundle U Jobs"])


def _require_staff_roles(staff, *roles: str):
    if staff.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")


def _parse_hhmm(value: Optional[str]):
    if not value:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).time()
        except ValueError:
            pass
    raise HTTPException(400, "Invalid time format. Use HH:MM")


def _parse_iso_date(value: str):
    try:
        return date_type.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD") from exc


async def _resolve_portal_token(token: str, db: AsyncSession) -> str:
    row = (
        await db.execute(
            sql_text(
                """
                SELECT patient_id, expires_at
                FROM patient_portal_tokens
                WHERE token = :token
                """
            ),
            {"token": token},
        )
    ).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Invalid token")
    expires_at = row["expires_at"]
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Token expired")
    await db.execute(
        sql_text(
            """
            UPDATE patient_portal_tokens
            SET used_count = COALESCE(used_count, 0) + 1,
                last_used_at = NOW()
            WHERE token = :token
            """
        ),
        {"token": token},
    )
    return str(row["patient_id"])


class ReminderSettingsIn(BaseModel):
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    appt_24h_enabled: Optional[bool] = None
    appt_24h_send_time: Optional[str] = None
    appt_2h_enabled: Optional[bool] = None
    appt_30m_enabled: Optional[bool] = None
    followup_day_enabled: Optional[bool] = None
    followup_day_send_time: Optional[str] = None
    followup_1day_before_enabled: Optional[bool] = None
    followup_7day_before_enabled: Optional[bool] = None
    payment_3day_enabled: Optional[bool] = None
    payment_7day_enabled: Optional[bool] = None
    birthday_enabled: Optional[bool] = None
    birthday_send_time: Optional[str] = None
    morning_digest_enabled: Optional[bool] = None
    morning_digest_send_time: Optional[str] = None


class PortalRescheduleIn(BaseModel):
    appointment_id: str
    requested_date: str
    requested_time: Optional[str] = None
    reason: Optional[str] = None


class SmileSessionIn(BaseModel):
    patient_id: Optional[str] = None
    before_image_url: str
    after_image_url: Optional[str] = None
    whitening_level: int = 5
    gum_contour_level: int = 0
    alignment_overlay: bool = False
    shade_preset: str = "A2"
    notes: Optional[str] = None


class TemplateIn(BaseModel):
    template_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    default_sittings: int = 1
    estimated_cost: Optional[float] = None
    procedures: list[dict] = Field(default_factory=list)
    default_medicines: list[dict] = Field(default_factory=list)
    default_advice: Optional[str] = None


@router.get("/settings/reminders")
async def get_reminder_settings(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse")
    row = (
        await db.execute(
            sql_text("SELECT * FROM reminder_settings WHERE clinic_id = :cid"),
            {"cid": str(clinic_id)},
        )
    ).mappings().one_or_none()
    if not row:
        await db.execute(
            sql_text("INSERT INTO reminder_settings (clinic_id) VALUES (:cid) ON CONFLICT (clinic_id) DO NOTHING"),
            {"cid": str(clinic_id)},
        )
        row = (
            await db.execute(
                sql_text("SELECT * FROM reminder_settings WHERE clinic_id = :cid"),
                {"cid": str(clinic_id)},
            )
        ).mappings().one()
    return dict(row)


@router.put("/settings/reminders")
async def update_reminder_settings(
    clinic_id: UUID,
    body: ReminderSettingsIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin")
    fields = body.model_dump(exclude_none=True, exclude_unset=True)
    for key in ("appt_24h_send_time", "followup_day_send_time", "birthday_send_time", "morning_digest_send_time"):
        if key in fields:
            fields[key] = _parse_hhmm(fields[key])
    if not fields:
        return {"updated": False}
    set_bits = [f"{key} = :{key}" for key in fields]
    set_bits.append("updated_at = NOW()")
    params = {"cid": str(clinic_id), **fields}
    await db.execute(
        sql_text(
            f"""
            INSERT INTO reminder_settings (clinic_id)
            VALUES (:cid)
            ON CONFLICT (clinic_id) DO NOTHING
            """
        ),
        {"cid": str(clinic_id)},
    )
    await db.execute(
        sql_text(f"UPDATE reminder_settings SET {', '.join(set_bits)} WHERE clinic_id = :cid"),
        params,
    )
    return {"updated": True}


@router.post("/portal/generate-token")
async def generate_portal_token(
    patient_id: UUID,
    expires_days: int = 30,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse", "receptionist")
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=expires_days)
    await db.execute(
        sql_text(
            """
            INSERT INTO patient_portal_tokens (patient_id, token, expires_at)
            VALUES (:pid, :token, :expires_at)
            """
        ),
        {"pid": str(patient_id), "token": token, "expires_at": expires_at},
    )
    return {"token": token, "portal_url": f"/p/{token}", "expires_at": expires_at.isoformat()}


@router.get("/portal/{token}/dashboard")
async def portal_dashboard(token: str, db: AsyncSession = Depends(get_db)):
    patient_id = await _resolve_portal_token(token, db)
    patient = (
        await db.execute(
            sql_text("SELECT id, name AS full_name, phone, NULL::TEXT AS email, preferred_clinic_id AS clinic_id FROM patients WHERE id = :pid"),
            {"pid": patient_id},
        )
    ).mappings().one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")
    upcoming = (
        await db.execute(
            sql_text(
                """
                SELECT a.id,
                       COALESCE(a.confirmed_date, a.requested_date) AS appointment_date,
                       COALESCE(a.confirmed_time, a.requested_time) AS appointment_time,
                       COALESCE(a.workflow_status, a.status) AS status,
                       a.contact_status,
                       CASE
                         WHEN a.contact_status = 'pending_call' THEN 'awaiting_confirmation'
                         WHEN a.contact_status = 'confirmed' THEN 'confirmed'
                         WHEN a.contact_status = 'rescheduled' THEN 'rescheduled'
                         ELSE 'scheduled'
                       END AS portal_status,
                       a.reason AS illness,
                       s.name AS doctor_name
                FROM appointments a
                LEFT JOIN staff s ON s.id = a.doctor_id
                WHERE a.patient_id = :pid
                  AND COALESCE(a.confirmed_date, a.requested_date) >= CURRENT_DATE
                  AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled', 'completed', 'done')
                ORDER BY COALESCE(a.confirmed_date, a.requested_date), COALESCE(a.confirmed_time, a.requested_time)
                LIMIT 10
                """
            ),
            {"pid": patient_id},
        )
    ).mappings().all()
    past_rx = (
        await db.execute(
            sql_text(
                """
                SELECT id, created_at, complaint, followup_date, 'confirmed'::TEXT AS status
                FROM prescriptions
                WHERE patient_id = :pid
                  AND created_at >= NOW() - INTERVAL '12 months'
                ORDER BY created_at DESC
                LIMIT 20
                """
            ),
            {"pid": patient_id},
        )
    ).mappings().all()
    payment_summary = (
        await db.execute(
            sql_text(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_paid,
                       COUNT(*) AS total_transactions
                FROM payment_transactions
                WHERE patient_id = :pid
                """
            ),
            {"pid": patient_id},
        )
    ).mappings().one()
    pending = (
        await db.execute(
            sql_text(
                """
                SELECT id,
                       COALESCE(final_payable, estimated_cost, 0) AS total_cost,
                       COALESCE(total_paid, 0) AS paid_amount,
                       COALESCE(balance, COALESCE(final_payable, estimated_cost, 0) - COALESCE(total_paid, 0)) AS pending_amount
                FROM treatment_plans
                WHERE patient_id = :pid
                  AND COALESCE(balance, 0) > 0
                  AND COALESCE(status, '') <> 'cancelled'
                ORDER BY created_at DESC
                """
            ),
            {"pid": patient_id},
        )
    ).mappings().all()
    return {
        "patient": dict(patient),
        "upcoming_appointments": [dict(row) for row in upcoming],
        "past_prescriptions": [dict(row) for row in past_rx],
        "payment_summary": dict(payment_summary),
        "pending_payments": [dict(row) for row in pending],
    }


@router.post("/portal/{token}/reschedule")
async def portal_reschedule(token: str, body: PortalRescheduleIn, db: AsyncSession = Depends(get_db)):
    patient_id = await _resolve_portal_token(token, db)
    apt = (
        await db.execute(
            sql_text("SELECT id, clinic_id FROM appointments WHERE id = :aid AND patient_id = :pid"),
            {"aid": body.appointment_id, "pid": patient_id},
        )
    ).mappings().one_or_none()
    if not apt:
        raise HTTPException(404, "Appointment not found")
    await db.execute(
        sql_text(
            """
            INSERT INTO reschedule_requests
                (id, clinic_id, patient_id, appointment_id, requested_date, requested_time, reason)
            VALUES
                (:id, :clinic_id, :patient_id, :appointment_id, :requested_date, :requested_time, :reason)
            """
        ),
        {
            "id": str(uuid4()),
            "clinic_id": str(apt["clinic_id"]),
            "patient_id": patient_id,
            "appointment_id": body.appointment_id,
            "requested_date": _parse_iso_date(body.requested_date),
            "requested_time": _parse_hhmm(body.requested_time),
            "reason": body.reason,
        },
    )
    return {"status": "pending"}


@router.get("/reschedule-requests")
async def list_reschedule_requests(
    clinic_id: UUID,
    status: str = "pending",
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse", "receptionist")
    rows = (
        await db.execute(
            sql_text(
                """
                SELECT rr.id, rr.patient_id, rr.appointment_id, rr.requested_date, rr.requested_time,
                       rr.reason, rr.created_at, rr.status,
                       p.name AS full_name, p.phone,
                       COALESCE(a.confirmed_date, a.requested_date) AS original_date
                FROM reschedule_requests rr
                JOIN patients p ON p.id = rr.patient_id
                JOIN appointments a ON a.id = rr.appointment_id
                WHERE rr.clinic_id = :cid AND rr.status = :status
                ORDER BY rr.created_at DESC
                """
            ),
            {"cid": str(clinic_id), "status": status},
        )
    ).mappings().all()
    return {"requests": [dict(row) for row in rows]}


@router.patch("/reschedule-requests/{request_id}/resolve")
async def resolve_reschedule_request(
    request_id: UUID,
    approve: bool,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse")
    req = (
        await db.execute(sql_text("SELECT * FROM reschedule_requests WHERE id = :id"), {"id": str(request_id)})
    ).mappings().one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    new_status = "approved" if approve else "declined"
    await db.execute(
        sql_text(
            """
            UPDATE reschedule_requests
            SET status = :status,
                resolved_by = :resolved_by,
                resolved_at = NOW()
            WHERE id = :id
            """
        ),
        {"status": new_status, "resolved_by": str(staff["staff_id"]), "id": str(request_id)},
    )
    if approve:
        await db.execute(
            sql_text(
                """
                UPDATE appointments
                SET requested_date = :requested_date,
                    requested_time = COALESCE(:requested_time, requested_time),
                    confirmed_date = NULL,
                    confirmed_time = NULL,
                    contact_status = 'rescheduled',
                    workflow_status = 'scheduled',
                    status = 'scheduled',
                    updated_at = NOW()
                WHERE id = :appointment_id
                """
            ),
            {
                "requested_date": req["requested_date"],
                "requested_time": req["requested_time"],
                "appointment_id": str(req["appointment_id"]),
            },
        )
    return {"status": new_status}


@router.post("/smile-sessions")
async def create_smile_session(
    clinic_id: UUID,
    body: SmileSessionIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse")
    session_id = str(uuid4())
    await db.execute(
        sql_text(
            """
            INSERT INTO smile_sessions
                (id, clinic_id, patient_id, before_image_url, after_image_url, whitening_level,
                 gum_contour_level, alignment_overlay, shade_preset, notes)
            VALUES
                (:id, :clinic_id, :patient_id, :before_image_url, :after_image_url, :whitening_level,
                 :gum_contour_level, :alignment_overlay, :shade_preset, :notes)
            """
        ),
        {"id": session_id, "clinic_id": str(clinic_id), **body.model_dump()},
    )
    return {"session_id": session_id}


@router.get("/treatment-templates")
async def list_treatment_templates(
    clinic_id: UUID,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse")
    sql = """
        SELECT id, clinic_id, template_name, category, description, default_sittings,
               estimated_cost, procedures, default_medicines, default_advice, is_active
        FROM treatment_templates
        WHERE clinic_id = :cid AND is_active = TRUE AND template_name IS NOT NULL
    """
    params = {"cid": str(clinic_id)}
    if category:
        sql += " AND category = :category"
        params["category"] = category
    sql += " ORDER BY category NULLS LAST, template_name"
    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return {"templates": [dict(row) for row in rows]}


@router.post("/treatment-templates")
async def create_treatment_template(
    clinic_id: UUID,
    body: TemplateIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin")
    tid = str(uuid4())
    await db.execute(
        sql_text(
            """
            INSERT INTO treatment_templates
                (id, clinic_id, name, template_name, category, description, default_sittings,
                 estimated_cost, procedures, default_medicines, default_advice, items, created_by, is_active)
            VALUES
                (:id, :clinic_id, :name, :template_name, :category, :description, :default_sittings,
                 :estimated_cost, CAST(:procedures AS JSONB), CAST(:default_medicines AS JSONB), :default_advice,
                 '[]'::jsonb, :created_by, TRUE)
            """
        ),
        {
            "id": tid,
            "clinic_id": str(clinic_id),
            "name": body.template_name,
            "template_name": body.template_name,
            "category": body.category,
            "description": body.description,
            "default_sittings": body.default_sittings,
            "estimated_cost": body.estimated_cost,
            "procedures": json.dumps(body.procedures),
            "default_medicines": json.dumps(body.default_medicines),
            "default_advice": body.default_advice,
            "created_by": str(staff["staff_id"]),
        },
    )
    return {"template_id": tid}


@router.post("/treatment-plans/from-template/{template_id}")
async def create_plan_from_template(
    template_id: UUID,
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse")
    template = (
        await db.execute(
            sql_text("SELECT * FROM treatment_templates WHERE id = :id AND is_active = TRUE"),
            {"id": str(template_id)},
        )
    ).mappings().one_or_none()
    if not template:
        raise HTTPException(404, "Template not found")
    plan_id = str(uuid4())
    await db.execute(
        sql_text(
            """
            INSERT INTO treatment_plans
                (id, patient_id, clinic_id, doctor_id, name, plan_name, estimated_cost, final_payable,
                 total_paid, balance, total_sittings_planned, status, created_at, updated_at)
            VALUES
                (:id, :patient_id, :clinic_id, :doctor_id, :name, :plan_name, :estimated_cost, :final_payable,
                 0::numeric, COALESCE(:balance, 0::numeric), :total_sittings_planned, 'treatment_advised', NOW(), NOW())
            """
        ),
        {
            "id": plan_id,
            "patient_id": str(patient_id),
            "clinic_id": str(template["clinic_id"]),
            "doctor_id": str(staff["staff_id"]),
            "name": template["template_name"] or template["name"],
            "plan_name": template["template_name"] or template["name"],
            "estimated_cost": template["estimated_cost"],
            "final_payable": template["estimated_cost"],
            "balance": template["estimated_cost"],
            "total_sittings_planned": template["default_sittings"] or 1,
        },
    )
    procedures = template["procedures"] or []
    if isinstance(procedures, str):
        procedures = json.loads(procedures)
    for proc in procedures:
        await db.execute(
            sql_text(
                """
                INSERT INTO treatment_plan_items
                    (id, plan_id, procedure_name, status, notes, suggested_rate, doctor_rate, final_amount, created_at)
                VALUES
                    (:id, :plan_id, :procedure_name, 'advised', :notes, :rate, :rate, :rate, NOW())
                """
            ),
            {
                "id": str(uuid4()),
                "plan_id": plan_id,
                "procedure_name": proc.get("procedure_name") or "Template Procedure",
                "notes": proc.get("notes"),
                "rate": float(template["estimated_cost"] or 0) / max(len(procedures), 1) if template["estimated_cost"] else 0,
            },
        )
    await db.execute(
        sql_text("UPDATE treatment_templates SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = :id"),
        {"id": str(template_id)},
    )
    return {"plan_id": plan_id}


@router.get("/patients/{patient_id}/unified-pdf")
async def unified_patient_pdf(
    patient_id: UUID,
    months: int = Query(12, ge=1, le=36),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_staff_roles(staff, "doctor", "admin", "nurse", "receptionist")
    patient = (
        await db.execute(
            sql_text("SELECT id, name, phone, age, gender FROM patients WHERE id = :id"),
            {"id": str(patient_id)},
        )
    ).mappings().one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")
    prescriptions = (
        await db.execute(
            sql_text(
                """
                SELECT created_at, complaint
                FROM prescriptions
                WHERE patient_id = :id AND created_at >= NOW() - (:months_text || ' months')::interval
                ORDER BY created_at DESC
                LIMIT 20
                """
            ),
            {"id": str(patient_id), "months_text": str(months)},
        )
    ).mappings().all()
    plans = (
        await db.execute(
            sql_text(
                """
                SELECT created_at, COALESCE(plan_name, name) AS plan_name, status, COALESCE(final_payable, estimated_cost, 0) AS plan_value
                FROM treatment_plans
                WHERE patient_id = :id
                ORDER BY created_at DESC
                LIMIT 20
                """
            ),
            {"id": str(patient_id)},
        )
    ).mappings().all()
    payments = (
        await db.execute(
            sql_text(
                """
                SELECT date, amount, payment_mode
                FROM payment_transactions
                WHERE patient_id = :id
                ORDER BY created_at DESC
                LIMIT 20
                """
            ),
            {"id": str(patient_id)},
        )
    ).mappings().all()

    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 18 * mm
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(18 * mm, y, "Siya Dental Care - Patient Summary")
    y -= 10 * mm
    pdf.setFont("Helvetica", 11)
    pdf.drawString(18 * mm, y, f"Patient: {patient['name']}")
    y -= 6 * mm
    pdf.drawString(18 * mm, y, f"Phone: {patient['phone']}   Age/Gender: {patient['age'] or '-'} / {patient['gender'] or '-'}")
    y -= 10 * mm

    def draw_section(title: str, rows: list[str]):
        nonlocal y
        if y < 30 * mm:
            pdf.showPage()
            y = height - 18 * mm
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(18 * mm, y, title)
        y -= 6 * mm
        pdf.setFont("Helvetica", 10)
        if not rows:
            pdf.drawString(22 * mm, y, "- None")
            y -= 6 * mm
            return
        for row in rows[:12]:
            if y < 20 * mm:
                pdf.showPage()
                y = height - 18 * mm
                pdf.setFont("Helvetica", 10)
            pdf.drawString(22 * mm, y, row[:110])
            y -= 5 * mm
        y -= 3 * mm

    draw_section(
        "Prescriptions",
        [f"{row['created_at']:%d %b %Y} - {row['complaint'] or 'No complaint'}" for row in prescriptions],
    )
    draw_section(
        "Treatment Plans",
        [f"{row['created_at']:%d %b %Y} - {row['plan_name'] or 'Untitled'} - {row['status']} - Rs.{float(row['plan_value'] or 0):,.0f}" for row in plans],
    )
    draw_section(
        "Payments",
        [f"{row['date']} - Rs.{float(row['amount'] or 0):,.0f} via {row['payment_mode'] or 'unknown'}" for row in payments],
    )
    pdf.save()
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=patient_summary_{patient['name'].replace(' ', '_')}.pdf"},
    )
