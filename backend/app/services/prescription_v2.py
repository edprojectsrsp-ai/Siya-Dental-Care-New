"""
backend/app/services/prescription_v2.py — Bundle S

Professional prescription PDF generator using reportlab.
Reads clinic_info_ext for logo, branding, doctor credentials.

Layout (A4 default; A5 supported):
  ┌──────────────────────────────────────────────────────┐
  │ [Logo]   Clinic Name                  Phone · Address │
  │          Dr. Madhu Edward                              │
  │          BDS, OD-28456 (Reg. No.)                      │
  ├──────────────────────────────────────────────────────┤
  │ Patient: Priya Sharma  · 32y · F                       │
  │ Date: 14 Jun 2026  · Visit ID: V-12345                │
  ├──────────────────────────────────────────────────────┤
  │ CHIEF COMPLAINT                                        │
  │ — Tooth pain on lower right molar                     │
  │                                                        │
  │ DIAGNOSIS                                              │
  │ — Irreversible pulpitis (tooth 46)                    │
  │                                                        │
  │ TREATMENT TODAY                                        │
  │ — Pulpotomy + RCT initiated on 46                     │
  │                                                        │
  │ Rx                                                     │
  │ 1. Amoxicillin 500mg     1-0-1 a/f    5 days          │
  │ 2. Paracetamol 500mg     SOS                          │
  │ 3. Chlorhexidine MW      Rinse BD     7 days          │
  │                                                        │
  │ ADVICE                                                 │
  │ — Avoid hot/cold foods                                │
  │ — Take medications on time                            │
  │                                                        │
  │ FOLLOW-UP: 21 Jun 2026                                │
  ├──────────────────────────────────────────────────────┤
  │ [QR code]   Signed digitally · clinic footer          │
  └──────────────────────────────────────────────────────┘

Usage:
  pdf_bytes = generate_rx_pdf(db, prescription_id)
"""
import io
from datetime import datetime, date as date_type
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

try:
    from reportlab.lib.pagesizes import A4, A5
    from reportlab.lib.units import mm, cm
    from reportlab.lib.colors import HexColor, Color
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# ─────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────
async def generate_rx_pdf(db: AsyncSession, prescription_id: str) -> bytes:
    """Generate the prescription PDF as raw bytes."""
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("reportlab not installed — pip install reportlab")

    rx = await _load_prescription(db, prescription_id)
    if not rx:
        raise ValueError(f"Prescription {prescription_id} not found")

    info = await _load_clinic_info(db, str(rx["clinic_id"]))
    fmt = (info.get("rx_format") or "A4").upper()
    pagesize = A4 if fmt == "A4" else A5

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=pagesize)
    width, height = pagesize

    accent = HexColor(info.get("accent_color") or "#0E7C7B")
    accent_deep = HexColor(info.get("secondary_color") or "#0A5C5B")
    ink = HexColor("#0F172A")
    mute = HexColor("#64748B")
    line = HexColor("#E2E8F0")

    # ── Header ────────────────────────────────────────────────────────
    header_h = 35 * mm if fmt == "A4" else 28 * mm
    _draw_header(c, info, rx, width, height, header_h, accent, accent_deep, ink, mute, line)

    # ── Patient strip ─────────────────────────────────────────────────
    y = height - header_h - 10 * mm
    y = _draw_patient_strip(c, rx, width, y, accent, ink, mute, line, fmt)

    # ── Body sections ─────────────────────────────────────────────────
    margin = 15 * mm
    body_x = margin
    body_w = width - 2 * margin

    if rx.get("complaint"):
        y = _draw_section(c, "CHIEF COMPLAINT", rx["complaint"], body_x, y, body_w, accent_deep, ink)

    if rx.get("diagnosis_text") or rx.get("diagnoses_list"):
        diag = _format_diagnoses(rx)
        y = _draw_section(c, "DIAGNOSIS", diag, body_x, y, body_w, accent_deep, ink)

    if rx.get("treatment_today"):
        y = _draw_section(c, "TREATMENT TODAY", rx["treatment_today"], body_x, y, body_w, accent_deep, ink)

    medicines = rx.get("medicines_list") or []
    if medicines:
        y = _draw_medicines(c, medicines, body_x, y, body_w, accent, accent_deep, ink, line)

    if rx.get("advice"):
        y = _draw_section(c, "ADVICE", rx["advice"], body_x, y, body_w, accent_deep, ink)

    if rx.get("followup_date"):
        y -= 4 * mm
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(body_x, y, f"FOLLOW-UP: {rx['followup_date'].strftime('%d %b %Y') if hasattr(rx['followup_date'], 'strftime') else rx['followup_date']}")
        y -= 6 * mm

    # ── Footer ────────────────────────────────────────────────────────
    _draw_footer(c, info, rx, width, accent, mute, line, fmt)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────
