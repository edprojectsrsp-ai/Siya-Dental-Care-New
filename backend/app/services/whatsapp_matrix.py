"""
backend/app/services/whatsapp_matrix.py — Bundle R

Helper functions for the full WhatsApp matrix from Dr. Madhu's spec.
Each function builds variables and calls send_message() with the right template.

Call these from the relevant lifecycle hooks:
  - appointment created       → notify_appointment_confirmation()
  - appointment rescheduled   → notify_appointment_rescheduled()
  - appointment cancelled     → notify_appointment_cancelled()
  - patient arrived/checked   → notify_arrival_confirmation()
  - visit finalized           → notify_thank_you_visit() + queue rating ask
  - rating submitted          → notify_reward_earned()
  - lab order created         → notify_lab_order_placed()
  - lab order modified        → notify_lab_order_modified()
  - specialist assigned       → notify_specialist_assignment()
  - case completed            → notify_case_completed()
  - daily 7 AM cron           → build_doctor_digest() + build_nurse_digest() + build_specialist_digest()
  - lab daily cron            → build_lab_reminders()
  - message log failure       → notify_failed_reminder()
"""
from datetime import datetime, timezone, date as date_type, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.services.messaging import send_message


# ═══════════════════════════════════════════════════════════════════════════
# Single-event helpers
# ═══════════════════════════════════════════════════════════════════════════
async def _get_appointment_context(db: AsyncSession, apt_id: str) -> Optional[Dict[str, Any]]:
    row = (await db.execute(sql_text("""
        SELECT a.id, a.clinic_id, a.patient_id, a.specialist_id,
               a.confirmed_date, a.confirmed_time, a.requested_date, a.requested_time,
               a.reason, a.appointment_type, a.workflow_status, a.status,
               p.name AS patient_name, COALESCE(p.alternate_whatsapp_number, a.phone_number, p.phone) AS patient_phone,
               c.name AS clinic_name, c.address AS clinic_address, c.phone AS clinic_phone,
               d.name AS doctor_name,
               s.name AS specialist_name, s.phone AS specialist_phone
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics  c ON c.id = a.clinic_id
        LEFT JOIN staff    d ON d.id = a.doctor_id
        LEFT JOIN staff    s ON s.id = a.specialist_id
        WHERE a.id = :id
    """), {"id": apt_id})).mappings().one_or_none()
    return dict(row) if row else None


async def notify_appointment_confirmation(db: AsyncSession, apt_id: str):
    apt = await _get_appointment_context(db, apt_id)
    if not apt or not apt.get("patient_phone"):
        return None
    d = apt.get("confirmed_date") or apt.get("requested_date")
    t = apt.get("confirmed_time") or apt.get("requested_time")
    return await send_message(
        db=db, clinic_id=str(apt["clinic_id"]),
        template_key="appointment_confirmation",
        recipient_kind="patient",
        recipient_id=str(apt["patient_id"]),
        recipient_phone=apt["patient_phone"],
        recipient_name=apt["patient_name"],
        variables={
            "patient_name": apt["patient_name"] or "",
            "clinic_name": apt["clinic_name"] or "",
            "doctor_name": apt["doctor_name"] or "the doctor",
            "date": d.strftime("%d %b %Y") if d else "",
            "time": str(t)[:5] if t else "",
            "clinic_address": apt["clinic_address"] or "",
            "clinic_phone": apt["clinic_phone"] or "",
        },
        appointment_id=apt_id, trigger="event",
    )


