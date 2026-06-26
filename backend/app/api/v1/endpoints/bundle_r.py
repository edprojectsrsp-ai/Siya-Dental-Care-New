"""
backend/app/api/v1/endpoints/bundle_r.py — Siya Dental Bundle R

Adds four endpoint families:
  1. /constraints/*    — booking guards (lab/specialist/balance/severity)
  2. /observations/*   — tooth observations with severity (hover UX backend)
  3. /counters/*       — communication dashboard counters
  4. /followups/*      — separated follow-up scheduling (+ auto reminders)
  5. /specialist-tiers/* — doctor-defined per-treatment rate tiers
"""
from datetime import datetime, timezone, timedelta, date as date_type
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.messaging import send_message

constraints_router  = APIRouter(prefix="/constraints",       tags=["Booking Constraints"])
observations_router = APIRouter(prefix="/observations",      tags=["Tooth Observations"])
counters_router     = APIRouter(prefix="/counters",          tags=["Communication Counters"])
followups_router    = APIRouter(prefix="/followups",         tags=["Follow-ups"])
tiers_router        = APIRouter(prefix="/specialist-tiers",  tags=["Specialist Rate Tiers"])


# ═══════════════════════════════════════════════════════════════════════════
# 1) BOOKING CONSTRAINTS — called when staff opens the booking form
# ═══════════════════════════════════════════════════════════════════════════
@constraints_router.get("/patient/{patient_id}")
async def patient_booking_constraints(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Returns blockers + soft prompts to surface during booking.

    Frontend uses this to show a banner like:
      "⚠ Patient has 2 lab orders pending — confirm delivery before this appointment?"
      "✓ Lab work ready for fitting (1 case)"
      "ℹ Outstanding balance: ₹2,500"
    """
    row = (await db.execute(sql_text("""
        SELECT * FROM patient_booking_constraints_v WHERE patient_id = :pid
    """), {"pid": str(patient_id)})).mappings().one_or_none()
    if not row:
        return {"patient_id": str(patient_id), "blockers": [], "prompts": [], "info": []}

    blockers: List[Dict[str, Any]] = []
    prompts:  List[Dict[str, Any]] = []
    info:     List[Dict[str, Any]] = []

    if row["lab_overdue"] and row["lab_overdue"] > 0:
        blockers.append({
            "kind": "lab_overdue",
            "severity": "high",
            "message": f"{row['lab_overdue']} lab order(s) overdue — confirm before scheduling treatment",
            "count": row["lab_overdue"],
        })

    if row["lab_ready_for_fitting"] and row["lab_ready_for_fitting"] > 0:
        prompts.append({
            "kind": "lab_ready",
            "severity": "info",
            "message": f"✓ {row['lab_ready_for_fitting']} lab case(s) ready — book as fitting appointment?",
            "count": row["lab_ready_for_fitting"],
            "suggested_type": "fitting",
        })

    if row["pending_lab_orders"] and row["pending_lab_orders"] > 0:
        prompts.append({
            "kind": "lab_pending",
            "severity": "warn",
            "message": f"{row['pending_lab_orders']} lab order(s) still in progress — ETA matters for treatment slot",
            "count": row["pending_lab_orders"],
        })

    if row["urgent_observations"] and row["urgent_observations"] > 0:
        prompts.append({
            "kind": "urgent_obs",
            "severity": "warn",
            "message": f"{row['urgent_observations']} urgent tooth observation(s) pending treatment",
            "count": row["urgent_observations"],
        })

    if row["outstanding_balance"] and float(row["outstanding_balance"]) > 0:
        info.append({
            "kind": "balance",
            "severity": "info",
            "message": f"Outstanding: ₹{float(row['outstanding_balance']):,.0f}",
            "amount": float(row["outstanding_balance"]),
        })

    # Active specialist assignments?
    spec_q = (await db.execute(sql_text("""
        SELECT a.id AS apt_id, a.specialist_id, s.name AS specialist_name,
               COALESCE(a.confirmed_date, a.requested_date) AS d
        FROM appointments a
        LEFT JOIN staff s ON s.id = a.specialist_id
        WHERE a.patient_id = :pid
          AND a.specialist_id IS NOT NULL
          AND COALESCE(a.workflow_status, a.status) NOT IN ('completed','cancelled')
        ORDER BY d DESC LIMIT 3
    """), {"pid": str(patient_id)})).mappings().all()
    if spec_q:
        prompts.append({
            "kind": "active_specialist",
            "severity": "info",
            "message": f"Active specialist: Dr. {spec_q[0]['specialist_name']}",
            "details": [{"apt_id": str(r["apt_id"]), "specialist": r["specialist_name"]} for r in spec_q],
        })

    return {
        "patient_id": str(patient_id),
        "blockers": blockers,
        "prompts": prompts,
        "info": info,
        "raw": {k: (float(v) if isinstance(v, (int, float)) and v is not None else v)
                for k, v in dict(row).items() if k != "clinic_id"},
    }


# ═══════════════════════════════════════════════════════════════════════════
# 2) TOOTH OBSERVATIONS
# ═══════════════════════════════════════════════════════════════════════════
SEVERITY_COLORS = {
    "info":     "#94A3B8",  # slate
    "watch":    "#3B82F6",  # blue
    "mild":     "#F59E0B",  # amber
    "moderate": "#F97316",  # orange
    "severe":   "#EF4444",  # red
    "urgent":   "#7F1D1D",  # dark red
}


class ObservationIn(BaseModel):
    patient_id: UUID
    tooth_number: int = Field(..., ge=11, le=48)
    surface: Optional[str] = None
    observation: str
    severity: str = "info"
    status: str = "open"
    suggested_treatment: Optional[str] = None
    visit_id: Optional[UUID] = None
    notes: Optional[str] = None


@observations_router.get("/patient/{patient_id}")
async def list_observations(
    patient_id: UUID,
    status: Optional[str] = Query(None),
    tooth: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    where = ["patient_id = :pid"]
    params: Dict[str, Any] = {"pid": str(patient_id)}
    if status:
        where.append("status = :st"); params["st"] = status
    if tooth:
        where.append("tooth_number = :t"); params["t"] = tooth

    rows = (await db.execute(sql_text(f"""
        SELECT o.*, s.name AS observed_by_name
        FROM tooth_observations o
        LEFT JOIN staff s ON s.id = o.observed_by
        WHERE {' AND '.join(where)}
        ORDER BY o.observed_at DESC
    """), params)).mappings().all()

    # Group by tooth_number for the hover UX
    by_tooth: Dict[int, List[Dict[str, Any]]] = {}
    for r in rows:
        d = {
            "id": str(r["id"]),
            "tooth": r["tooth_number"],
            "surface": r["surface"],
            "observation": r["observation"],
            "severity": r["severity"],
            "severity_color": SEVERITY_COLORS.get(r["severity"], "#94A3B8"),
            "status": r["status"],
            "suggested_treatment": r["suggested_treatment"],
            "observed_at": r["observed_at"].isoformat() if r["observed_at"] else None,
            "observed_by": r["observed_by_name"],
            "notes": r["notes"],
            "visit_id": str(r["visit_id"]) if r["visit_id"] else None,
        }
        by_tooth.setdefault(r["tooth_number"], []).append(d)

    # Compute tooth-level summary (worst severity per tooth → drives chart color)
    severity_order = ["info", "watch", "mild", "moderate", "severe", "urgent"]
    tooth_summary = {}
    for tn, obs in by_tooth.items():
        worst = max((severity_order.index(o["severity"]) for o in obs if o["status"] == "open"),
                    default=-1)
        if worst >= 0:
            sev = severity_order[worst]
            tooth_summary[tn] = {
                "severity": sev,
                "color": SEVERITY_COLORS[sev],
                "open_count": sum(1 for o in obs if o["status"] == "open"),
                "total_count": len(obs),
            }

    return {
        "patient_id": str(patient_id),
        "observations": [d for tn in by_tooth for d in by_tooth[tn]],
        "by_tooth": by_tooth,
        "tooth_summary": tooth_summary,  # for chart coloring
    }


@observations_router.post("")
async def create_observation(
    body: ObservationIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if body.severity not in SEVERITY_COLORS:
        raise HTTPException(400, f"Invalid severity. Choose from: {list(SEVERITY_COLORS.keys())}")
    obs_id = str(uuid4())
    await db.execute(sql_text("""
        INSERT INTO tooth_observations
            (id, patient_id, tooth_number, surface, observation, severity, status,
             suggested_treatment, observed_at, observed_by, visit_id, notes)
        VALUES (:id, :pid, :tn, :surf, :obs, :sev, :st, :sug, NOW(), :ob, :vid, :n)
    """), {
        "id": obs_id, "pid": str(body.patient_id),
        "tn": body.tooth_number, "surf": body.surface,
        "obs": body.observation, "sev": body.severity, "st": body.status,
        "sug": body.suggested_treatment, "vid": str(body.visit_id) if body.visit_id else None,
        "ob": str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
        "n": body.notes,
    })
    return {"id": obs_id, "created": True}


@observations_router.patch("/{obs_id}")
async def update_observation(
    obs_id: UUID, body: dict,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    allowed = {"observation", "severity", "status", "suggested_treatment", "notes"}
    sets = []
    params: Dict[str, Any] = {"id": str(obs_id)}
    for k, v in body.items():
        if k in allowed:
            sets.append(f"{k} = :{k}"); params[k] = v
    if body.get("status") in ("completed", "resolved"):
        sets.append("resolved_at = NOW()")
        sets.append("resolved_by = :rb")
        params["rb"] = str(staff["staff_id"]) if staff and staff.get("staff_id") else None
    if not sets:
        raise HTTPException(400, "No valid fields")
    await db.execute(sql_text(f"UPDATE tooth_observations SET {', '.join(sets)} WHERE id = :id"), params)
    return {"updated": True}


@observations_router.delete("/{obs_id}")
async def delete_observation(obs_id: UUID, db: AsyncSession = Depends(get_db),
                              staff=Depends(get_current_staff)):
    await db.execute(sql_text("DELETE FROM tooth_observations WHERE id = :id"), {"id": str(obs_id)})
    return {"deleted": True}


@observations_router.get("/severity-legend")
async def severity_legend():
    return {"legend": [
        {"severity": k, "color": v, "label": k.title()}
        for k, v in SEVERITY_COLORS.items()
    ]}


# ═══════════════════════════════════════════════════════════════════════════
# 3) COMMUNICATION COUNTERS DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════
@counters_router.get("")
async def get_counters(
    clinic_id: UUID,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    row = (await db.execute(sql_text("""
        SELECT * FROM communication_counter_v WHERE clinic_id = :cid
    """), {"cid": str(clinic_id)})).mappings().one_or_none()

    redeemed = (await db.execute(sql_text("""
        SELECT rewards_redeemed FROM rewards_redeemed_v WHERE clinic_id = :cid
    """), {"cid": str(clinic_id)})).mappings().one_or_none()

    bulk = (await db.execute(sql_text("""
        SELECT COUNT(*) AS c FROM message_log
        WHERE clinic_id = :cid AND trigger = 'manual'
          AND created_at >= NOW() - INTERVAL '30 days'
          AND recipient_kind = 'patient'
    """), {"cid": str(clinic_id)})).mappings().one_or_none()

    if not row:
        return {"clinic_id": str(clinic_id), **{k: 0 for k in [
            "confirmations_sent","reminders_sent","followup_reminders_sent","receipts_sent",
            "rating_requests_sent","rating_reminders_sent","rewards_generated","rewards_redeemed",
            "lab_orders_sent","lab_reminders_sent","specialist_messages_sent",
            "doctor_digest_sent","nurse_digest_sent","manual_messages_sent",
            "bulk_messages_sent","failed_messages","click_to_chat_pending",
            "today_count","week_count","month_count"
        ]}}

    return {
        "clinic_id": str(clinic_id),
        "confirmations_sent":       int(row["confirmations_sent"] or 0),
        "reminders_sent":           int(row["reminders_sent"] or 0),
        "followup_reminders_sent":  int(row["followup_reminders_sent"] or 0),
        "receipts_sent":            int(row["receipts_sent"] or 0),
        "rating_requests_sent":     int(row["rating_requests_sent"] or 0),
        "rating_reminders_sent":    int(row["rating_reminders_sent"] or 0),
        "rewards_generated":        int(row["rewards_generated"] or 0),
        "rewards_redeemed":         int((redeemed or {}).get("rewards_redeemed") or 0),
        "lab_orders_sent":          int(row["lab_orders_sent"] or 0),
        "lab_reminders_sent":       int(row["lab_reminders_sent"] or 0),
        "specialist_messages_sent": int(row["specialist_messages_sent"] or 0),
        "doctor_digest_sent":       int(row["doctor_digest_sent"] or 0),
        "nurse_digest_sent":        int(row["nurse_digest_sent"] or 0),
        "manual_messages_sent":     int(row["manual_messages_sent"] or 0),
        "bulk_messages_sent":       int((bulk or {}).get("c") or 0),
        "failed_messages":          int(row["failed_messages"] or 0),
        "click_to_chat_pending":    int(row["click_to_chat_pending"] or 0),
        "today_count":              int(row["today_count"] or 0),
        "week_count":               int(row["week_count"] or 0),
        "month_count":              int(row["month_count"] or 0),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 4) FOLLOW-UPS — schedule + auto reminders
# ═══════════════════════════════════════════════════════════════════════════
class FollowUpIn(BaseModel):
    patient_id: UUID
    clinic_id: UUID
    follow_up_date: date_type
    purpose: str
    related_visit_id: Optional[UUID] = None
    related_appointment_id: Optional[UUID] = None
    notes: Optional[str] = None


@followups_router.get("")
async def list_followups(
    clinic_id: Optional[UUID] = None,
    patient_id: Optional[UUID] = None,
    status: Optional[str] = None,
    days_window: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    where = ["follow_up_date >= CURRENT_DATE - INTERVAL '7 days'",
             "follow_up_date <= CURRENT_DATE + INTERVAL '1 day' * :dw"]
    params: Dict[str, Any] = {"dw": days_window}
    if clinic_id:  where.append("f.clinic_id = :cid"); params["cid"] = str(clinic_id)
    if patient_id: where.append("f.patient_id = :pid"); params["pid"] = str(patient_id)
    if status:     where.append("f.status = :st"); params["st"] = status

    rows = (await db.execute(sql_text(f"""
        SELECT f.*, p.name AS patient_name, p.phone AS patient_phone
        FROM follow_ups f
        LEFT JOIN patients p ON p.id = f.patient_id
        WHERE {' AND '.join(where)}
        ORDER BY f.follow_up_date ASC, f.created_at DESC
    """), params)).mappings().all()
    return {"followups": [{
        "id": str(r["id"]),
        "patient_id": str(r["patient_id"]),
        "patient_name": r["patient_name"],
        "patient_phone": r["patient_phone"],
        "clinic_id": str(r["clinic_id"]),
        "follow_up_date": r["follow_up_date"].isoformat() if r["follow_up_date"] else None,
        "purpose": r["purpose"],
        "status": r["status"],
        "related_visit_id": str(r["related_visit_id"]) if r["related_visit_id"] else None,
        "notes": r["notes"],
    } for r in rows]}


@followups_router.post("")
async def create_followup(
    body: FollowUpIn,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    fu_id = str(uuid4())
    await db.execute(sql_text("""
        INSERT INTO follow_ups
            (id, patient_id, clinic_id, follow_up_date, purpose,
             related_visit_id, related_appointment_id, notes, created_by, status)
        VALUES (:id, :pid, :cid, :d, :pur, :vid, :aid, :n, :cb, 'scheduled')
    """), {
        "id": fu_id, "pid": str(body.patient_id), "cid": str(body.clinic_id),
        "d": body.follow_up_date, "pur": body.purpose,
        "vid": str(body.related_visit_id) if body.related_visit_id else None,
        "aid": str(body.related_appointment_id) if body.related_appointment_id else None,
        "n": body.notes,
        "cb": str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
    })

    # Send 'followup_scheduled' WhatsApp immediately
    patient = (await db.execute(sql_text("""
        SELECT name, phone FROM patients WHERE id = :pid
    """), {"pid": str(body.patient_id)})).mappings().one_or_none()
    clinic = (await db.execute(sql_text("""
        SELECT name FROM clinics WHERE id = :cid
    """), {"cid": str(body.clinic_id)})).mappings().one_or_none()
    if patient and patient.get("phone"):
        try:
            await send_message(
                db=db, clinic_id=str(body.clinic_id),
                template_key="followup_scheduled",
                recipient_kind="patient",
                recipient_id=str(body.patient_id),
                recipient_phone=patient["phone"],
                recipient_name=patient["name"],
                variables={
                    "patient_name": patient["name"] or "",
                    "clinic_name": (clinic or {}).get("name") or "",
                    "followup_date": body.follow_up_date.strftime("%d %b %Y"),
                    "purpose": body.purpose,
                },
                trigger="event",
            )
        except Exception:
            pass

    return {"id": fu_id, "created": True}


@followups_router.post("/scheduler-tick")
async def followup_scheduler_tick(
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Daily cron: send 3d / 1d / today reminders + recall for missed."""
    summary = {"reminder_3d": 0, "reminder_1d": 0, "today": 0, "recall": 0}
    today = date_type.today()

    # 3-day reminder
    rows_3d = (await db.execute(sql_text("""
        SELECT f.id, f.patient_id, f.clinic_id, f.follow_up_date, f.purpose,
               p.name AS patient_name, p.phone AS patient_phone
        FROM follow_ups f
        LEFT JOIN patients p ON p.id = f.patient_id
        WHERE f.status = 'scheduled'
          AND f.follow_up_date = CURRENT_DATE + INTERVAL '3 days'
          AND NOT EXISTS (
              SELECT 1 FROM message_log ml
              WHERE ml.recipient_id = f.patient_id
                AND ml.template_key = 'followup_reminder_3d'
                AND ml.created_at::date = CURRENT_DATE
          )
    """))).mappings().all()
    for r in rows_3d:
        if r.get("patient_phone"):
            await send_message(
                db=db, clinic_id=str(r["clinic_id"]),
                template_key="followup_reminder_3d",
                recipient_kind="patient", recipient_id=str(r["patient_id"]),
                recipient_phone=r["patient_phone"], recipient_name=r["patient_name"],
                variables={
                    "patient_name": r["patient_name"] or "",
                    "followup_date": r["follow_up_date"].strftime("%d %b"),
                    "purpose": r["purpose"], "clinic_name": "",
                },
                trigger="auto",
            )
            summary["reminder_3d"] += 1

    # 1-day reminder
    rows_1d = (await db.execute(sql_text("""
        SELECT f.id, f.patient_id, f.clinic_id, f.follow_up_date, f.purpose,
               p.name AS patient_name, p.phone AS patient_phone
        FROM follow_ups f
        LEFT JOIN patients p ON p.id = f.patient_id
        WHERE f.status IN ('scheduled','reminded')
          AND f.follow_up_date = CURRENT_DATE + INTERVAL '1 day'
          AND NOT EXISTS (
              SELECT 1 FROM message_log ml
              WHERE ml.recipient_id = f.patient_id
                AND ml.template_key = 'followup_reminder_1d'
                AND ml.created_at::date = CURRENT_DATE
          )
    """))).mappings().all()
    for r in rows_1d:
        if r.get("patient_phone"):
            await send_message(
                db=db, clinic_id=str(r["clinic_id"]),
                template_key="followup_reminder_1d",
                recipient_kind="patient", recipient_id=str(r["patient_id"]),
                recipient_phone=r["patient_phone"], recipient_name=r["patient_name"],
                variables={
                    "patient_name": r["patient_name"] or "",
                    "followup_date": r["follow_up_date"].strftime("%d %b"),
                    "purpose": r["purpose"],
                },
                trigger="auto",
            )
            await db.execute(sql_text("UPDATE follow_ups SET status='reminded' WHERE id=:id"), {"id": str(r["id"])})
            summary["reminder_1d"] += 1

    # Due today
    rows_today = (await db.execute(sql_text("""
        SELECT f.id, f.patient_id, f.clinic_id, f.purpose,
               p.name AS patient_name, p.phone AS patient_phone
        FROM follow_ups f
        LEFT JOIN patients p ON p.id = f.patient_id
        WHERE f.status IN ('scheduled','reminded')
          AND f.follow_up_date = CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM message_log ml
              WHERE ml.recipient_id = f.patient_id
                AND ml.template_key = 'followup_due_today'
                AND ml.created_at::date = CURRENT_DATE
          )
    """))).mappings().all()
    for r in rows_today:
        if r.get("patient_phone"):
            await send_message(
                db=db, clinic_id=str(r["clinic_id"]),
                template_key="followup_due_today",
                recipient_kind="patient", recipient_id=str(r["patient_id"]),
                recipient_phone=r["patient_phone"], recipient_name=r["patient_name"],
                variables={
                    "patient_name": r["patient_name"] or "",
                    "purpose": r["purpose"], "time": "your slot",
                },
                trigger="auto",
            )
            summary["today"] += 1

    # Recall: missed by 7+ days
    rows_recall = (await db.execute(sql_text("""
        SELECT f.id, f.patient_id, f.clinic_id, f.purpose,
               p.name AS patient_name, p.phone AS patient_phone,
               c.phone AS clinic_phone
        FROM follow_ups f
        LEFT JOIN patients p ON p.id = f.patient_id
        LEFT JOIN clinics  c ON c.id = f.clinic_id
        WHERE f.status NOT IN ('completed','cancelled')
          AND f.follow_up_date = CURRENT_DATE - INTERVAL '7 days'
          AND NOT EXISTS (
              SELECT 1 FROM message_log ml
              WHERE ml.recipient_id = f.patient_id
                AND ml.template_key = 'recall_reminder'
                AND ml.created_at::date = CURRENT_DATE
          )
    """))).mappings().all()
    for r in rows_recall:
        if r.get("patient_phone"):
            await send_message(
                db=db, clinic_id=str(r["clinic_id"]),
                template_key="recall_reminder",
                recipient_kind="patient", recipient_id=str(r["patient_id"]),
                recipient_phone=r["patient_phone"], recipient_name=r["patient_name"],
                variables={
                    "patient_name": r["patient_name"] or "",
                    "clinic_phone": r["clinic_phone"] or "",
                },
                trigger="auto",
            )
            await db.execute(sql_text("UPDATE follow_ups SET status='missed' WHERE id=:id"), {"id": str(r["id"])})
            summary["recall"] += 1

    return summary


@followups_router.post("/{fu_id}/complete")
async def complete_followup(fu_id: UUID, db: AsyncSession = Depends(get_db),
                             staff=Depends(get_current_staff)):
    await db.execute(sql_text("""
        UPDATE follow_ups SET status='completed', completed_at=NOW() WHERE id=:id
    """), {"id": str(fu_id)})
    return {"completed": True}


# ═══════════════════════════════════════════════════════════════════════════
# 5) SPECIALIST RATE TIERS — doctor defines per-specialist (Bundle X extended)
# ═══════════════════════════════════════════════════════════════════════════
class TierIn(BaseModel):
    clinic_id: UUID
    specialist_id: UUID
    tier_name: str = Field(..., pattern="^(standard|complex)$")
    treatment_key: Optional[str] = None
    rate_amount: float
    label: Optional[str] = None       # Bundle X — display label (e.g. "RCT — Molar")
    is_active: bool = True


@tiers_router.get("")
async def list_tiers(
    specialist_id: Optional[UUID] = None,
    clinic_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """List active rate tiers. Sorted by usage_count DESC for inline-add dropdown UX."""
    where = ["t.is_active = TRUE"]
    params: Dict[str, Any] = {}
    if specialist_id: where.append("t.specialist_id = :sid"); params["sid"] = str(specialist_id)
    if clinic_id:     where.append("t.clinic_id = :cid");      params["cid"] = str(clinic_id)
    rows = (await db.execute(sql_text(f"""
        SELECT t.*, s.name AS specialist_name
        FROM specialist_rate_tiers t
        LEFT JOIN staff s ON s.id = t.specialist_id
        WHERE {' AND '.join(where)}
        ORDER BY COALESCE(t.usage_count,0) DESC, s.name, t.tier_name, t.treatment_key NULLS FIRST
    """), params)).mappings().all()
    return {"tiers": [{
        "id": str(r["id"]),
        "clinic_id": str(r["clinic_id"]),
        "specialist_id": str(r["specialist_id"]),
        "specialist_name": r["specialist_name"],
        "tier_name": r["tier_name"],
        "treatment_key": r["treatment_key"],
        "rate_amount": float(r["rate_amount"]),
        "label": r.get("label") if hasattr(r, "get") else r["label"] if "label" in r.keys() else None,
        "usage_count": int((r.get("usage_count") if hasattr(r, "get") else r["usage_count"]) or 0) if ("usage_count" in r.keys()) else 0,
        "is_active": r["is_active"],
    } for r in rows]}


@tiers_router.post("")
async def upsert_tier(body: TierIn, db: AsyncSession = Depends(get_db),
                       staff=Depends(get_current_staff)):
    """Create-or-update a rate tier. ON CONFLICT on (specialist_id, tier_name, treatment_key)
       updates the rate (Bundle X: also updates label and bumps usage_count)."""
    tier_id = str(uuid4())
    res = await db.execute(sql_text("""
        INSERT INTO specialist_rate_tiers
            (id, clinic_id, specialist_id, tier_name, treatment_key, rate_amount,
             label, is_active, added_from, usage_count, last_used_at)
        VALUES (:id, :cid, :sid, :tn, :tk, :amt, :lbl, :act, 'inline', 1, NOW())
        ON CONFLICT (specialist_id, tier_name, treatment_key) DO UPDATE SET
            rate_amount = EXCLUDED.rate_amount,
            label       = COALESCE(EXCLUDED.label, specialist_rate_tiers.label),
            is_active   = EXCLUDED.is_active,
            usage_count = COALESCE(specialist_rate_tiers.usage_count,0) + 1,
            last_used_at= NOW()
        RETURNING id
    """), {
        "id": tier_id, "cid": str(body.clinic_id), "sid": str(body.specialist_id),
        "tn": body.tier_name, "tk": body.treatment_key,
        "amt": body.rate_amount, "lbl": body.label, "act": body.is_active,
    })
    saved = res.mappings().first()
    await db.commit()
    return {"saved": True, "id": str(saved["id"]) if saved else tier_id}


@tiers_router.post("/{tier_id}/bump", status_code=200)
async def bump_tier(tier_id: UUID, db: AsyncSession = Depends(get_db),
                     staff=Depends(get_current_staff)):
    """Bump usage_count when a tier is actually used in a referral / earning record."""
    res = await db.execute(sql_text("""
        UPDATE specialist_rate_tiers
           SET usage_count = COALESCE(usage_count,0) + 1, last_used_at = NOW()
         WHERE id = :id
    """), {"id": str(tier_id)})
    await db.commit()
    return {"ok": res.rowcount > 0}


@tiers_router.delete("/{tier_id}")
async def delete_tier(tier_id: UUID, db: AsyncSession = Depends(get_db),
                       staff=Depends(get_current_staff)):
    await db.execute(sql_text("""
        UPDATE specialist_rate_tiers SET is_active=FALSE WHERE id=:id
    """), {"id": str(tier_id)})
    await db.commit()
    return {"deactivated": True}