# Header (logo + clinic name + doctor + contact)
# ─────────────────────────────────────────────────────────────────────────
def _draw_header(c, info, rx, width, height, header_h, accent, accent_deep, ink, mute, line):
    # Background band
    c.setFillColor(accent)
    c.rect(0, height - header_h, width, header_h, fill=1, stroke=0)

    margin = 15 * mm
    left_x = margin

    # Logo
    logo_url = info.get("logo_url")
    if logo_url:
        try:
            from urllib.request import urlopen
            img_data = urlopen(logo_url, timeout=3).read()
            img = ImageReader(io.BytesIO(img_data))
            c.drawImage(img, left_x, height - header_h + 5 * mm,
                        width=20 * mm, height=20 * mm, mask='auto', preserveAspectRatio=True)
            left_x += 25 * mm
        except Exception:
            pass

    # Clinic name
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 18)
    clinic_name = info.get("clinic_name") or "Dental Clinic"
    c.drawString(left_x, height - 13 * mm, clinic_name)

    # Doctor info
    c.setFont("Helvetica-Bold", 11)
    doctor = info.get("primary_doctor_name") or rx.get("doctor_name") or "Dr."
    c.drawString(left_x, height - 19 * mm, f"Dr. {doctor}")

    c.setFont("Helvetica", 9)
    qual = info.get("primary_doctor_qual") or "BDS"
    reg = info.get("primary_doctor_reg") or ""
    qual_line = qual
    if reg:
        qual_line += f"  ·  Reg: {reg}"
    c.drawString(left_x, height - 23.5 * mm, qual_line)

    # Right side: phone + address
    right_x = width - margin
    c.setFont("Helvetica", 9)
    if info.get("phone"):
        c.drawRightString(right_x, height - 13 * mm, f"📞 {info['phone']}")
    if info.get("address"):
        c.drawRightString(right_x, height - 17 * mm, info["address"][:60])
    if info.get("gst_number"):
        c.setFont("Helvetica", 8)
        c.drawRightString(right_x, height - 21 * mm, f"GST: {info['gst_number']}")


# ─────────────────────────────────────────────────────────────────────────
# Patient strip
# ─────────────────────────────────────────────────────────────────────────
def _draw_patient_strip(c, rx, width, y, accent, ink, mute, line, fmt):
    margin = 15 * mm
    strip_h = 12 * mm

    # Background
    c.setFillColor(HexColor("#F8FAFC"))
    c.rect(margin, y - strip_h, width - 2 * margin, strip_h, fill=1, stroke=0)
    c.setStrokeColor(line)
    c.setLineWidth(0.4)
    c.rect(margin, y - strip_h, width - 2 * margin, strip_h, fill=0, stroke=1)

    # Patient info
    c.setFillColor(ink)
    c.setFont("Helvetica-Bold", 11)
    name = rx.get("patient_name") or "Patient"
    age = rx.get("patient_age")
    gender = (rx.get("patient_gender") or "")[:1]
    pt_line = name
    if age: pt_line += f"  ·  {age}y"
    if gender: pt_line += f" {gender}"
    c.drawString(margin + 4 * mm, y - 5 * mm, pt_line)

    # Date + visit ID on right
    c.setFont("Helvetica", 9)
    c.setFillColor(mute)
    today = (rx.get("created_at") or datetime.now()).strftime("%d %b %Y") if hasattr(rx.get("created_at"), 'strftime') else str(rx.get("created_at"))
    right = f"Date: {today}"
    if rx.get("visit_id"):
        right += f"  ·  Visit: V-{str(rx['visit_id'])[:6]}"
    c.drawRightString(width - margin - 4 * mm, y - 5 * mm, right)

    if rx.get("patient_phone"):
        c.setFont("Helvetica", 8)
        c.drawString(margin + 4 * mm, y - 9 * mm, f"📞 {rx['patient_phone']}")

    return y - strip_h - 6 * mm