async def notify_appointment_rescheduled(db, apt_id: str, old_date, old_time, new_date, new_time):
    apt = await _get_appointment_context(db, apt_id)
    if not apt or not apt.get("patient_phone"):
        return None
    return await send_message(
        db=db, clinic_id=str(apt["clinic_id"]),
        template_key="appointment_rescheduled",
        recipient_kind="patient",
        recipient_id=str(apt["patient_id"]),
        recipient_phone=apt["patient_phone"],
        recipient_name=apt["patient_name"],
        variables={
            "patient_name": apt["patient_name"] or "",
            "clinic_name": apt["clinic_name"] or "",
            "doctor_name": apt["doctor_name"] or "the doctor",
            "old_date": old_date.strftime("%d %b") if hasattr(old_date, 'strftime') else str(old_date),
            "old_time": str(old_time)[:5] if old_time else "",
            "new_date": new_date.strftime("%d %b %Y") if hasattr(new_date, 'strftime') else str(new_date),
            "new_time": str(new_time)[:5] if new_time else "",
        },
        appointment_id=apt_id, trigger="event",
    )


async def notify_appointment_cancelled(db, apt_id: str):
    apt = await _get_appointment_context(db, apt_id)
    if not apt or not apt.get("patient_phone"):
        return None
    d = apt.get("confirmed_date") or apt.get("requested_date")
    t = apt.get("confirmed_time") or apt.get("requested_time")
    return await send_message(
        db=db, clinic_id=str(apt["clinic_id"]),
        template_key="appointment_cancelled",
        recipient_kind="patient",
        recipient_id=str(apt["patient_id"]),
        recipient_phone=apt["patient_phone"],
        recipient_name=apt["patient_name"],
        variables={
            "patient_name": apt["patient_name"] or "",
            "clinic_name": apt["clinic_name"] or "",
            "date": d.strftime("%d %b") if d else "",
            "time": str(t)[:5] if t else "",
            "clinic_phone": apt["clinic_phone"] or "",
        },
        appointment_id=apt_id, trigger="event",
    )


async def notify_arrival_confirmation(db, apt_id: str, wait_minutes: int = 10):
    apt = await _get_appointment_context(db, apt_id)
    if not apt or not apt.get("patient_phone"):
        return None
    return await send_message(
        db=db, clinic_id=str(apt["clinic_id"]),
        template_key="arrival_confirmation",
        recipient_kind="patient",
        recipient_id=str(apt["patient_id"]),
        recipient_phone=apt["patient_phone"],
        recipient_name=apt["patient_name"],
        variables={
            "patient_name": apt["patient_name"] or "",
            "clinic_name": apt["clinic_name"] or "",
            "doctor_name": apt["doctor_name"] or "the doctor",
            "wait_minutes": wait_minutes,
        },
        appointment_id=apt_id, trigger="manual",
    )


async def notify_thank_you_visit(db, apt_id: str):
    apt = await _get_appointment_context(db, apt_id)
    if not apt or not apt.get("patient_phone"):
        return None
    return await send_message(
        db=db, clinic_id=str(apt["clinic_id"]),
        template_key="thank_you_visit",
        recipient_kind="patient",
        recipient_id=str(apt["patient_id"]),
        recipient_phone=apt["patient_phone"],
        recipient_name=apt["patient_name"],
        variables={
            "patient_name": apt["patient_name"] or "",
            "clinic_name": apt["clinic_name"] or "",
            "doctor_name": apt["doctor_name"] or "",
            "clinic_phone": apt["clinic_phone"] or "",
        },
        appointment_id=apt_id, trigger="auto",
    )


async def notify_reward_earned(db, patient_id: str, clinic_id: str, amount: float, expires_at):
    p = (await db.execute(sql_text("""
        SELECT name, phone FROM patients WHERE id = :id
    """), {"id": patient_id})).mappings().one_or_none()
    if not p or not p.get("phone"):
        return None
    return await send_message(
        db=db, clinic_id=clinic_id,
        template_key="reward_earned",
        recipient_kind="patient",
        recipient_id=patient_id,
        recipient_phone=p["phone"], recipient_name=p["name"],
        variables={
            "patient_name": p["name"] or "",
            "amount": amount,
            "expires_at": expires_at.strftime("%d %b %Y") if hasattr(expires_at, 'strftime') else str(expires_at),
        },
        trigger="event",
    )


