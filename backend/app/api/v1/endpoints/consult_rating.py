"""
backend/app/api/v1/endpoints/consult_rating.py — Bundle Q+

Three concerns bundled:
  1. Phone consultation product (public submit + Razorpay + admin queue + Rx send)
  2. Rating system (token-based public submit + credit application)
  3. Reminder scheduler tick (called by cron / n8n / "flush" button)

Endpoints:
  PUBLIC (no auth):
    POST /public/phone-consult                 → create + Razorpay order
    POST /public/phone-consult/verify          → Razorpay webhook verification
    GET  /public/rating/{token}                → render rating form (frontend uses)
    POST /public/rating/{token}                → submit rating (1–5 + comment)

  ADMIN (auth):
    GET  /phone-consult/queue                  → pending consultations
    POST /phone-consult/{id}/claim             → doctor takes a consult
    POST /phone-consult/{id}/complete          → mark done + send Rx
    GET  /ratings?clinic_id=...                → list ratings
    GET  /ratings/stats?clinic_id=...          → avg + distribution

  TRIGGERS (called by other modules):
    POST /triggers/scheduler-tick              → run reminder window check
    POST /triggers/lab-received/{order_id}     → on lab status='received'
    POST /triggers/visit-finalized/{visit_id}  → on visit close → queue rating ask
"""
from datetime import datetime, timezone, timedelta, date as date_type
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
import secrets

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.messaging import send_message
from app.services.whatsapp_matrix import notify_reward_earned

router = APIRouter(prefix="/consult", tags=["Phone Consult"])
rating_router = APIRouter(prefix="/ratings", tags=["Ratings"])
public_consult_router = APIRouter(prefix="/public", tags=["Public Endpoints"])
trigger_router = APIRouter(prefix="/triggers", tags=["Triggers"])


# ═══════════════════════════════════════════════════════════════
# PHONE CONSULTATION — PUBLIC SUBMIT
# ═══════════════════════════════════════════════════════════════
class PhoneConsultIn(BaseModel):
    clinic_id: UUID
    patient_name: str
    patient_phone: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    complaint: str
    duration_complaint: Optional[str] = None


@public_consult_router.post("/phone-consult")
async def create_phone_consult(body: PhoneConsultIn,
                                db: AsyncSession = Depends(get_db)):
    """Public endpoint — anyone can book. Creates phone_consultations row + Razorpay order."""
    if not body.patient_name.strip() or not body.patient_phone.strip() or not body.complaint.strip():
        raise HTTPException(400, "Name, phone, and complaint are required")

    # Read clinic settings for fee + razorpay
    settings = (await db.execute(sql_text("""
        SELECT phone_consult_enabled, phone_consult_fee, phone_consult_duration_min,
               razorpay_key_id, razorpay_key_secret, razorpay_mode
        FROM clinic_settings WHERE clinic_id = :cid
    """), {"cid": str(body.clinic_id)})).mappings().one_or_none()
    if not settings:
        raise HTTPException(404, "Clinic settings not configured")
    if not settings.get("phone_consult_enabled"):
        raise HTTPException(400, "Phone consultation is not enabled for this clinic")

    fee = float(settings.get("phone_consult_fee") or 100)
    duration = int(settings.get("phone_consult_duration_min") or 10)

    consult_id = str(uuid4())
    razorpay_order_id = None

    # Create Razorpay order if keys present
    if settings.get("razorpay_key_id") and settings.get("razorpay_key_secret"):
        try:
            import razorpay  # type: ignore
            rzp = razorpay.Client(auth=(settings["razorpay_key_id"], settings["razorpay_key_secret"]))
            order = rzp.order.create({
                "amount": int(fee * 100),  # in paise
                "currency": "INR",
                "notes": {"consult_id": consult_id, "patient": body.patient_name[:40]},
            })
            razorpay_order_id = order["id"]
        except ImportError:
            # razorpay package not installed — fall back to dummy order (test mode)
            razorpay_order_id = f"order_test_{secrets.token_hex(8)}"
        except Exception as e:
            # Razorpay error — let frontend retry or use offline payment
            razorpay_order_id = None

    await db.execute(sql_text("""
        INSERT INTO phone_consultations
            (id, clinic_id, patient_name, patient_phone, patient_age, patient_gender,
             complaint, duration_complaint, fee_amount, razorpay_order_id,
             payment_status, status, source)
        VALUES (:id, :cid, :nm, :ph, :age, :gen, :cmp, :dur, :fee, :ord,
                'pending', 'queued', 'public_website')
    """), {
        "id": consult_id, "cid": str(body.clinic_id),
        "nm": body.patient_name.strip(), "ph": body.patient_phone.strip(),
        "age": body.patient_age, "gen": body.patient_gender,
        "cmp": body.complaint.strip(), "dur": body.duration_complaint,
        "fee": fee, "ord": razorpay_order_id,
    })

    return {
        "consult_id": consult_id,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_key_id": settings.get("razorpay_key_id"),
        "amount": fee,
        "amount_paise": int(fee * 100),
        "currency": "INR",
        "duration_minutes": duration,
        "status": "pending_payment" if razorpay_order_id else "pending_offline",
    }


