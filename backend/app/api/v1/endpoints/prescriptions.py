"""Prescriptions with AI generation"""
from datetime import datetime, timezone, date, timedelta
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text as sql_text
import httpx, json, re
from app.core.database import get_db
from app.core.security import get_current_staff, create_rx_pdf_token, verify_rx_pdf_token, security
from app.core.config import get_settings
from app.models.models import Prescription, MedicineReminder, Appointment, Patient, Clinic, Staff, PatientHealth
from app.schemas.schemas import PrescriptionCreate, PrescriptionAIRequest, PrescriptionOut, MedicineItem
from app.services.messaging import send_message

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])
settings = get_settings()

@router.post("/ai-generate")
async def ai_generate(req: PrescriptionAIRequest, staff=Depends(get_current_staff)):
    if not settings.ANTHROPIC_API_KEY:
        return {"medicines": [{"name": req.raw_notes, "strength": "", "dose": "As directed", "frequency": "As directed", "duration": "As directed", "instructions": "As directed"}], "advice": ["Follow doctor's instructions"], "followup": "As advised"}
    try:
        system = "You are a dental prescription formatter. ONLY structure what doctor writes. NEVER add/change medicines. Expand abbreviations (tds=Three times daily, bd=Twice daily, od=Once daily, sos=As needed). Output ONLY JSON: {medicines: [{name,strength,dose,frequency,duration,instructions}], advice: [], followup: ''}"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post("https://api.anthropic.com/v1/messages", headers={"x-api-key": settings.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-sonnet-4-20250514", "max_tokens": 1024, "system": system, "messages": [{"role": "user", "content": f"Patient: {req.patient_name or 'N/A'}, Age: {req.patient_age or 'N/A'}\nNotes: {req.raw_notes}"}]})
        text = r.json()["content"][0]["text"].strip()
        if text.startswith("```"): text = text.split("\n", 1)[1]
        if text.endswith("```"): text = text.rsplit("```", 1)[0]
        return json.loads(text.strip())
    except: return {"medicines": [{"name": req.raw_notes, "strength": "", "dose": "As directed", "frequency": "As directed", "duration": "", "instructions": ""}], "advice": [], "followup": ""}

@router.post("/", response_model=PrescriptionOut, status_code=201)
async def create_rx(req: PrescriptionCreate, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    # Get next serial number
    max_sn = (await db.execute(select(func.coalesce(func.max(Prescription.serial_number), 0)).where(Prescription.clinic_id == req.clinic_id))).scalar()
    rx = Prescription(serial_number=(max_sn or 0) + 1, appointment_id=req.appointment_id, plan_id=req.plan_id,
                      patient_id=req.patient_id, doctor_id=req.doctor_id, clinic_id=req.clinic_id,
                      complaint=req.complaint, diagnosis=req.diagnosis, doctor_raw_notes=req.doctor_raw_notes,
                      medicines=[m.model_dump() for m in req.medicines], visible_advice=req.visible_advice,
                      internal_notes=req.internal_notes, followup_date=req.followup_date)
    db.add(rx); await db.flush(); await db.refresh(rx)
    # Create medicine reminders
    freq_map = {"Once daily": ["08:00"], "Twice daily": ["08:00","20:00"], "Three times daily": ["08:00","14:00","20:00"], "Before breakfast": ["07:30"], "At bedtime": ["21:00"]}
    for med in req.medicines:
        dur = 5
        m = re.search(r"(\d+)", med.duration or "5")
        if m: dur = int(m.group(1))
        times = freq_map.get(med.frequency, ["08:00"])
        db.add(MedicineReminder(prescription_id=rx.id, patient_id=req.patient_id, medicine_name=med.name,
                                dose=med.dose, frequency=med.frequency, start_date=date.today(),
                                end_date=date.today() + timedelta(days=dur), reminder_times=times, is_active=True))
    await db.flush()
    return PrescriptionOut.model_validate(rx)

@router.get("/patient/{pid}", response_model=list[PrescriptionOut])
async def patient_rxs(pid: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    result = await db.execute(select(Prescription).where(Prescription.patient_id == pid).order_by(Prescription.created_at.desc()))
    return [PrescriptionOut.model_validate(rx) for rx in result.scalars().all()]

@router.post("/{rx_id}/send")
async def send_rx(rx_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Send prescription via WhatsApp + auto-mark appointment as done."""
    rx = (await db.execute(select(Prescription).where(Prescription.id == rx_id))).scalar_one_or_none()
    if not rx:
        raise HTTPException(404)
    patient = (await db.execute(select(Patient).where(Patient.id == rx.patient_id))).scalar_one_or_none()
    doctor = (await db.execute(select(Staff).where(Staff.id == rx.doctor_id))).scalar_one_or_none()
    clinic = (await db.execute(select(Clinic).where(Clinic.id == rx.clinic_id))).scalar_one_or_none()

    med_lines = []
    for m in rx.medicines or []:
        if isinstance(m, dict):
            line = f"• {m.get('name', '')}"
            if m.get("dose"):
                line += f" — {m['dose']}"
            if m.get("frequency"):
                line += f", {m['frequency']}"
            if m.get("duration"):
                line += f" for {m['duration']}"
            med_lines.append(line)
    rx_text = "\n".join(med_lines)
    if rx.diagnosis:
        rx_text = f"Diagnosis: {rx.diagnosis}\n\n{rx_text}" if rx_text else f"Diagnosis: {rx.diagnosis}"
    if rx.visible_advice:
        rx_text += f"\n\nAdvice: {rx.visible_advice}"

    pdf_access = create_rx_pdf_token(str(rx_id))
    rx.pdf_url = pdf_access

    whatsapp = {"status": "skipped", "reason": "no_phone"}
    if patient and patient.phone:
        try:
            whatsapp = await send_message(
                db=db,
                clinic_id=str(rx.clinic_id),
                template_key="phone_consult_rx",
                recipient_kind="patient",
                recipient_id=str(patient.id),
                recipient_phone=patient.phone,
                recipient_name=patient.name,
                variables={
                    "patient_name": patient.name,
                    "doctor_name": doctor.name if doctor else (clinic.doctor_name if clinic else "Doctor"),
                    "rx_text": rx_text or "Please see your prescription PDF.",
                    "rx_pdf": f"/api/v1/prescriptions/{rx_id}/pdf?access_token={pdf_access}",
                    "followup_date": str(rx.followup_date) if rx.followup_date else "—",
                },
                appointment_id=str(rx.appointment_id) if rx.appointment_id else None,
                trigger="event",
                created_by=str(staff["staff_id"]),
            )
        except Exception as exc:
            whatsapp = {"status": "failed", "error": str(exc)[:300]}

    rx.sent_via_whatsapp = whatsapp.get("status") in ("sent", "manual_pending", "queued")
    rx.sent_at = datetime.now(timezone.utc)
    if rx.appointment_id:
        apt = (await db.execute(select(Appointment).where(Appointment.id == rx.appointment_id))).scalar_one_or_none()
        if apt and apt.status in ("in_progress", "arrived", "confirmed"):
            apt.status = "done"
            apt.completed_at = datetime.now(timezone.utc)
            apt.updated_at = datetime.now(timezone.utc)
            p = (await db.execute(select(Patient).where(Patient.id == apt.patient_id))).scalar_one_or_none()
            if p:
                p.total_visits = (p.total_visits or 0) + 1
    await db.flush()
    return {"status": "sent_and_done", "prescription_id": str(rx_id), "whatsapp": whatsapp}

@router.get("/{rx_id}/pdf")
async def get_pdf(
    rx_id: UUID,
    access_token: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Generate prescription PDF — staff JWT or patient access_token required."""
    authorized = False
    if credentials and credentials.credentials:
        try:
            await get_current_staff(credentials)
            authorized = True
        except HTTPException:
            pass
    if not authorized and access_token and verify_rx_pdf_token(access_token, str(rx_id)):
        authorized = True
    if not authorized:
        raise HTTPException(401, "Authentication required — use staff login or a valid Rx access link")
    from fastapi.responses import Response
    from app.services.pdf_generator import generate_prescription_pdf
    rx = (await db.execute(select(Prescription).where(Prescription.id == rx_id))).scalar_one_or_none()
    if not rx: raise HTTPException(404, "Prescription not found")
    patient = (await db.execute(select(Patient).where(Patient.id == rx.patient_id))).scalar_one_or_none()
    clinic = (await db.execute(select(Clinic).where(Clinic.id == rx.clinic_id))).scalar_one_or_none()
    doctor = (await db.execute(select(Staff).where(Staff.id == rx.doctor_id))).scalar_one_or_none()
    health = (await db.execute(select(PatientHealth).where(PatientHealth.patient_id == rx.patient_id))).scalar_one_or_none()
    alerts = []
    if health:
        if health.diabetes: alerts.append("Diabetic")
        if health.hypertension: alerts.append("High BP")
        if health.blood_thinner: alerts.append("Blood thinners")
        if health.pregnant: alerts.append("Pregnant")
        if health.allergies and health.allergies.strip(): alerts.append(f"Allergy: {health.allergies}")

    complaint = ""
    procedures_done_list = []
    if rx.complaint:
        complaint = rx.complaint
    if rx.appointment_id:
        apt = (await db.execute(select(Appointment).where(Appointment.id == rx.appointment_id))).scalar_one_or_none()
        if apt:
            complaint = complaint or apt.reason or ""
    if rx.doctor_raw_notes:
        procedures_done_list = [{"name": p.strip()} for p in re.split(r"[;,]", rx.doctor_raw_notes) if p.strip()]

    oral_rows = (await db.execute(sql_text("""
        SELECT tooth_number, finding, notes FROM tooth_examinations
        WHERE patient_id=:p AND is_active=TRUE ORDER BY recorded_at
    """), {"p": str(rx.patient_id)})).mappings().all()
    oral_examination = "; ".join(
        f"Tooth {r['tooth_number']}: {r['finding']}" + (f" ({r['notes']})" if r['notes'] else "")
        for r in oral_rows
    )
    plan_rows = []
    if rx.plan_id:
        plan_rows = (await db.execute(sql_text("""
            SELECT procedure_name, teeth, area_label FROM treatment_plan_items
            WHERE plan_id=:pl AND status <> 'cancelled' ORDER BY created_at
        """), {"pl": str(rx.plan_id)})).mappings().all()
    treatment_planned = "; ".join(
        f"{r['procedure_name']} ({', '.join(map(str, r['teeth'] or [])) or r['area_label'] or 'General'})"
        for r in plan_rows
    )

    pdf = generate_prescription_pdf(
        clinic_name=clinic.name if clinic else "Siya Dental Care",
        clinic_address=clinic.address if clinic else "",
        clinic_phone=clinic.phone if clinic else "",
        clinic_tagline="Implant & Orthodontic Centre",
        doctor_name=clinic.doctor_name if clinic else (doctor.name if doctor else ""),
        doctor_degree=clinic.doctor_degree if clinic else "",
        doctor_reg_no=clinic.doctor_reg_no if clinic else "",
        patient_name=patient.name if patient else "",
        patient_age=patient.age if patient else 0,
        patient_gender=patient.gender if patient else "",
        patient_phone=patient.phone if patient else "",
        patient_id=str(patient.id)[:8] if patient else "",
        complaint=complaint,
        oral_examination=oral_examination,
        diagnosis=rx.diagnosis or "",
        treatment_planned=treatment_planned,
        procedures_done=procedures_done_list if procedures_done_list else None,
        doctor_notes=rx.internal_notes or "",
        medicines=rx.medicines or [],
        advice=rx.visible_advice.split("\n") if rx.visible_advice else [],
        followup_date=str(rx.followup_date) if rx.followup_date else None,
        health_alerts=alerts if alerts else None,
    )
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"inline; filename=Rx_{patient.name.replace(' ','_') if patient else 'patient'}_{date.today()}.pdf"})