async def notify_specialist_assignment(db, apt_id: str):
    apt = await _get_appointment_context(db, apt_id)
    if not apt or not apt.get("specialist_phone") or not apt.get("specialist_id"):
        return None
    d = apt.get("confirmed_date") or apt.get("requested_date")
    t = apt.get("confirmed_time") or apt.get("requested_time")
    # Anonymize patient for specialist (initials + age/gender)
    name = apt["patient_name"] or ""
    initials = "".join([w[0] for w in name.split()[:2]]).upper() if name else "—"
    return await send_message(
        db=db, clinic_id=str(apt["clinic_id"]),
        template_key="specialist_assigned",
        recipient_kind="specialist",
        recipient_id=str(apt["specialist_id"]),
        recipient_phone=apt["specialist_phone"],
        recipient_name=apt["specialist_name"],
        variables={
            "specialist_name": apt["specialist_name"] or "",
            "clinic_name": apt["clinic_name"] or "",
            "date": d.strftime("%d %b") if d else "",
            "time": str(t)[:5] if t else "",
            "appointment_type": apt["appointment_type"] or apt["reason"] or "",
            "patient_initials": initials,
            "patient_age": "",
            "patient_gender": "",
            "complaint": apt["reason"] or "",
        },
        appointment_id=apt_id, trigger="event",
    )


async def notify_lab_order_placed(db, order_id: str):
    o = (await db.execute(sql_text("""
        SELECT lo.*, v.name AS vendor_name, v.phone AS vendor_phone, v.whatsapp_number AS vendor_wa,
               p.name AS patient_name,
               c.name AS clinic_name,
               d.name AS doctor_name
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN patients    p ON p.id = lo.patient_id
        LEFT JOIN clinics     c ON c.id = lo.clinic_id
        LEFT JOIN staff       d ON d.id = lo.doctor_id
        WHERE lo.id = :id
    """), {"id": order_id})).mappings().one_or_none()
    if not o:
        return None
    phone = o.get("vendor_wa") or o.get("vendor_phone")
    if not phone:
        return None
    # Anonymize patient for vendor (use first name initial)
    name = o["patient_name"] or ""
    code = (name.split()[0][:1] + "***" + name.split()[-1][-1:]).upper() if name else "P-—"
    return await send_message(
        db=db, clinic_id=str(o["clinic_id"]),
        template_key="lab_order_placed",
        recipient_kind="vendor",
        recipient_id=str(o["vendor_id"]) if o.get("vendor_id") else None,
        recipient_phone=phone, recipient_name=o["vendor_name"],
        variables={
            "vendor_name": o["vendor_name"] or "",
            "clinic_name": o["clinic_name"] or "",
            "doctor_name": o["doctor_name"] or "",
            "work_type": o.get("work_type") or "dental work",
            "patient_code": code,
            "teeth": o.get("teeth_involved") or "",
            "shade": o.get("shade") or "",
            "due_date": o["expected_date"].strftime("%d %b") if o.get("expected_date") else "TBD",
            "order_id": str(order_id)[:8],
        },
        lab_order_id=order_id, trigger="event",
    )