class PhoneConsultVerify(BaseModel):
    consult_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@public_consult_router.post("/phone-consult/verify")
async def verify_phone_consult_payment(body: PhoneConsultVerify,
                                        db: AsyncSession = Depends(get_db)):
    """Called by Razorpay handler in frontend after successful payment."""
    consult = (await db.execute(sql_text("""
        SELECT pc.*, cs.razorpay_key_id, cs.razorpay_key_secret, c.name AS clinic_name, c.phone AS clinic_phone
        FROM phone_consultations pc
        LEFT JOIN clinic_settings cs ON cs.clinic_id = pc.clinic_id
        LEFT JOIN clinics c ON c.id = pc.clinic_id
        WHERE pc.id = :id
    """), {"id": str(body.consult_id)})).mappings().one_or_none()
    if not consult:
        raise HTTPException(404, "Consultation not found")

    # Verify signature — FAIL CLOSED. Razorpay's scheme is documented:
    # signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    # so we verify directly and never depend on an optional library.
    secret = consult.get("razorpay_key_secret")
    if not secret:
        raise HTTPException(503, "Online payments are not configured for this clinic")
    import hashlib
    import hmac as hmac_mod
    expected = hmac_mod.new(
        secret.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    verified = hmac_mod.compare_digest(expected, body.razorpay_signature)

    if not verified:
        await db.execute(sql_text("""
            UPDATE phone_consultations SET payment_status = 'failed' WHERE id = :id
        """), {"id": str(body.consult_id)})
        raise HTTPException(400, "Payment signature verification failed")

    await db.execute(sql_text("""
        UPDATE phone_consultations
        SET razorpay_payment_id = :pid, payment_status = 'paid', paid_at = NOW()
        WHERE id = :id
    """), {"pid": body.razorpay_payment_id, "id": str(body.consult_id)})

    # Send confirmation WhatsApp
    duration_min = 10  # could read from settings
    try:
        await send_message(
            db=db, clinic_id=str(consult["clinic_id"]),
            template_key="phone_consult_confirmation",
            recipient_kind="patient", recipient_phone=consult["patient_phone"],
            recipient_name=consult["patient_name"],
            variables={
                "patient_name": consult["patient_name"],
                "fee": float(consult["fee_amount"]),
                "doctor_name": "the doctor",
                "phone": consult["patient_phone"],
                "duration_min": duration_min,
            },
            trigger="event",
        )
    except Exception:
        pass

    return {"verified": True, "consult_id": str(consult["id"])}


# ═══════════════════════════════════════════════════════════════
# PHONE CONSULTATION — ADMIN QUEUE
# ═══════════════════════════════════════════════════════════════
@router.get("/queue")
async def consult_queue(clinic_id: Optional[UUID] = None,
                         status: Optional[str] = Query(None),
                         db: AsyncSession = Depends(get_db),
                         staff=Depends(get_current_staff)):
    where = ["1=1"]
    params: Dict[str, Any] = {}
    if clinic_id:
        where.append("pc.clinic_id = :cid"); params["cid"] = str(clinic_id)
    if status:
        where.append("pc.status = :st"); params["st"] = status
    else:
        # Default: show paid + queued + doctor_calling (the actionable queue)
        where.append("pc.payment_status = 'paid' AND pc.status IN ('queued','doctor_calling')")
    rows = (await db.execute(sql_text(f"""
        SELECT pc.*, s.name AS doctor_name
        FROM phone_consultations pc
        LEFT JOIN staff s ON s.id = pc.doctor_id
        WHERE {' AND '.join(where)}
        ORDER BY pc.paid_at ASC NULLS LAST, pc.created_at DESC
    """), params)).mappings().all()
    def _iso(v): return v.isoformat() if v else None
    return {"consultations": [{
        "id": str(r["id"]),
        "patient_name": r["patient_name"],
        "patient_phone": r["patient_phone"],
        "patient_age": r["patient_age"],
        "patient_gender": r["patient_gender"],
        "complaint": r["complaint"],
        "duration_complaint": r["duration_complaint"],
        "fee_amount": float(r["fee_amount"] or 0),
        "payment_status": r["payment_status"],
        "status": r["status"],
        "doctor_id": str(r["doctor_id"]) if r["doctor_id"] else None,
        "doctor_name": r["doctor_name"],
        "paid_at": _iso(r["paid_at"]),
        "called_at": _iso(r["called_at"]),
        "completed_at": _iso(r["completed_at"]),
        "rx_id": str(r["rx_id"]) if r["rx_id"] else None,
        "rx_sent_at": _iso(r["rx_sent_at"]),
        "consult_notes": r["consult_notes"],
        "created_at": _iso(r["created_at"]),
        "razorpay_payment_id": r["razorpay_payment_id"],
    } for r in rows]}


@router.post("/{consult_id}/claim")
async def claim_consult(consult_id: UUID,
                         db: AsyncSession = Depends(get_db),
                         staff=Depends(get_current_staff)):
    """Doctor claims a consult — marks it 'doctor_calling'."""
    await db.execute(sql_text("""
        UPDATE phone_consultations
        SET doctor_id = :did, called_at = NOW(), status = 'doctor_calling'
        WHERE id = :id AND status = 'queued' AND payment_status = 'paid'
    """), {"did": str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
           "id": str(consult_id)})
    return {"claimed": True}


class ConsultComplete(BaseModel):
    consult_notes: Optional[str] = None
    rx_text: Optional[str] = None
    medicines: List[dict] = Field(default_factory=list)
    advice: Optional[str] = None
    followup_date: Optional[date_type] = None
    create_patient_record: bool = True


@router.post("/{consult_id}/complete")
async def complete_consult(consult_id: UUID, body: ConsultComplete,
                            db: AsyncSession = Depends(get_db),
                            staff=Depends(get_current_staff)):
    """Doctor completes — creates Rx, optionally creates patient row, sends Rx via WhatsApp."""
    consult = (await db.execute(sql_text("""
        SELECT * FROM phone_consultations WHERE id = :id
    """), {"id": str(consult_id)})).mappings().one_or_none()
    if not consult:
        raise HTTPException(404, "Not found")

    # Find or create patient
    patient_id = consult.get("patient_id")
    if not patient_id and body.create_patient_record:
        # Check if patient exists by phone
        existing = (await db.execute(sql_text("""
            SELECT id FROM patients WHERE phone = :ph LIMIT 1
        """), {"ph": consult["patient_phone"]})).mappings().one_or_none()
        if existing:
            patient_id = str(existing["id"])
        else:
            patient_id = str(uuid4())
            await db.execute(sql_text("""
                INSERT INTO patients
                    (id, name, phone, age, gender, preferred_clinic_id, is_active, total_visits)
                VALUES (:id, :n, :p, :a, :g, :c, TRUE, 1)
            """), {"id": patient_id, "n": consult["patient_name"], "p": consult["patient_phone"],
                   "a": consult["patient_age"], "g": consult["patient_gender"],
                   "c": str(consult["clinic_id"])})

    # Create prescription if Rx text or medicines provided
    rx_id = None
    if body.rx_text or body.medicines:
        import json
        rx_id = str(uuid4())
        await db.execute(sql_text("""
            INSERT INTO prescriptions
                (id, patient_id, clinic_id, doctor_id, complaint, diagnosis, medicines,
                 visible_advice, followup_date, created_at)
            VALUES (:id, :pid, :cid, :did, :cmp, :diag, CAST(:meds AS JSONB), :adv, :fu, NOW())
        """), {
            "id": rx_id, "pid": patient_id, "cid": str(consult["clinic_id"]),
            "did": str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
            "cmp": consult["complaint"][:300], "diag": body.rx_text[:300] if body.rx_text else None,
            "meds": json.dumps(body.medicines),
            "adv": body.advice, "fu": body.followup_date,
        })

    # Mark consult complete
    await db.execute(sql_text("""
        UPDATE phone_consultations
        SET status = 'completed', completed_at = NOW(),
            consult_notes = :notes, rx_id = :rxid, patient_id = :pid
        WHERE id = :id
    """), {"notes": body.consult_notes, "rxid": rx_id, "pid": patient_id, "id": str(consult_id)})

    # Send Rx via WhatsApp
    if rx_id or body.rx_text:
        rx_text_full = body.rx_text or ""
        if body.medicines:
            med_lines = []
            for m in body.medicines:
                line = f"• {m.get('name', '')}"
                if m.get("dose"): line += f" — {m['dose']}"
                if m.get("frequency"): line += f", {m['frequency']}"
                if m.get("duration"): line += f" for {m['duration']}"
                med_lines.append(line)
            rx_text_full = (rx_text_full + "\n\n" if rx_text_full else "") + "\n".join(med_lines)
        if body.advice:
            rx_text_full += f"\n\nAdvice: {body.advice}"

        try:
            await send_message(
                db=db, clinic_id=str(consult["clinic_id"]),
                template_key="phone_consult_rx",
                recipient_kind="patient",
                recipient_id=patient_id,
                recipient_phone=consult["patient_phone"],
                recipient_name=consult["patient_name"],
                variables={
                    "patient_name": consult["patient_name"],
                    "doctor_name": (staff or {}).get("name") or "Doctor",
                    "rx_text": rx_text_full,
                    "rx_pdf": f"/api/v1/prescriptions/{rx_id}/pdf" if rx_id else "—",
                    "followup_date": body.followup_date.isoformat() if body.followup_date else "—",
                },
                trigger="event",
                created_by=str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
            )
            await db.execute(sql_text("""
                UPDATE phone_consultations SET rx_sent_at = NOW() WHERE id = :id
            """), {"id": str(consult_id)})
        except Exception:
            pass

    return {"completed": True, "patient_id": patient_id, "rx_id": rx_id}


# ═══════════════════════════════════════════════════════════════
# RATINGS — public submit + admin list
# ═══════════════════════════════════════════════════════════════
@public_consult_router.get("/rating/{token}")
async def rating_lookup(token: str, db: AsyncSession = Depends(get_db)):
    """Frontend pre-fills rating page using this."""
    row = (await db.execute(sql_text("""
        SELECT pr.*, p.name AS patient_name, c.name AS clinic_name
        FROM patient_ratings pr
        LEFT JOIN patients p ON p.id = pr.patient_id
        LEFT JOIN clinics c ON c.id = pr.clinic_id
        WHERE pr.token = :t
    """), {"t": token})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Invalid or expired rating link")
    return {
        "token": token,
        "patient_name": row.get("patient_name"),
        "clinic_name": row.get("clinic_name"),
        "already_submitted": row.get("rating") is not None and row.get("rating") > 0,
        "rating": row.get("rating"),
        "comment": row.get("comment"),
    }


class RatingSubmit(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


@public_consult_router.post("/rating/{token}")
async def submit_rating(token: str, body: RatingSubmit,
                         db: AsyncSession = Depends(get_db)):
    row = (await db.execute(sql_text("""
        SELECT id, patient_id, clinic_id, rating FROM patient_ratings WHERE token = :t
    """), {"t": token})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Invalid rating link")
    if row.get("rating") and row["rating"] > 0:
        return {"already_submitted": True, "rating": row["rating"]}

    await db.execute(sql_text("""
        UPDATE patient_ratings
        SET rating = :r, comment = :c, submitted_at = NOW()
        WHERE id = :id
    """), {"r": body.rating, "c": body.comment, "id": str(row["id"])})

    # Apply discount credit if settings say so
    settings = (await db.execute(sql_text("""
        SELECT rating_discount_amount, rating_discount_mode FROM clinic_settings WHERE clinic_id = :cid
    """), {"cid": str(row["clinic_id"])})).mappings().one_or_none()
    credit_id = None
    discount_amount = float((settings or {}).get("rating_discount_amount") or 100)

    if settings and (settings.get("rating_discount_mode") in ("auto_apply", "coupon")):
        credit_id = str(uuid4())
        # Credit expires in 90 days
        await db.execute(sql_text("""
            INSERT INTO patient_credits
                (id, patient_id, clinic_id, amount, reason, rating_id, expires_at)
            VALUES (:id, :pid, :cid, :amt, :reason, :rid, CURRENT_DATE + INTERVAL '90 days')
        """), {
            "id": credit_id, "pid": str(row["patient_id"]),
            "cid": str(row["clinic_id"]), "amt": discount_amount,
            "reason": f"Rating reward — {body.rating}★",
            "rid": str(row["id"]),
        })
        await db.execute(sql_text("""
            UPDATE patient_ratings SET credit_applied = TRUE, credit_id = :cid WHERE id = :id
        """), {"cid": credit_id, "id": str(row["id"])})
        try:
            await notify_reward_earned(
                db,
                str(row["patient_id"]),
                str(row["clinic_id"]),
                discount_amount,
                datetime.now(timezone.utc) + timedelta(days=90),
            )
        except Exception:
            pass

    return {
        "submitted": True,
        "rating": body.rating,
        "credit_amount": discount_amount if credit_id else 0,
        "credit_id": credit_id,
    }


@rating_router.get("")
async def list_ratings(clinic_id: UUID,
                        rating_min: Optional[int] = None,
                        limit: int = Query(50, ge=1, le=200),
                        offset: int = Query(0, ge=0),
                        db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    where = ["pr.clinic_id = :cid", "pr.rating IS NOT NULL"]
    params: Dict[str, Any] = {"cid": str(clinic_id), "lim": limit, "off": offset}
    if rating_min:
        where.append("pr.rating >= :rmin"); params["rmin"] = rating_min
    rows = (await db.execute(sql_text(f"""
        SELECT pr.id, pr.rating, pr.comment, pr.submitted_at, pr.credit_applied,
               pr.patient_id, p.name AS patient_name, p.phone AS patient_phone
        FROM patient_ratings pr
        LEFT JOIN patients p ON p.id = pr.patient_id
        WHERE {' AND '.join(where)}
        ORDER BY pr.submitted_at DESC
        LIMIT :lim OFFSET :off
    """), params)).mappings().all()
    return {"ratings": [{
        "id": str(r["id"]),
        "patient_id": str(r["patient_id"]) if r["patient_id"] else None,
        "patient_name": r["patient_name"],
        "patient_phone": r["patient_phone"],
        "rating": r["rating"],
        "comment": r["comment"],
        "submitted_at": r["submitted_at"].isoformat() if r["submitted_at"] else None,
        "credit_applied": bool(r["credit_applied"]),
    } for r in rows]}


@rating_router.get("/stats")
async def rating_stats(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text("""
        SELECT
            COUNT(*) FILTER (WHERE rating IS NOT NULL)         AS total_responses,
            AVG(rating) FILTER (WHERE rating IS NOT NULL)      AS avg_rating,
            COUNT(*) FILTER (WHERE rating = 5)                 AS five,
            COUNT(*) FILTER (WHERE rating = 4)                 AS four,
            COUNT(*) FILTER (WHERE rating = 3)                 AS three,
            COUNT(*) FILTER (WHERE rating = 2)                 AS two,
            COUNT(*) FILTER (WHERE rating = 1)                 AS one,
            COUNT(*) FILTER (WHERE asked_at IS NOT NULL AND rating IS NULL) AS unanswered
        FROM patient_ratings WHERE clinic_id = :cid
    """), {"cid": str(clinic_id)})).mappings().one()
    return {
        "clinic_id": str(clinic_id),
        "total_responses": int(row["total_responses"] or 0),
        "avg_rating": float(row["avg_rating"]) if row["avg_rating"] else 0,
        "distribution": {
            "5": int(row["five"] or 0), "4": int(row["four"] or 0),
            "3": int(row["three"] or 0), "2": int(row["two"] or 0), "1": int(row["one"] or 0),
        },
        "unanswered": int(row["unanswered"] or 0),
    }


# ═══════════════════════════════════════════════════════════════
# TRIGGERS — scheduler tick + lab received + visit finalized
# ═══════════════════════════════════════════════════════════════
async def _build_reminder_for_appointment(db, clinic_id: str, apt_id: str,
                                            template_key: str, scheduled_for: datetime):
    """Queue a reminder message_log row for the given appointment."""
    apt = (await db.execute(sql_text("""
        SELECT a.id, COALESCE(a.confirmed_date, a.requested_date) AS d,
               COALESCE(a.confirmed_time, a.requested_time) AS t,
               a.reason, a.appointment_type, a.patient_id,
               p.name AS patient_name, p.phone AS patient_phone,
               c.name AS clinic_name, c.address AS clinic_address, c.phone AS clinic_phone,
               s.name AS doctor_name
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN staff s ON s.id = a.doctor_id
        WHERE a.id = :id
    """), {"id": apt_id})).mappings().one_or_none()
    if not apt or not apt.get("patient_phone"):
        return None
    vars = {
        "patient_name": apt["patient_name"] or "Patient",
        "clinic_name": apt["clinic_name"] or "the clinic",
        "clinic_address": apt["clinic_address"] or "",
        "clinic_phone": apt["clinic_phone"] or "",
        "doctor_name": apt["doctor_name"] or "the doctor",
        "date": apt["d"].strftime("%d %b") if apt.get("d") else "—",
        "time": str(apt["t"])[:5] if apt.get("t") else "—",
        "appointment_type": apt["appointment_type"] or apt["reason"] or "appointment",
    }
    return await send_message(
        db=db, clinic_id=clinic_id, template_key=template_key,
        recipient_kind="patient", recipient_id=str(apt["patient_id"]),
        recipient_phone=apt["patient_phone"], recipient_name=apt["patient_name"],
        variables=vars, appointment_id=apt_id, trigger="auto",
        scheduled_for=scheduled_for,
    )


@trigger_router.post("/scheduler-tick")
async def scheduler_tick(clinic_id: Optional[UUID] = None,
                         db: AsyncSession = Depends(get_db),
                         staff=Depends(get_current_staff)):
    """Run periodically (every 10 min) — called by cron, n8n, or "Flush Now" button.
    Reads clinic_settings for which reminders to send + the lookback/lookahead windows."""
    where_cs = ""
    params: Dict[str, Any] = {}
    if clinic_id:
        where_cs = "WHERE clinic_id = :cid"; params["cid"] = str(clinic_id)
    settings_rows = (await db.execute(sql_text(f"""
        SELECT clinic_id, reminder_24h_enabled, reminder_2h_enabled, reminder_30m_enabled
        FROM clinic_settings {where_cs}
    """), params)).mappings().all()

    summary = {"appointments_checked": 0, "queued": 0, "flushed": {"sent": 0, "failed": 0}}

    for cs in settings_rows:
        cid = str(cs["clinic_id"])
        # ── 24h reminders: find appointments tomorrow that don't have a reminder_24h log yet
        if cs["reminder_24h_enabled"]:
            tomorrow = (datetime.now(timezone.utc) + timedelta(hours=24)).date()
            target_send_at = datetime.now(timezone.utc) + timedelta(hours=24) - timedelta(minutes=5)
            apts = (await db.execute(sql_text("""
                SELECT a.id
                FROM appointments a
                WHERE a.clinic_id = :cid
                  AND COALESCE(a.confirmed_date, a.requested_date) = :d
                  AND COALESCE(a.workflow_status, a.status) IN ('scheduled','confirmed')
                  AND NOT EXISTS (
                      SELECT 1 FROM message_log ml
                      WHERE ml.appointment_id = a.id AND ml.template_key = 'reminder_24h'
                  )
                LIMIT 50
            """), {"cid": cid, "d": tomorrow})).mappings().all()
            for apt in apts:
                await _build_reminder_for_appointment(db, cid, str(apt["id"]),
                                                       "reminder_24h", target_send_at)
                summary["queued"] += 1
            summary["appointments_checked"] += len(apts)

        # ── 2h reminders
        if cs["reminder_2h_enabled"]:
            window_start = datetime.now(timezone.utc) + timedelta(hours=1, minutes=45)
            window_end = datetime.now(timezone.utc) + timedelta(hours=2, minutes=15)
            apts = (await db.execute(sql_text("""
                SELECT a.id, COALESCE(a.confirmed_date, a.requested_date) AS d,
                       COALESCE(a.confirmed_time, a.requested_time) AS t
                FROM appointments a
                WHERE a.clinic_id = :cid
                  AND COALESCE(a.workflow_status, a.status) IN ('scheduled','confirmed')
                  AND a.confirmed_date IS NOT NULL
                  AND (a.confirmed_date + a.confirmed_time)::timestamptz
                      BETWEEN :ws AND :we
                  AND NOT EXISTS (
                      SELECT 1 FROM message_log ml
                      WHERE ml.appointment_id = a.id AND ml.template_key = 'reminder_2h'
                  )
                LIMIT 50
            """), {"cid": cid, "ws": window_start, "we": window_end})).mappings().all()
            for apt in apts:
                await _build_reminder_for_appointment(db, cid, str(apt["id"]),
                                                       "reminder_2h",
                                                       datetime.now(timezone.utc))
                summary["queued"] += 1
            summary["appointments_checked"] += len(apts)

    # Flush any queued messages whose scheduled_for has passed
    from app.services.messaging import flush_queued
    summary["flushed"] = await flush_queued(db)

    return summary


async def send_lab_received_message(db: AsyncSession, order_id: str, created_by: Optional[str] = None):
    order = (await db.execute(sql_text("""
        SELECT lo.*, p.name AS patient_name, p.phone AS patient_phone,
               c.name AS clinic_name, c.phone AS clinic_phone
        FROM lab_orders lo
        LEFT JOIN patients p ON p.id = lo.patient_id
        LEFT JOIN clinics c ON c.id = lo.clinic_id
        WHERE lo.id = :id
    """), {"id": order_id})).mappings().one_or_none()
    if not order:
        raise HTTPException(404, "Lab order not found")
    if not order.get("patient_phone"):
        return {"sent": False, "reason": "Patient has no phone"}

    booking_link = f"https://wa.me/{(order.get('clinic_phone') or '').replace('+','').replace(' ','')}?text=Hi%2C%20my%20{order.get('work_type','dental work')}%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting"

    return await send_message(
        db=db, clinic_id=str(order["clinic_id"]),
        template_key="lab_received",
        recipient_kind="patient",
        recipient_id=str(order["patient_id"]),
        recipient_phone=order["patient_phone"],
        recipient_name=order["patient_name"],
        variables={
            "patient_name": order["patient_name"] or "",
            "work_type": order.get("work_type") or "dental work",
            "clinic_phone": order.get("clinic_phone") or "",
            "booking_link": booking_link,
        },
        lab_order_id=order_id,
        trigger="event",
        created_by=created_by,
    )


async def maybe_queue_rating_ask(db: AsyncSession, visit_id: str):
    visit = (await db.execute(sql_text("""
        SELECT ts.id, ts.patient_id, ts.clinic_id, ts.appointment_id, ts.finalized_at,
               p.name AS patient_name, p.phone AS patient_phone,
               c.name AS clinic_name
        FROM treatment_sessions ts
        LEFT JOIN patients p ON p.id = ts.patient_id
        LEFT JOIN clinics c ON c.id = ts.clinic_id
        WHERE ts.id = :id
    """), {"id": visit_id})).mappings().one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")
    if not visit.get("patient_phone"):
        return {"skipped": True, "reason": "No phone"}

    settings = (await db.execute(sql_text("""
        SELECT rating_ask_enabled, rating_ask_hours, rating_discount_amount
        FROM clinic_settings WHERE clinic_id = :cid
    """), {"cid": str(visit["clinic_id"])})).mappings().one_or_none()
    if not settings or not settings.get("rating_ask_enabled"):
        return {"skipped": True, "reason": "Rating ask disabled in settings"}

    existing = (await db.execute(sql_text("""
        SELECT id FROM patient_ratings WHERE visit_id = :vid LIMIT 1
    """), {"vid": visit_id})).mappings().one_or_none()
    if existing:
        return {"skipped": True, "reason": "Rating already queued"}

    # Create rating row with token
    rating_id = str(uuid4())
    token = secrets.token_urlsafe(24)
    await db.execute(sql_text("""
        INSERT INTO patient_ratings
            (id, patient_id, clinic_id, visit_id, appointment_id, asked_at, token)
        VALUES (:id, :pid, :cid, :vid, :aid, NOW(), :tk)
    """), {
        "id": rating_id, "pid": str(visit["patient_id"]), "cid": str(visit["clinic_id"]),
        "vid": str(visit["id"]), "aid": str(visit["appointment_id"]) if visit.get("appointment_id") else None,
        "tk": token,
    })

    # Schedule ask
    hours = int(settings.get("rating_ask_hours") or 24)
    scheduled = datetime.now(timezone.utc) + timedelta(hours=hours)
    rating_link = f"/public/rating?token={token}"
    discount = float(settings.get("rating_discount_amount") or 100)

    result = await send_message(
        db=db, clinic_id=str(visit["clinic_id"]),
        template_key="rating_ask",
        recipient_kind="patient",
        recipient_id=str(visit["patient_id"]),
        recipient_phone=visit["patient_phone"],
        recipient_name=visit["patient_name"],
        variables={
            "patient_name": visit["patient_name"] or "",
            "clinic_name": visit["clinic_name"] or "the clinic",
            "visit_date": visit["finalized_at"].strftime("%d %b") if visit.get("finalized_at") else "",
            "rating_link": rating_link,
            "discount": discount,
        },
        visit_id=visit_id, trigger="auto", scheduled_for=scheduled,
    )
    return {"queued": True, "rating_id": rating_id, "token": token, "msg": result}


async def maybe_send_receipt(db: AsyncSession, payment_tx_id: str):
    tx = (await db.execute(sql_text("""
        SELECT pt.*, p.name AS patient_name, p.phone AS patient_phone,
               c.name AS clinic_name
        FROM payment_transactions pt
        LEFT JOIN patients p ON p.id = pt.patient_id
        LEFT JOIN clinics c ON c.id = pt.clinic_id
        WHERE pt.id = :id
    """), {"id": payment_tx_id})).mappings().one_or_none()
    if not tx or not tx.get("patient_phone"):
        return {"skipped": True, "reason": "No patient phone"}

    settings = (await db.execute(sql_text("""
        SELECT receipt_mode FROM clinic_settings WHERE clinic_id = :cid
    """), {"cid": str(tx["clinic_id"])})).mappings().one_or_none()
    if not settings or settings.get("receipt_mode") != "auto":
        return {"skipped": True, "reason": "Receipt mode not auto"}

    bal = (await db.execute(sql_text("""
        SELECT COALESCE(SUM(amount_total) - SUM(amount_paid), 0) AS bal
        FROM treatment_plans WHERE patient_id = :pid AND clinic_id = :cid
    """), {"pid": str(tx["patient_id"]), "cid": str(tx["clinic_id"])})).mappings().one_or_none()
    balance = float((bal or {}).get("bal") or 0)

    return await send_message(
        db=db, clinic_id=str(tx["clinic_id"]),
        template_key="receipt",
        recipient_kind="patient",
        recipient_id=str(tx["patient_id"]),
        recipient_phone=tx["patient_phone"],
        recipient_name=tx["patient_name"],
        variables={
            "patient_name": tx["patient_name"] or "",
            "date": tx["date"].strftime("%d %b %Y") if tx.get("date") else "",
            "amount": float(tx.get("amount") or 0),
            "mode": tx.get("payment_mode") or "",
            "balance": balance,
            "clinic_name": tx.get("clinic_name") or "",
        },
        payment_id=payment_tx_id,
        trigger="auto",
    )


@trigger_router.post("/lab-received/{order_id}")
async def trigger_lab_received(order_id: UUID,
                                db: AsyncSession = Depends(get_db),
                                staff=Depends(get_current_staff)):
    """Called when a lab order's status flips to 'received'.
    Sends the patient a 'your work is ready' WhatsApp + suggests booking."""
    return await send_lab_received_message(
        db,
        str(order_id),
        str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
    )


@trigger_router.post("/visit-finalized/{visit_id}")
async def trigger_visit_finalized(visit_id: UUID,
                                   db: AsyncSession = Depends(get_db),
                                   staff=Depends(get_current_staff)):
    """When a treatment_sessions row finalizes, queue a rating ask for T+settings.rating_ask_hours."""
    return await maybe_queue_rating_ask(db, str(visit_id))