# ─────────────────────────────────────────────────────────────────────────
# Section heading + content
# ─────────────────────────────────────────────────────────────────────────
def _draw_section(c, title, content, x, y, w, accent_deep, ink):
    if not content:
        return y
    c.setFillColor(accent_deep)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, title)
    y -= 5 * mm

    c.setFillColor(ink)
    c.setFont("Helvetica", 10)
    # Word wrap
    words = str(content).split()
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if c.stringWidth(test, "Helvetica", 10) > w - 4 * mm:
            c.drawString(x + 3 * mm, y, line)
            y -= 4.5 * mm
            line = word
        else:
            line = test
    if line:
        c.drawString(x + 3 * mm, y, line)
        y -= 4.5 * mm
    return y - 3 * mm


# ─────────────────────────────────────────────────────────────────────────
# Medicines section (table-style)
# ─────────────────────────────────────────────────────────────────────────
def _draw_medicines(c, medicines, x, y, w, accent, accent_deep, ink, line):
    c.setFillColor(accent_deep)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, "Rx")
    y -= 5 * mm

    # Column widths
    col_n  = 5 * mm     # #
    col_name = w * 0.40
    col_dose = w * 0.13
    col_freq = w * 0.25
    col_dur  = w * 0.22

    # Header row
    c.setFillColor(accent)
    c.rect(x, y - 6 * mm, w, 6 * mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x + 2 * mm, y - 4 * mm, "#")
    c.drawString(x + col_n + 2 * mm, y - 4 * mm, "MEDICINE")
    c.drawString(x + col_n + col_name + 2 * mm, y - 4 * mm, "DOSE")
    c.drawString(x + col_n + col_name + col_dose + 2 * mm, y - 4 * mm, "FREQUENCY")
    c.drawString(x + col_n + col_name + col_dose + col_freq + 2 * mm, y - 4 * mm, "DURATION")
    y -= 6 * mm

    # Rows
    c.setFillColor(ink)
    c.setFont("Helvetica", 9.5)
    for i, m in enumerate(medicines, 1):
        if i % 2 == 0:
            c.setFillColor(HexColor("#F8FAFC"))
            c.rect(x, y - 6 * mm, w, 6 * mm, fill=1, stroke=0)
            c.setFillColor(ink)
        c.drawString(x + 2 * mm, y - 4 * mm, str(i))
        c.drawString(x + col_n + 2 * mm, y - 4 * mm, str(m.get("name", ""))[:50])
        c.drawString(x + col_n + col_name + 2 * mm, y - 4 * mm, str(m.get("dose", ""))[:15])
        c.drawString(x + col_n + col_name + col_dose + 2 * mm, y - 4 * mm, str(m.get("frequency", ""))[:30])
        c.drawString(x + col_n + col_name + col_dose + col_freq + 2 * mm, y - 4 * mm, str(m.get("duration", ""))[:20])
        y -= 6 * mm

    c.setStrokeColor(line)
    c.setLineWidth(0.4)
    c.line(x, y, x + w, y)
    return y - 5 * mm