async def build_lab_reminders(db: AsyncSession) -> Dict[str, int]:
    """Daily cron: due-tomorrow, due-today, overdue reminders to lab vendors."""
    summary = {"due_tomorrow": 0, "due_today": 0, "overdue": 0}

    # Due tomorrow
    rows = (await db.execute(sql_text("""
        SELECT lo.id, lo.clinic_id, lo.vendor_id, lo.work_type, lo.expected_date,
               v.name AS vendor_name,
               COALESCE(v.whatsapp_number, v.phone) AS vendor_phone,
               p.name AS patient_name
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN patients    p ON p.id = lo.patient_id
        WHERE lo.status IN ('placed','in_progress','sent_to_lab')
          AND lo.expected_date = CURRENT_DATE + INTERVAL '1 day'
    """))).mappings().all()
    for o in rows:
        if not o.get("vendor_phone"): continue
        await send_message(
            db=db, clinic_id=str(o["clinic_id"]),
            template_key="lab_due_tomorrow",
            recipient_kind="vendor",
            recipient_id=str(o["vendor_id"]) if o.get("vendor_id") else None,
            recipient_phone=o["vendor_phone"], recipient_name=o["vendor_name"],
            variables={
                "vendor_name": o["vendor_name"] or "",
                "work_type": o.get("work_type") or "",
                "patient_code": (o.get("patient_name") or "—")[:3] + "***",
                "order_id": str(o["id"])[:8],
                "due_date": o["expected_date"].strftime("%d %b"),
            },
            lab_order_id=str(o["id"]), trigger="auto",
        )
        summary["due_tomorrow"] += 1

    # Due today
    rows = (await db.execute(sql_text("""
        SELECT lo.id, lo.clinic_id, lo.vendor_id, lo.work_type, lo.expected_date,
               v.name AS vendor_name,
               COALESCE(v.whatsapp_number, v.phone) AS vendor_phone,
               p.name AS patient_name
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN patients    p ON p.id = lo.patient_id
        WHERE lo.status IN ('placed','in_progress','sent_to_lab')
          AND lo.expected_date = CURRENT_DATE
    """))).mappings().all()
    for o in rows:
        if not o.get("vendor_phone"): continue
        await send_message(
            db=db, clinic_id=str(o["clinic_id"]),
            template_key="lab_due_today",
            recipient_kind="vendor",
            recipient_id=str(o["vendor_id"]) if o.get("vendor_id") else None,
            recipient_phone=o["vendor_phone"], recipient_name=o["vendor_name"],
            variables={
                "vendor_name": o["vendor_name"] or "",
                "work_type": o.get("work_type") or "",
                "patient_code": (o.get("patient_name") or "—")[:3] + "***",
                "order_id": str(o["id"])[:8],
            },
            lab_order_id=str(o["id"]), trigger="auto",
        )
        summary["due_today"] += 1

    # Overdue
    rows = (await db.execute(sql_text("""
        SELECT lo.id, lo.clinic_id, lo.vendor_id, lo.work_type, lo.expected_date,
               v.name AS vendor_name,
               COALESCE(v.whatsapp_number, v.phone) AS vendor_phone,
               p.name AS patient_name,
               (CURRENT_DATE - lo.expected_date) AS days_overdue
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN patients    p ON p.id = lo.patient_id
        WHERE lo.status IN ('placed','in_progress','sent_to_lab')
          AND lo.expected_date < CURRENT_DATE
    """))).mappings().all()
    for o in rows:
        if not o.get("vendor_phone"): continue
        await send_message(
            db=db, clinic_id=str(o["clinic_id"]),
            template_key="lab_overdue",
            recipient_kind="vendor",
            recipient_id=str(o["vendor_id"]) if o.get("vendor_id") else None,
            recipient_phone=o["vendor_phone"], recipient_name=o["vendor_name"],
            variables={
                "vendor_name": o["vendor_name"] or "",
                "work_type": o.get("work_type") or "",
                "patient_code": (o.get("patient_name") or "—")[:3] + "***",
                "order_id": str(o["id"])[:8],
                "due_date": o["expected_date"].strftime("%d %b"),
                "days_overdue": o["days_overdue"],
            },
            lab_order_id=str(o["id"]), trigger="auto",
        )
        summary["overdue"] += 1

    return summary


