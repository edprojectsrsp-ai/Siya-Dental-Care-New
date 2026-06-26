"""Siya Dental Care — Professional A4 Prescription PDF"""
from datetime import date, datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
import os

# Brand colors
RED = HexColor("#CC0000")
DARK = HexColor("#1a1a1a")
ACCENT = HexColor("#2563EB")
LIGHT = HexColor("#F0F4FF")
BORDER = HexColor("#D1D5DB")
GRAY = HexColor("#6B7280")
WHITE = HexColor("#FFFFFF")


def _styles():
    s = getSampleStyleSheet()
    defs = [
        ("ClinicName", 18, "Helvetica-Bold", RED, TA_CENTER, 2),
        ("ClinicSub", 10, "Helvetica", DARK, TA_CENTER, 2),
        ("DoctorName", 11, "Helvetica-Bold", DARK, TA_CENTER, 2),
        ("DoctorDeg", 9, "Helvetica", GRAY, TA_CENTER, 4),
        ("SectionTitle", 12, "Helvetica-Bold", ACCENT, TA_LEFT, 6),
        ("FieldLabel", 8, "Helvetica-Bold", GRAY, TA_LEFT, 0),
        ("FieldValue", 10, "Helvetica", DARK, TA_LEFT, 0),
        ("FieldValueBold", 10, "Helvetica-Bold", DARK, TA_LEFT, 0),
        ("MedName", 10, "Helvetica-Bold", DARK, TA_LEFT, 0),
        ("MedDetail", 9, "Helvetica", GRAY, TA_LEFT, 0),
        ("AdviceText", 10, "Helvetica", DARK, TA_LEFT, 2),
        ("AlertText", 9, "Helvetica-Bold", HexColor("#DC2626"), TA_LEFT, 2),
        ("Footer", 8, "Helvetica", GRAY, TA_CENTER, 0),
        ("RxSymbol", 16, "Helvetica-Bold", ACCENT, TA_LEFT, 0),
        ("SmallGray", 8, "Helvetica", GRAY, TA_LEFT, 0),
    ]
    for name, sz, fn, clr, al, sa in defs:
        s.add(ParagraphStyle(name=name, fontSize=sz, fontName=fn, textColor=clr, alignment=al, spaceAfter=sa, leading=sz * 1.3))
    return s