# ─────────────────────────────────────────────────────────────────────────
# Footer
# ─────────────────────────────────────────────────────────────────────────
def _draw_footer(c, info, rx, width, accent, mute, line, fmt):
    margin = 15 * mm
    footer_y = 18 * mm

    c.setStrokeColor(line)
    c.setLineWidth(0.5)
    c.line(margin, footer_y + 6 * mm, width - margin, footer_y + 6 * mm)

    # QR code (optional)
    if info.get("rx_show_qr") is not False and rx.get("id"):
        try:
            import qrcode
            qr_url = f"https://siyadental.com/rx/{rx['id']}"
            qr = qrcode.make(qr_url)
            qr_buf = io.BytesIO()
            qr.save(qr_buf, format="PNG")
            qr_buf.seek(0)
            c.drawImage(ImageReader(qr_buf), margin, footer_y - 8 * mm,
                        width=16 * mm, height=16 * mm)
            c.setFillColor(mute)
            c.setFont("Helvetica", 7)
            c.drawString(margin + 18 * mm, footer_y - 1 * mm, "Scan to verify Rx online")
        except Exception:
            pass

    # Signature line
    c.setFillColor(mute)
    c.setFont("Helvetica", 8)
    c.drawRightString(width - margin, footer_y, "_____________________________")
    c.setFont("Helvetica-Bold", 9)
    doctor = info.get("primary_doctor_name") or rx.get("doctor_name") or ""
    c.drawRightString(width - margin, footer_y - 4 * mm, f"Dr. {doctor}")

    # Footer text
    footer_text = info.get("rx_footer_text")
    if footer_text:
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(mute)
        c.drawCentredString(width / 2, footer_y - 11 * mm, footer_text[:120])


# ─────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────
async def _load_prescription(db: AsyncSession, rx_id: str) -> Optional[Dict[str, Any]]:
    row = (await db.execute(sql_text("""
        SELECT pr.*, p.name AS patient_name, p.phone AS patient_phone,
               p.age AS patient_age, p.gender AS patient_gender,
               d.name AS doctor_name
        FROM prescriptions pr
        LEFT JOIN patients p ON p.id = pr.patient_id
        LEFT JOIN staff d ON d.id = pr.doctor_id
        WHERE pr.id = :id
    """), {"id": rx_id})).mappings().one_or_none()
    if not row:
        return None
    d = dict(row)
    # Parse medicines JSONB if needed
    meds = d.get("medicines")
    if isinstance(meds, str):
        import json
        try:
            meds = json.loads(meds)
        except Exception:
            meds = []
    d["medicines_list"] = meds if isinstance(meds, list) else []

    # Diagnoses array
    diag = d.get("diagnoses")
    if isinstance(diag, str):
        import json
        try:
            diag = json.loads(diag)
        except Exception:
            diag = []
    d["diagnoses_list"] = diag if isinstance(diag, list) else []
    d["diagnosis_text"] = d.get("diagnosis")  # legacy single field

    # Treatment today — pulled from visit_note or treatment_summary column if present
    d["treatment_today"] = d.get("treatment_today") or d.get("visit_note") or d.get("treatment_summary") or d.get("doctor_raw_notes")
    d["advice"] = d.get("visible_advice") or d.get("advice")
    return d


async def _load_clinic_info(db: AsyncSession, clinic_id: str) -> Dict[str, Any]:
    row = (await db.execute(sql_text("""
        SELECT ci.*, c.name AS clinic_name, c.address, c.phone
        FROM clinic_info_ext ci
        LEFT JOIN clinics c ON c.id = ci.clinic_id
        WHERE ci.clinic_id = :cid
    """), {"cid": clinic_id})).mappings().one_or_none()
    if row:
        return dict(row)
    # Fall back to base clinic record
    row = (await db.execute(sql_text("""
        SELECT id AS clinic_id, name AS clinic_name, address, phone
        FROM clinics WHERE id = :cid
    """), {"cid": clinic_id})).mappings().one_or_none()
    return dict(row) if row else {}


def _format_diagnoses(rx: Dict[str, Any]) -> str:
    diag_list = rx.get("diagnoses_list") or []
    if diag_list:
        items = []
        for d in diag_list:
            if isinstance(d, dict):
                items.append(d.get("text") or d.get("name") or "")
            else:
                items.append(str(d))
        return " · ".join(filter(None, items))
    return rx.get("diagnosis_text") or ""