# ═══════════════════════════════════════════════════════════════════════════
# Daily digests (7 AM)
# ═══════════════════════════════════════════════════════════════════════════
async def build_doctor_digest(db: AsyncSession, clinic_id: str) -> Optional[Dict[str, Any]]:
    """Build + send doctor's morning digest for one clinic."""
    today = date_type.today()
    stats = (await db.execute(sql_text("""
        SELECT
            (SELECT COUNT(*) FROM appointments
                WHERE clinic_id = :cid AND COALESCE(confirmed_date, requested_date) = :d
                  AND COALESCE(workflow_status, status) NOT IN ('cancelled')) AS apt_c,
            (SELECT COUNT(*) FROM patients
                WHERE clinic_id = :cid AND created_at::date = :d) AS new_pt,
            (SELECT COUNT(*) FROM follow_ups
                WHERE clinic_id = :cid AND follow_up_date = :d AND status NOT IN ('cancelled','completed')) AS fu_c,
            (SELECT COUNT(*) FROM appointments
                WHERE clinic_id = :cid AND COALESCE(confirmed_date, requested_date) = :d
                  AND specialist_id IS NOT NULL) AS spec_c,
            (SELECT COALESCE(SUM(amount_total) - SUM(amount_paid), 0) FROM treatment_plans
                WHERE clinic_id = :cid) AS pending,
            (SELECT COUNT(*) FROM lab_orders
                WHERE clinic_id = :cid AND expected_date = :d AND status NOT IN ('received','cancelled')) AS lab_due
    """), {"cid": clinic_id, "d": today})).mappings().one()

    # Find the senior doctor of this clinic
    doctor = (await db.execute(sql_text("""
        SELECT s.id, s.name, COALESCE(s.whatsapp_number, s.phone) AS phone
        FROM staff s WHERE s.clinic_id = :cid AND s.role IN ('senior_doctor','doctor','admin')
          AND COALESCE(s.whatsapp_number, s.phone) IS NOT NULL
        ORDER BY (s.role = 'senior_doctor') DESC, (s.role = 'admin') DESC
        LIMIT 1
    """), {"cid": clinic_id})).mappings().one_or_none()
    if not doctor:
        return None

    clinic = (await db.execute(sql_text("SELECT name FROM clinics WHERE id = :id"), {"id": clinic_id})).mappings().one_or_none()

    return await send_message(
        db=db, clinic_id=clinic_id,
        template_key="doctor_daily_digest",
        recipient_kind="staff",
        recipient_id=str(doctor["id"]),
        recipient_phone=doctor["phone"], recipient_name=doctor["name"],
        variables={
            "doctor_name": doctor["name"] or "",
            "clinic_name": (clinic or {}).get("name") or "",
            "appointment_count": stats["apt_c"],
            "new_patient_count": stats["new_pt"],
            "followup_count": stats["fu_c"],
            "specialist_count": stats["spec_c"],
            "pending_amount": f"{float(stats['pending']):,.0f}",
            "lab_due_count": stats["lab_due"],
        },
        trigger="auto",
    )


async def build_nurse_digest(db: AsyncSession, clinic_id: str) -> Optional[Dict[str, Any]]:
    today = date_type.today()
    stats = (await db.execute(sql_text("""
        SELECT
            (SELECT COUNT(*) FROM appointments
                WHERE clinic_id = :cid AND COALESCE(confirmed_date, requested_date) = :d) AS apt_c,
            (SELECT COUNT(*) FROM patients
                WHERE clinic_id = :cid AND created_at::date = :d) AS new_pt,
            (SELECT COUNT(*) FROM follow_ups
                WHERE clinic_id = :cid AND follow_up_date = :d) AS fu_c,
            (SELECT COUNT(*) FROM appointments
                WHERE clinic_id = :cid AND COALESCE(confirmed_date, requested_date) = :d
                  AND specialist_id IS NOT NULL) AS spec_c,
            (SELECT COUNT(*) FROM lab_orders
                WHERE clinic_id = :cid AND expected_date = :d) AS lab_due,
            (SELECT COALESCE(SUM(amount_total) - SUM(amount_paid), 0) FROM treatment_plans
                WHERE clinic_id = :cid) AS pending
    """), {"cid": clinic_id, "d": today})).mappings().one()

    nurse = (await db.execute(sql_text("""
        SELECT s.id, s.name, COALESCE(s.whatsapp_number, s.phone) AS phone
        FROM staff s WHERE s.clinic_id = :cid AND s.role IN ('nurse','receptionist')
          AND COALESCE(s.whatsapp_number, s.phone) IS NOT NULL
        ORDER BY (s.role = 'nurse') DESC LIMIT 1
    """), {"cid": clinic_id})).mappings().one_or_none()
    if not nurse:
        return None

    clinic = (await db.execute(sql_text("SELECT name FROM clinics WHERE id = :id"), {"id": clinic_id})).mappings().one_or_none()

    return await send_message(
        db=db, clinic_id=clinic_id,
        template_key="nurse_daily_digest",
        recipient_kind="staff",
        recipient_id=str(nurse["id"]),
        recipient_phone=nurse["phone"], recipient_name=nurse["name"],
        variables={
            "clinic_name": (clinic or {}).get("name") or "",
            "appointment_count": stats["apt_c"],
            "new_patient_count": stats["new_pt"],
            "followup_count": stats["fu_c"],
            "specialist_count": stats["spec_c"],
            "lab_due_count": stats["lab_due"],
            "pending_amount": f"{float(stats['pending']):,.0f}",
        },
        trigger="auto",
    )