def generate_prescription_pdf(
    clinic_name="Siya Dental Care",
    clinic_address="",
    clinic_phone="",
    clinic_tagline="Implant & Orthodontic Centre",
    doctor_name="",
    doctor_degree="",
    doctor_reg_no="",
    patient_name="",
    patient_age=0,
    patient_gender="",
    patient_phone="",
    patient_id="",
    complaint="",
    diagnosis="",
    oral_examination="",
    treatment_planned="",
    doctor_notes="",
    procedures_done=None,
    history=None,
    medicines=None,
    advice=None,
    followup_date=None,
    followup_notes=None,
    health_alerts=None,
    logo_path=None,
):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=12 * mm, bottomMargin=15 * mm, leftMargin=12 * mm, rightMargin=12 * mm)
    s = _styles()
    story = []
    today = date.today().strftime("%d %B %Y")
    now_time = datetime.now().strftime("%I:%M %p")

    story.append(Paragraph(f"<font color='#CC0000'>{clinic_name}</font>", s["ClinicName"]))
    if clinic_tagline:
        story.append(Paragraph(clinic_tagline, ParagraphStyle(name="Tag", fontSize=10, fontName="Helvetica-Bold", textColor=HexColor("#6B21A8"), alignment=TA_CENTER, spaceAfter=2)))
    story.append(Paragraph(clinic_address, s["ClinicSub"]))
    story.append(Paragraph(f"📞 {clinic_phone}", s["ClinicSub"]))
    story.append(Spacer(1, 3))
    story.append(Paragraph(doctor_name, s["DoctorName"]))
    story.append(Paragraph(f"{doctor_degree} &nbsp;|&nbsp; Reg: {doctor_reg_no}", s["DoctorDeg"]))
    story.append(HRFlowable(width="100%", thickness=2, color=RED, spaceAfter=8, spaceBefore=4))

    pdata = [
        [Paragraph(f"<b>Patient:</b> {patient_name}", s["FieldValue"]),
         Paragraph(f"<b>Age / Gender:</b> {patient_age} / {patient_gender or '—'}", s["FieldValue"])],
        [Paragraph(f"<b>Phone:</b> {patient_phone}", s["FieldValue"]),
         Paragraph(f"<b>Date:</b> {today} &nbsp; <b>Time:</b> {now_time}", s["FieldValue"])],
    ]
    pt = Table(pdata, colWidths=["50%", "50%"])
    pt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 1, ACCENT),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(pt)

    if health_alerts:
        story.append(Spacer(1, 6))
        alert_text = " &nbsp;|&nbsp; ".join([f"⚠ {a}" for a in health_alerts])
        story.append(Paragraph(alert_text, s["AlertText"]))

    if complaint:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Chief Complaint", s["SectionTitle"]))
        story.append(Paragraph(complaint, s["FieldValue"]))

    if oral_examination:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Oral Examination", s["SectionTitle"]))
        story.append(Paragraph(oral_examination, s["FieldValue"]))

    if diagnosis:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Diagnosis", s["SectionTitle"]))
        story.append(Paragraph(diagnosis, s["FieldValueBold"]))

    if treatment_planned:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Treatment Planned", s["SectionTitle"]))
        story.append(Paragraph(treatment_planned, s["FieldValue"]))

    if procedures_done and len(procedures_done) > 0:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Treatment / Procedures Done", s["SectionTitle"]))
        for i, p in enumerate(procedures_done):
            pname = p if isinstance(p, str) else p.get("name", str(p))
            tooth = "" if isinstance(p, str) else p.get("tooth", "")
            txt = f"<b>{i+1}.</b> {pname}"
            if tooth:
                txt += f" — Tooth #{tooth}"
            story.append(Paragraph(txt, s["FieldValue"]))
        story.append(Spacer(1, 4))

    if doctor_notes:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Doctor's Notes for Today's Visit", s["SectionTitle"]))
        story.append(Paragraph(doctor_notes, s["FieldValue"]))

    if medicines and len(medicines) > 0:
        story.append(Spacer(1, 6))
        story.append(Paragraph("℞ &nbsp; Prescription", s["SectionTitle"]))

        mhdr = [Paragraph(f"<b>{h}</b>", s["FieldLabel"]) for h in ["#", "Medicine", "Dose", "Frequency", "Duration", "Instructions"]]
        mrows = [mhdr]
        for i, m in enumerate(medicines):
            name = m.get("name", "") if isinstance(m, dict) else str(m)
            strength = m.get("strength", "") if isinstance(m, dict) else ""
            full_name = f"{name} {strength}".strip() if strength else name
            mrows.append([
                Paragraph(str(i + 1), s["MedDetail"]),
                Paragraph(f"<b>{full_name}</b>", s["MedName"]),
                Paragraph(str(m.get("dose", "") if isinstance(m, dict) else ""), s["MedDetail"]),
                Paragraph(str(m.get("frequency", "") if isinstance(m, dict) else ""), s["MedDetail"]),
                Paragraph(str(m.get("duration", "") if isinstance(m, dict) else ""), s["MedDetail"]),
                Paragraph(str(m.get("instructions", "") if isinstance(m, dict) else ""), s["MedDetail"]),
            ])

        mt = Table(mrows, colWidths=["5%", "25%", "12%", "17%", "13%", "28%"])
        mt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("BOX", (0, 0), (-1, -1), 1, ACCENT),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ]))
        story.append(mt)

    if advice and len(advice) > 0:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Advice / Instructions", s["SectionTitle"]))
        for a in advice:
            if a.strip():
                story.append(Paragraph(f"• {a.strip()}", s["AdviceText"]))

    if followup_date:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Follow-up Visit", s["SectionTitle"]))
        fu = f"<b>📅 {followup_date}</b>"
        if followup_notes:
            fu += f" — {followup_notes}"
        story.append(Paragraph(fu, s["FieldValue"]))

    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="35%", thickness=0.8, color=DARK, spaceAfter=4))
    story.append(Paragraph(f"<b>{doctor_name}</b>", s["FieldValueBold"]))
    story.append(Paragraph(f"{doctor_degree}", s["SmallGray"]))
    story.append(Paragraph(f"Reg: {doctor_reg_no}", s["SmallGray"]))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=RED, spaceAfter=6))
    story.append(Paragraph(f"{clinic_name} — {clinic_tagline}", s["Footer"]))
    story.append(Paragraph(f"{clinic_address} | {clinic_phone}", s["Footer"]))
    story.append(Paragraph("This is a computer-generated prescription.", s["Footer"]))

    doc.build(story)
    return buf.getvalue()
