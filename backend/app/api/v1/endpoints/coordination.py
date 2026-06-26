"""
backend/app/api/v1/endpoints/coordination.py
Sprint 11: Real-Time Doctor-Nurse Coordination (polling-based, no WebSocket)
Sprint 12: Treatment + Payment Handoff Flow

Endpoints:
- GET  /api/notifications/me                       → My notifications (poll every 10s)
- GET  /api/notifications/unread-count             → Quick badge count
- POST /api/notifications/{id}/mark-read           → Mark single
- POST /api/notifications/mark-all-read            → Mark all
- GET  /api/notifications/today-schedule           → Morning schedule view
- POST /api/notifications/create                   → Manual create

- POST /api/sessions/start                         → Doctor starts treatment session
- POST /api/sessions/{id}/finalize                 → Doctor finalizes + notifies nurse
- GET  /api/sessions/awaiting-payment              → Nurse's collection queue
- POST /api/sessions/{id}/collect-payment          → Nurse confirms payment
- GET  /api/sessions/today                         → Today's all sessions (live)
- GET  /api/sessions/{id}                          → Session detail
"""

from datetime import datetime, timezone, date as date_type, timedelta
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID
import json

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff

notif_router = APIRouter(prefix="/notifications", tags=["Notifications"])
session_router = APIRouter(prefix="/sessions", tags=["Treatment Sessions"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════
class NotificationCreateIn(BaseModel):
    clinic_id: UUID
    notification_type: str
    recipient_staff_id: Optional[UUID] = None
    recipient_role: Optional[str] = None
    title: str
    message: Optional[str] = None
    data: dict = Field(default_factory=dict)
    priority: str = "normal"
    related_patient_id: Optional[UUID] = None
    related_appointment_id: Optional[UUID] = None
    related_session_id: Optional[UUID] = None

class SessionStartIn(BaseModel):
    patient_id: UUID
    clinic_id: UUID
    doctor_id: UUID
    appointment_id: Optional[UUID] = None
    sitting_id: Optional[UUID] = None
    plan_id: Optional[UUID] = None
    walk_in_id: Optional[UUID] = None

class ProcedureItem(BaseModel):
    procedure_id: Optional[UUID] = None
    procedure_name: str
    notes: Optional[str] = None
    price: Optional[float] = None

class SessionFinalizeIn(BaseModel):
    procedures_done: List[ProcedureItem] = Field(default_factory=list)
    treatment_notes: Optional[str] = None
    next_step: Optional[str] = None
    amount_payable: float
    used_tooth_chart: bool = False
    prescription_id: Optional[UUID] = None

class PaymentComponent(BaseModel):
    mode: str  # cash / upi / card / bank_transfer / other
    amount: float
    txn_id: Optional[str] = None
    notes: Optional[str] = None

class PaymentCollectIn(BaseModel):
    components: List[PaymentComponent]
    total_collected: float
    is_partial: bool = False
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════
@notif_router.get("/me")
async def my_notifications(
    clinic_id: UUID,
    only_unread: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get my notifications (poll this every 10s for real-time updates)"""
    sql = """
        SELECT id, notification_type, title, message, data, priority,
               is_read, read_at, related_patient_id, related_appointment_id,
               related_session_id, created_at, sender_staff_id,
               (SELECT name FROM staff WHERE id = sender_staff_id) AS sender_name
        FROM clinic_notifications
        WHERE clinic_id = :cid
          AND (recipient_staff_id = :sid OR recipient_staff_id IS NULL)
    """
    params = {"cid": str(clinic_id), "sid": str(staff["staff_id"]) if staff else None}
    if only_unread:
        sql += " AND is_read = FALSE"
    sql += " ORDER BY created_at DESC LIMIT :lim"
    params["lim"] = limit

    rows = (await db.execute(sql_text(sql), params)).mappings().all()
    return [{
        "id": str(r["id"]),
        "type": r["notification_type"],
        "title": r["title"],
        "message": r["message"],
        "data": r["data"] or {},
        "priority": r["priority"],
        "is_read": r["is_read"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "sender_name": r["sender_name"],
        "related_patient_id": str(r["related_patient_id"]) if r["related_patient_id"] else None,
        "related_appointment_id": str(r["related_appointment_id"]) if r["related_appointment_id"] else None,
        "related_session_id": str(r["related_session_id"]) if r["related_session_id"] else None,
    } for r in rows]


@notif_router.get("/unread-count")
async def unread_count(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Quick badge count (poll frequently)"""
    row = (await db.execute(sql_text("""
        SELECT COUNT(*) AS cnt FROM clinic_notifications
        WHERE clinic_id = :cid
          AND (recipient_staff_id = :sid OR recipient_staff_id IS NULL)
          AND is_read = FALSE
    """), {"cid": str(clinic_id), "sid": str(staff["staff_id"]) if staff else None})).mappings().one()
    return {"unread": row["cnt"]}


@notif_router.post("/{notif_id}/mark-read")
async def mark_read(
    notif_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    await db.execute(sql_text(
        "UPDATE clinic_notifications SET is_read = TRUE, read_at = NOW() WHERE id = :id"
    ), {"id": str(notif_id)})
    await db.flush()
    return {"marked_read": True}


@notif_router.post("/mark-all-read")
async def mark_all_read(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    res = await db.execute(sql_text("""
        UPDATE clinic_notifications SET is_read = TRUE, read_at = NOW()
        WHERE clinic_id = :cid
          AND (recipient_staff_id = :sid OR recipient_staff_id IS NULL)
          AND is_read = FALSE
    """), {"cid": str(clinic_id), "sid": str(staff["staff_id"]) if staff else None})
    await db.flush()
    return {"marked_count": res.rowcount}


@notif_router.get("/today-schedule")
async def today_schedule(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Morning schedule digest — appointments + counts for today"""
    rows = (await db.execute(sql_text("""
        SELECT a.id, a.scheduled_time, a.reason, a.contact_status, a.status,
               p.name AS pname, p.phone,
               s.name AS doctor_name
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN staff s ON s.id = a.doctor_id
        WHERE a.clinic_id = :cid AND a.scheduled_date = CURRENT_DATE
          AND a.status NOT IN ('cancelled')
        ORDER BY a.scheduled_time NULLS LAST
    """), {"cid": str(clinic_id)})).mappings().all()

    confirmed = [r for r in rows if r["contact_status"] == "confirmed"]
    not_contacted = [r for r in rows if (r["contact_status"] or "not_contacted") == "not_contacted"]
    reschedule_req = [r for r in rows if r["contact_status"] == "reschedule_requested"]

    return {
        "date": date_type.today().isoformat(),
        "total_appointments": len(rows),
        "confirmed_count": len(confirmed),
        "not_contacted_count": len(not_contacted),
        "reschedule_requested_count": len(reschedule_req),
        "confirmed_patients": [{
            "id": str(r["id"]),
            "time": str(r["scheduled_time"])[:5] if r["scheduled_time"] else None,
            "name": r["pname"],
            "reason": r["reason"],
        } for r in confirmed],
        "not_contacted_patients": [{
            "id": str(r["id"]),
            "time": str(r["scheduled_time"])[:5] if r["scheduled_time"] else None,
            "name": r["pname"],
            "phone": r["phone"],
            "reason": r["reason"],
        } for r in not_contacted],
    }


@notif_router.post("/create", status_code=201)
async def create_notification(
    body: NotificationCreateIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Manually create a notification (e.g., morning schedule trigger)"""
    row = (await db.execute(sql_text("""
        INSERT INTO clinic_notifications
        (clinic_id, notification_type, recipient_staff_id, recipient_role,
         sender_staff_id, title, message, data, priority,
         related_patient_id, related_appointment_id, related_session_id)
        VALUES (:cid, :nt, :rid, :rr, :sender, :title, :msg, CAST(:data AS JSONB), :prio,
                :rp, :ra, :rs)
        RETURNING id, created_at
    """), {
        "cid": str(body.clinic_id),
        "nt": body.notification_type,
        "rid": str(body.recipient_staff_id) if body.recipient_staff_id else None,
        "rr": body.recipient_role,
        "sender": str(staff["staff_id"]) if staff else None,
        "title": body.title,
        "msg": body.message,
        "data": json.dumps(body.data),
        "prio": body.priority,
        "rp": str(body.related_patient_id) if body.related_patient_id else None,
        "ra": str(body.related_appointment_id) if body.related_appointment_id else None,
        "rs": str(body.related_session_id) if body.related_session_id else None,
    })).mappings().one()
    await db.flush()
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat()}


# ═══════════════════════════════════════════════════════════════════════════
# TREATMENT SESSIONS (Doctor → Nurse handoff)
# ═══════════════════════════════════════════════════════════════════════════
@session_router.post("/start", status_code=201)
async def session_start(
    body: SessionStartIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Doctor starts a treatment session for a patient"""
    row = (await db.execute(sql_text("""
        INSERT INTO treatment_sessions
        (patient_id, doctor_id, clinic_id, appointment_id, sitting_id,
         plan_id, walk_in_id, status)
        VALUES (:pid, :did, :cid, :apt, :sit, :plan, :walk, 'in_progress')
        RETURNING id, started_at
    """), {
        "pid": str(body.patient_id),
        "did": str(body.doctor_id),
        "cid": str(body.clinic_id),
        "apt": str(body.appointment_id) if body.appointment_id else None,
        "sit": str(body.sitting_id) if body.sitting_id else None,
        "plan": str(body.plan_id) if body.plan_id else None,
        "walk": str(body.walk_in_id) if body.walk_in_id else None,
    })).mappings().one()

    # If linked to appointment, mark in chair (both status + workflow_status for queue)
    if body.appointment_id:
        await db.execute(sql_text("""
            UPDATE appointments
            SET status = 'in_treatment', workflow_status = 'in_treatment',
                started_at = COALESCE(started_at, NOW()), updated_at = NOW()
            WHERE id = :id AND status NOT IN ('done','cancelled','completed')
        """), {"id": str(body.appointment_id)})

    await db.flush()
    return {
        "session_id": str(row["id"]),
        "started_at": row["started_at"].isoformat(),
        "status": "in_progress",
    }


@session_router.post("/{session_id}/finalize")
async def session_finalize(
    session_id: UUID,
    body: SessionFinalizeIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Doctor finalizes treatment + auto-notifies nurse to collect payment"""
    # Get session details
    sess = (await db.execute(sql_text("""
        SELECT ts.patient_id, ts.clinic_id, ts.doctor_id,
               p.name AS pname, p.phone AS pphone,
               s.name AS dname
        FROM treatment_sessions ts
        JOIN patients p ON p.id = ts.patient_id
        JOIN staff s ON s.id = ts.doctor_id
        WHERE ts.id = :id
    """), {"id": str(session_id)})).mappings().one_or_none()
    if not sess:
        raise HTTPException(404, "Session not found")

    # Update session
    procedures_json = json.dumps([p.dict() for p in body.procedures_done])
    await db.execute(sql_text("""
        UPDATE treatment_sessions SET
            procedures_done = CAST(:proc AS JSONB),
            treatment_notes = :notes,
            next_step = :nxt,
            amount_payable = :amt,
            used_tooth_chart = :ttc,
            prescription_id = :rx,
            finalized_at = NOW(),
            status = 'awaiting_payment',
            nurse_notified_at = NOW()
        WHERE id = :id
    """), {
        "proc": procedures_json,
        "notes": body.treatment_notes,
        "nxt": body.next_step,
        "amt": body.amount_payable,
        "ttc": body.used_tooth_chart,
        "rx": str(body.prescription_id) if body.prescription_id else None,
        "id": str(session_id),
    })

    # Auto-create notification for nurse(s)
    title = f"💰 Collect ₹{body.amount_payable:.0f} - {sess['pname']}"
    msg = (f"Dr. {sess['dname']} finalized treatment for {sess['pname']}. "
           f"Amount payable: ₹{body.amount_payable:.0f}")

    await db.execute(sql_text("""
        INSERT INTO clinic_notifications
        (clinic_id, notification_type, recipient_role, sender_staff_id,
         title, message, data, priority,
         related_patient_id, related_session_id)
        VALUES (:cid, 'payment_to_collect', 'nurse', :sender,
                :title, :msg, CAST(:data AS JSONB), 'high',
                :pid, :sid)
    """), {
        "cid": str(sess["clinic_id"]),
        "sender": str(sess["doctor_id"]),
        "title": title,
        "msg": msg,
        "data": json.dumps({
            "amount": body.amount_payable,
            "patient_name": sess["pname"],
            "patient_phone": sess["pphone"],
        }),
        "pid": str(sess["patient_id"]),
        "sid": str(session_id),
    })

    await db.flush()
    return {
        "session_id": str(session_id),
        "status": "awaiting_payment",
        "amount_payable": body.amount_payable,
        "nurse_notified": True,
    }


@session_router.get("/awaiting-payment")
async def awaiting_payment(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Nurse's collection queue — all sessions with payment pending"""
    rows = (await db.execute(sql_text("""
        SELECT ts.id, ts.patient_id, ts.amount_payable, ts.balance_remaining,
               ts.amount_collected, ts.finalized_at, ts.nurse_notified_at,
               ts.status, ts.next_step,
               p.name AS pname, p.phone AS pphone,
               d.name AS doctor_name,
               EXTRACT(EPOCH FROM (NOW() - ts.nurse_notified_at))/60 AS minutes_waiting
        FROM treatment_sessions ts
        JOIN patients p ON p.id = ts.patient_id
        JOIN staff d ON d.id = ts.doctor_id
        WHERE ts.clinic_id = :cid
          AND ts.status IN ('awaiting_payment', 'partial_payment')
        ORDER BY ts.finalized_at DESC
    """), {"cid": str(clinic_id)})).mappings().all()

    return [{
        "session_id": str(r["id"]),
        "patient_id": str(r["patient_id"]),
        "patient_name": r["pname"],
        "patient_phone": r["pphone"],
        "doctor_name": r["doctor_name"],
        "amount_payable": float(r["amount_payable"] or 0),
        "amount_collected": float(r["amount_collected"] or 0),
        "balance_remaining": float(r["balance_remaining"] or 0),
        "status": r["status"],
        "next_step": r["next_step"],
        "finalized_at": r["finalized_at"].isoformat() if r["finalized_at"] else None,
        "minutes_waiting": round(float(r["minutes_waiting"] or 0), 0),
        "urgent": (r["minutes_waiting"] or 0) > 15,
    } for r in rows]


@session_router.post("/{session_id}/collect-payment")
async def collect_payment(
    session_id: UUID,
    body: PaymentCollectIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Nurse records payment received (multi-mode supported)"""
    # Get session
    sess = (await db.execute(sql_text("""
        SELECT patient_id, clinic_id, doctor_id, amount_payable,
               (SELECT name FROM patients WHERE id = patient_id) AS pname
        FROM treatment_sessions WHERE id = :id
    """), {"id": str(session_id)})).mappings().one_or_none()
    if not sess:
        raise HTTPException(404, "Session not found")

    amount_payable = float(sess["amount_payable"] or 0)
    total_collected = body.total_collected
    balance = amount_payable - total_collected

    # Determine new status
    if balance <= 0.01:
        new_status = "completed"
    else:
        new_status = "partial_payment"

    # Update session
    components_json = json.dumps([c.dict() for c in body.components])
    await db.execute(sql_text("""
        UPDATE treatment_sessions SET
            amount_collected = :ac,
            balance_remaining = :bal,
            payment_components = CAST(:comp AS JSONB),
            payment_collected_at = NOW(),
            payment_collected_by = :nurse,
            status = :st
        WHERE id = :id
    """), {
        "ac": total_collected,
        "bal": max(balance, 0),
        "comp": components_json,
        "nurse": str(staff["staff_id"]) if staff else None,
        "st": new_status,
        "id": str(session_id),
    })

    # Create PaymentTransaction record for each payment mode
    for comp in body.components:
        await db.execute(sql_text("""
            INSERT INTO payment_transactions
            (patient_id, clinic_id, amount, payment_mode, transaction_reference, notes, created_at)
            VALUES (:pid, :cid, :amt, :mode, :txn, :notes, NOW())
        """), {
            "pid": str(sess["patient_id"]),
            "cid": str(sess["clinic_id"]),
            "amt": comp.amount,
            "mode": comp.mode,
            "txn": comp.txn_id,
            "notes": comp.notes or body.notes,
        })

    # Notify doctor that payment was received
    title = f"✅ Payment Received ₹{total_collected:.0f} - {sess['pname']}"
    msg = f"Nurse collected ₹{total_collected:.0f} from {sess['pname']}."
    if balance > 0:
        msg += f" Balance remaining: ₹{balance:.0f}"

    await db.execute(sql_text("""
        INSERT INTO clinic_notifications
        (clinic_id, notification_type, recipient_staff_id, sender_staff_id,
         title, message, data, priority,
         related_patient_id, related_session_id)
        VALUES (:cid, 'payment_received', :did, :sender,
                :title, :msg, CAST(:data AS JSONB), 'normal',
                :pid, :sid)
    """), {
        "cid": str(sess["clinic_id"]),
        "did": str(sess["doctor_id"]),
        "sender": str(staff["staff_id"]) if staff else None,
        "title": title,
        "msg": msg,
        "data": json.dumps({"amount": total_collected, "balance": balance}),
        "pid": str(sess["patient_id"]),
        "sid": str(session_id),
    })

    await db.flush()
    return {
        "session_id": str(session_id),
        "status": new_status,
        "total_collected": total_collected,
        "balance_remaining": max(balance, 0),
    }


@session_router.get("/today")
async def sessions_today(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Today's all sessions with current status"""
    rows = (await db.execute(sql_text("""
        SELECT ts.id, ts.patient_id, ts.status, ts.amount_payable,
               ts.amount_collected, ts.balance_remaining,
               ts.started_at, ts.finalized_at, ts.payment_collected_at,
               p.name AS pname,
               d.name AS doctor_name
        FROM treatment_sessions ts
        JOIN patients p ON p.id = ts.patient_id
        JOIN staff d ON d.id = ts.doctor_id
        WHERE ts.clinic_id = :cid
          AND DATE(ts.started_at) = CURRENT_DATE
        ORDER BY ts.started_at DESC
    """), {"cid": str(clinic_id)})).mappings().all()

    by_status: dict = {"in_progress": [], "awaiting_payment": [], "partial_payment": [], "completed": []}
    total_revenue = 0.0
    for r in rows:
        sess = {
            "id": str(r["id"]),
            "patient_id": str(r["patient_id"]),
            "patient_name": r["pname"],
            "doctor_name": r["doctor_name"],
            "amount_payable": float(r["amount_payable"] or 0),
            "amount_collected": float(r["amount_collected"] or 0),
            "balance_remaining": float(r["balance_remaining"] or 0),
            "started_at": r["started_at"].isoformat() if r["started_at"] else None,
            "finalized_at": r["finalized_at"].isoformat() if r["finalized_at"] else None,
            "payment_collected_at": r["payment_collected_at"].isoformat() if r["payment_collected_at"] else None,
        }
        st = r["status"]
        if st in by_status:
            by_status[st].append(sess)
        total_revenue += float(r["amount_collected"] or 0)

    return {
        "date": date_type.today().isoformat(),
        "total_sessions": len(rows),
        "total_revenue": total_revenue,
        "by_status": by_status,
    }


@session_router.get("/{session_id}")
async def session_detail(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Full session detail"""
    row = (await db.execute(sql_text("""
        SELECT ts.*, 
               p.name AS pname, p.phone, p.age, p.gender,
               d.name AS doctor_name,
               c.name AS clinic_name
        FROM treatment_sessions ts
        JOIN patients p ON p.id = ts.patient_id
        JOIN staff d ON d.id = ts.doctor_id
        JOIN clinics c ON c.id = ts.clinic_id
        WHERE ts.id = :id
    """), {"id": str(session_id)})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Session not found")
    return {
        "id": str(row["id"]),
        "patient_name": row["pname"],
        "patient_phone": row["phone"],
        "doctor_name": row["doctor_name"],
        "clinic_name": row["clinic_name"],
        "procedures_done": row["procedures_done"] or [],
        "treatment_notes": row["treatment_notes"],
        "next_step": row["next_step"],
        "amount_payable": float(row["amount_payable"] or 0),
        "amount_collected": float(row["amount_collected"] or 0),
        "balance_remaining": float(row["balance_remaining"] or 0),
        "payment_components": row["payment_components"] or [],
        "status": row["status"],
        "used_tooth_chart": row["used_tooth_chart"],
        "started_at": row["started_at"].isoformat() if row["started_at"] else None,
        "finalized_at": row["finalized_at"].isoformat() if row["finalized_at"] else None,
        "payment_collected_at": row["payment_collected_at"].isoformat() if row["payment_collected_at"] else None,
    }