async def build_specialist_digest(db: AsyncSession, specialist_id: str) -> Optional[Dict[str, Any]]:
    today = date_type.today()
    spec = (await db.execute(sql_text("""
        SELECT id, name, clinic_id, COALESCE(whatsapp_number, phone) AS phone
        FROM staff WHERE id = :id AND role = 'specialist'
    """), {"id": specialist_id})).mappings().one_or_none()
    if not spec or not spec.get("phone"):
        return None

    cases = (await db.execute(sql_text("""
        SELECT a.id, p.name AS patient_name,
               COALESCE(a.confirmed_time, a.requested_time) AS t,
               a.reason
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.specialist_id = :sid
          AND COALESCE(a.confirmed_date, a.requested_date) = :d
          AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled')
        ORDER BY t
    """), {"sid": specialist_id, "d": today})).mappings().all()
    if not cases:
        return None

    clinic = (await db.execute(sql_text("SELECT name FROM clinics WHERE id = :id"), {"id": spec["clinic_id"]})).mappings().one_or_none()
    case_list = "\n".join([
        f"• {str(c['t'])[:5] if c['t'] else '—'} — {c['patient_name']} ({c['reason'] or 'consultation'})"
        for c in cases
    ])
    return await send_message(
        db=db, clinic_id=str(spec["clinic_id"]),
        template_key="specialist_morning_digest",
        recipient_kind="specialist",
        recipient_id=str(spec["id"]),
        recipient_phone=spec["phone"], recipient_name=spec["name"],
        variables={
            "specialist_name": spec["name"] or "",
            "clinic_name": (clinic or {}).get("name") or "",
            "case_list": case_list,
            "case_count": len(cases),
        },
        trigger="auto",
    )


async def run_daily_digests(db: AsyncSession) -> Dict[str, int]:
    """Call this at 7 AM cron — sends all daily digests across clinics."""
    summary = {"doctor": 0, "nurse": 0, "specialist": 0, "lab": 0}
    clinics = (await db.execute(sql_text("SELECT id FROM clinics WHERE is_active IS NOT FALSE"))).mappings().all()
    for c in clinics:
        cid = str(c["id"])
        if await build_doctor_digest(db, cid): summary["doctor"] += 1
        if await build_nurse_digest(db, cid):  summary["nurse"] += 1

    specialists = (await db.execute(sql_text("""
        SELECT id FROM staff WHERE role = 'specialist' AND is_active IS NOT FALSE
    """))).mappings().all()
    for s in specialists:
        if await build_specialist_digest(db, str(s["id"])): summary["specialist"] += 1

    lab = await build_lab_reminders(db)
    summary["lab"] = sum(lab.values())
    return summary
