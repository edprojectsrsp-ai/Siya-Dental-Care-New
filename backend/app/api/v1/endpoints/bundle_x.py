"""
backend/app/api/v1/endpoints/bundle_x.py — Bundle X Pass 2 + 3

All new endpoints for Bundle X Passes 2 & 3:
  Module Visibility:
    GET   /api/module-visibility?clinic_id=&role=
    POST  /api/module-visibility/bulk  (upsert array)

  Specialist Verify (doctor-only):
    POST  /api/specialist/appointments/{apt_id}/verify

  Call & Confirm workflow:
    POST  /api/hub/call-confirm/{apt_id}   (4 actions)
    POST  /api/hub/specialist-call/{apt_id}
    GET   /api/hub/booking-gates/{patient_id}

  Workshop trackers:
    GET   /api/workshop/specialist-work?clinic_id=
    GET   /api/workshop/lab-orders?clinic_id=
    GET   /api/workshop/lab-payables?clinic_id=
    GET   /api/workshop/specialist-payables?clinic_id=

  Revenue dashboard:
    GET   /api/revenue/full?clinic_id=&days=30

  Archived patients:
    GET   /api/patients/archived?clinic_id=

Mount in main.py:
    from app.api.v1.endpoints.bundle_x import (
        modvis_router, verify_router, callconfirm_router,
        workshop_router, revenue_router, archived_router,
    )
    app.include_router(modvis_router, prefix="/api")
    app.include_router(verify_router, prefix="/api/specialist")
    app.include_router(callconfirm_router, prefix="/api/hub")
    app.include_router(workshop_router, prefix="/api/workshop")
    app.include_router(revenue_router, prefix="/api/revenue")
    app.include_router(archived_router, prefix="/api/patients")
"""
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff


def _require_role(staff, *roles):
    r = staff.get("role") if isinstance(staff, dict) else getattr(staff, "role", None)
    if r not in roles:
        raise HTTPException(403, f"Requires role {'/'.join(roles)}")


def _row(r):
    out = dict(r) if r else {}
    for k, v in out.items():
        if isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out

async def _ensure_reopened_patient_followup(
    db: AsyncSession,
    patient_id: str,
    clinic_id: Optional[str],
):
    if not clinic_id:
        return None
    existing = (await db.execute(sql_text("""
        SELECT id
        FROM appointments
        WHERE patient_id = CAST(:p AS UUID)
          AND clinic_id = CAST(:c AS UUID)
          AND COALESCE(workflow_status, status) NOT IN ('cancelled','rejected','completed','done','payment_pending','no_show')
        ORDER BY created_at DESC
        LIMIT 1
    """), {"p": patient_id, "c": clinic_id})).mappings().first()
    if existing:
        return str(existing["id"])

    doctor_row = (await db.execute(sql_text("""
        SELECT doctor_id
        FROM appointments
        WHERE patient_id = CAST(:p AS UUID)
          AND clinic_id = CAST(:c AS UUID)
          AND doctor_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
    """), {"p": patient_id, "c": clinic_id})).mappings().first()
    created = (await db.execute(sql_text("""
        INSERT INTO appointments (
            patient_id, clinic_id, doctor_id,
            requested_date, requested_time, confirmed_date, confirmed_time,
            scheduled_date, scheduled_time,
            reason, source, status, workflow_status, created_at, updated_at
        )
        VALUES (
            CAST(:p AS UUID), CAST(:c AS UUID), CAST(:d AS UUID),
            NULL, NULL, NULL, NULL, NULL, NULL,
            'Follow-up', 'followup', 'pending', 'pending', NOW(), NOW()
        )
        RETURNING id
    """), {
        "p": patient_id,
        "c": clinic_id,
        "d": str(doctor_row["doctor_id"]) if doctor_row and doctor_row.get("doctor_id") else None,
    })).mappings().one()
    return str(created["id"])


# ═══════════════════════════════════════════════════════════════════════════
# MODULE VISIBILITY
# ═══════════════════════════════════════════════════════════════════════════
modvis_router = APIRouter(prefix="/module-visibility", tags=["Module Visibility"])

KNOWN_MODULES = [
    "dashboard", "appointments", "patients", "queue", "kanban", "billing",
    "medicines", "procedures", "lab", "counters", "specialists", "staff",
    "gallery", "website", "consult", "messages", "bulkwa", "settings",
    "workshop", "archived", "revenue", "mypractice",
]
KNOWN_ROLES = ["doctor", "admin", "receptionist", "specialist"]


@modvis_router.get("")
async def get_module_visibility(
    clinic_id: UUID,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Get module visibility matrix. If role provided, returns only that role's config."""
    where = ["clinic_id = :cid"]
    params: Dict[str, Any] = {"cid": str(clinic_id)}
    if role:
        where.append("role = :r")
        params["r"] = role
    rows = (await db.execute(sql_text(f"""
        SELECT module_key, role, is_visible
        FROM module_visibility
        WHERE {' AND '.join(where)}
        ORDER BY role, module_key
    """), params)).mappings().all()

    # Build matrix: { role: { module_key: bool } }
    matrix: Dict[str, Dict[str, bool]] = {}
    for r in rows:
        matrix.setdefault(r["role"], {})[r["module_key"]] = bool(r["is_visible"])
    return {"matrix": matrix, "modules": KNOWN_MODULES, "roles": KNOWN_ROLES}


class ModVisEntry(BaseModel):
    module_key: str
    role: str
    is_visible: bool

class ModVisBulk(BaseModel):
    clinic_id: UUID
    entries: List[ModVisEntry]


@modvis_router.post("/bulk")
async def update_module_visibility(body: ModVisBulk, db: AsyncSession = Depends(get_db),
                                    staff=Depends(get_current_staff)):
    """Bulk upsert module visibility. Doctor/Admin only."""
    _require_role(staff, "doctor", "admin")
    staff_id = staff.get("staff_id") if isinstance(staff, dict) else str(staff.id) if hasattr(staff, "id") else None
    for e in body.entries:
        if e.module_key not in KNOWN_MODULES:
            continue
        if e.role not in KNOWN_ROLES:
            continue
        await db.execute(sql_text("""
            INSERT INTO module_visibility (clinic_id, module_key, role, is_visible, updated_at, updated_by)
            VALUES (:cid, :mk, :r, :v, NOW(), CAST(:by AS UUID))
            ON CONFLICT (clinic_id, module_key, role) DO UPDATE SET
                is_visible = EXCLUDED.is_visible,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
        """), {
            "cid": str(body.clinic_id), "mk": e.module_key,
            "r": e.role, "v": e.is_visible, "by": staff_id,
        })
    await db.commit()
    return {"ok": True, "count": len(body.entries)}


# ═══════════════════════════════════════════════════════════════════════════
# SPECIALIST VERIFY (doctor closes + generates payable)
# ═══════════════════════════════════════════════════════════════════════════
verify_router = APIRouter(tags=["Specialist Verify"])


class VerifyIn(BaseModel):
    earning_amount: Optional[float] = None
    notes: Optional[str] = None


@verify_router.post("/appointments/{apt_id}/verify")
async def verify_specialist_work(apt_id: UUID, body: VerifyIn,
                                  db: AsyncSession = Depends(get_db),
                                  staff=Depends(get_current_staff)):
    """Doctor-only: verify specialist's completed work → sets session_status='verified',
       records verified_at/by, and auto-creates an earning (payable) for the specialist."""
    _require_role(staff, "doctor", "admin")
    staff_id = staff.get("staff_id") if isinstance(staff, dict) else str(getattr(staff, "id", ""))

    apt = (await db.execute(sql_text("""
        SELECT a.specialist_id, a.patient_id, a.clinic_id,
               a.specialist_session_status, s.name AS specialist_name,
               p.name AS patient_name
        FROM appointments a
        LEFT JOIN staff s ON s.id = a.specialist_id
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.id = :id
    """), {"id": str(apt_id)})).mappings().one_or_none()
    if not apt:
        raise HTTPException(404, "Appointment not found")
    if not apt["specialist_id"]:
        raise HTTPException(400, "No specialist assigned")

    # Mark as verified
    await db.execute(sql_text("""
        UPDATE appointments
           SET specialist_session_status = 'verified',
               specialist_closed_at = COALESCE(specialist_closed_at, NOW())
         WHERE id = :id
    """), {"id": str(apt_id)})

    # Create earning (payable) — default amount from rate tier or body
    earning_amount = body.earning_amount
    if not earning_amount or earning_amount <= 0:
        # Try to find a default rate from specialist_rate_tiers
        tier = (await db.execute(sql_text("""
            SELECT rate_amount FROM specialist_rate_tiers
            WHERE specialist_id = :sid AND is_active = TRUE
            ORDER BY usage_count DESC NULLS LAST LIMIT 1
        """), {"sid": str(apt["specialist_id"])})).mappings().first()
        earning_amount = float(tier["rate_amount"]) if tier else 0

    earning_id = None
    if earning_amount and earning_amount > 0:
        row = (await db.execute(sql_text("""
            INSERT INTO specialist_earnings
                (specialist_id, appointment_id, patient_id, clinic_id,
                 amount, notes, recorded_by, case_status, verified_at, verified_by)
            VALUES (:sp, :ap, :pa, :cl, :am, :nt, :rb, 'verified', NOW(), CAST(:vb AS UUID))
            RETURNING id
        """), {
            "sp": str(apt["specialist_id"]), "ap": str(apt_id),
            "pa": str(apt["patient_id"]), "cl": str(apt["clinic_id"]),
            "am": earning_amount, "nt": body.notes or f"Verified by doctor",
            "rb": staff_id, "vb": staff_id,
        })).mappings().one()
        earning_id = str(row["id"])

    # Log to history. Keep this ASCII-safe because SQL echo logs can run under Windows cp1252 consoles.
    try:
        await db.execute(sql_text("""
            INSERT INTO appointment_history
                (appointment_id, action_type, new_value, changed_by_staff_id, notes)
            VALUES (CAST(:a AS UUID), 'specialist_verified',
                    jsonb_build_object('specialist_name', :sn, 'earning_amount', :ea),
                    CAST(:by AS UUID), :nt)
        """), {
            "a": str(apt_id), "sn": apt["specialist_name"] or "",
            "ea": str(earning_amount or 0), "by": staff_id,
            "nt": f"Doctor verified specialist work. Payable: INR {earning_amount or 0}",
        })
    except Exception:
        pass

    await db.commit()
    persisted = (await db.execute(sql_text("""
        SELECT specialist_session_status
        FROM appointments
        WHERE id = :id
    """), {"id": str(apt_id)})).mappings().one_or_none()
    if not persisted or persisted["specialist_session_status"] != "verified":
        await db.execute(sql_text("""
            UPDATE appointments
               SET specialist_session_status = 'verified',
                   specialist_closed_at = COALESCE(specialist_closed_at, NOW())
             WHERE id = :id
        """), {"id": str(apt_id)})
        await db.commit()

    if earning_amount and earning_amount > 0:
        earning_row = (await db.execute(sql_text("""
            SELECT id
            FROM specialist_earnings
            WHERE appointment_id = :ap
              AND specialist_id = :sp
              AND case_status = 'verified'
            ORDER BY created_at DESC
            LIMIT 1
        """), {"ap": str(apt_id), "sp": str(apt["specialist_id"])})).mappings().one_or_none()
        if not earning_row:
            row = (await db.execute(sql_text("""
                INSERT INTO specialist_earnings
                    (specialist_id, appointment_id, patient_id, clinic_id,
                     amount, notes, recorded_by, case_status, verified_at, verified_by)
                VALUES (:sp, :ap, :pa, :cl, :am, :nt, :rb, 'verified', NOW(), CAST(:vb AS UUID))
                RETURNING id
            """), {
                "sp": str(apt["specialist_id"]), "ap": str(apt_id),
                "pa": str(apt["patient_id"]), "cl": str(apt["clinic_id"]),
                "am": earning_amount, "nt": body.notes or "Verified by doctor",
                "rb": staff_id, "vb": staff_id,
            })).mappings().one()
            earning_id = str(row["id"])
            await db.commit()

    return {
        "ok": True,
        "specialist_session_status": "verified",
        "earning_id": earning_id,
        "earning_amount": earning_amount,
    }


# ═══════════════════════════════════════════════════════════════════════════
# CALL & CONFIRM WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════
callconfirm_router = APIRouter(tags=["Call & Confirm"])


class CallConfirmIn(BaseModel):
    action: str          # 'confirm' | 'refused' | 'no_answer' | 'call_back_later' | 'change_date' | 'change_time'
    new_date: Optional[str] = None
    new_time: Optional[str] = None
    notes: Optional[str] = None


@callconfirm_router.post("/call-confirm/{apt_id}")
async def call_confirm(apt_id: UUID, body: CallConfirmIn,
                        db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    """Nurse's 4-action call & confirm. Sets contact_status and logs to history."""
    allowed = {"confirm", "refused", "no_answer", "call_back_later", "change_date", "change_time"}
    if body.action not in allowed:
        raise HTTPException(400, f"Action must be one of: {', '.join(allowed)}")

    staff_id = staff.get("staff_id") if isinstance(staff, dict) else str(getattr(staff, "id", ""))

    apt = (await db.execute(sql_text(
        "SELECT id, contact_status, requested_date, requested_time, scheduled_date, status "
        "FROM appointments WHERE id = :id"
    ), {"id": str(apt_id)})).mappings().one_or_none()
    if not apt:
        raise HTTPException(404)

    old_status = apt.get("contact_status")

    next_contact_status = "confirmed"
    next_workflow_status = None
    next_status = None
    next_pending_action = None

    if body.action == "confirm":
        next_workflow_status = "confirmed"
        next_status = "confirmed"
        await db.execute(sql_text("""
            UPDATE appointments
               SET contact_status = 'confirmed',
                   pending_action = NULL, pending_action_since = NULL,
                   last_contacted_at = NOW(),
                   last_contacted_by = CAST(:by AS UUID),
                   workflow_status = COALESCE(workflow_status, 'confirmed'),
                   status = CASE WHEN status IN ('scheduled','pending') THEN 'confirmed' ELSE status END
             WHERE id = :id
        """), {"id": str(apt_id), "by": staff_id})

    elif body.action == "refused":
        next_contact_status = "refused"
        next_workflow_status = "cancelled"
        next_status = "cancelled"
        await db.execute(sql_text("""
            UPDATE appointments
               SET contact_status = 'refused',
                   status = 'cancelled',
                   workflow_status = 'cancelled',
                   requested_date = NULL,
                   requested_time = NULL,
                   confirmed_date = NULL,
                   confirmed_time = NULL,
                   scheduled_date = NULL,
                   scheduled_time = NULL,
                   pending_action = NULL, pending_action_since = NULL,
                   last_contacted_at = NOW(),
                   last_contacted_by = CAST(:by AS UUID)
             WHERE id = :id
        """), {"id": str(apt_id), "by": staff_id})

    elif body.action == "no_answer":
        next_contact_status = "no_answer"
        await db.execute(sql_text("""
            UPDATE appointments
               SET contact_status = 'no_answer',
                   pending_action = NULL, pending_action_since = NULL,
                   last_contacted_at = NOW(),
                   last_contacted_by = CAST(:by AS UUID)
             WHERE id = :id
        """), {"id": str(apt_id), "by": staff_id})

    elif body.action == "call_back_later":
        next_contact_status = "call_back_later"
        await db.execute(sql_text("""
            UPDATE appointments
               SET contact_status = 'call_back_later',
                   pending_action = NULL, pending_action_since = NULL,
                   last_contacted_at = NOW(),
                   last_contacted_by = CAST(:by AS UUID)
             WHERE id = :id
        """), {"id": str(apt_id), "by": staff_id})

    elif body.action == "change_date":
        if not body.new_date:
            raise HTTPException(400, "new_date required for change_date action")
        try:
            parsed_date = date.fromisoformat(body.new_date)
        except ValueError:
            raise HTTPException(400, "new_date must use YYYY-MM-DD format")
        next_contact_status = "confirmed"
        next_workflow_status = "confirmed"
        next_status = "confirmed"
        await db.execute(sql_text("""
            UPDATE appointments
               SET contact_status = 'confirmed',
                   requested_date = CAST(:new_date AS DATE),
                   scheduled_date = CAST(:new_date AS DATE),
                   confirmed_date = CAST(:new_date AS DATE),
                   pending_action = NULL,
                   pending_action_since = NULL,
                   status = CASE WHEN status IN ('scheduled','pending','rescheduled') THEN 'confirmed' ELSE status END,
                   workflow_status = CASE WHEN COALESCE(workflow_status,status) IN ('scheduled','pending','rescheduled') THEN 'confirmed' ELSE workflow_status END,
                   last_contacted_at = NOW(),
                   last_contacted_by = CAST(:by AS UUID)
             WHERE id = :id
        """), {"id": str(apt_id), "by": staff_id, "new_date": parsed_date})

    elif body.action == "change_time":
        if not body.new_time:
            raise HTTPException(400, "new_time required for change_time action")
        try:
            parsed_time = datetime.strptime(body.new_time, "%H:%M").time()
        except ValueError:
            try:
                parsed_time = datetime.strptime(body.new_time, "%H:%M:%S").time()
            except ValueError:
                raise HTTPException(400, "new_time must use HH:MM format")
        next_contact_status = "confirmed"
        next_workflow_status = "confirmed"
        next_status = "confirmed"
        await db.execute(sql_text("""
            UPDATE appointments
               SET contact_status = 'confirmed',
                   requested_time = CAST(:new_time AS TIME),
                   scheduled_time = CAST(:new_time AS TIME),
                   confirmed_time = CAST(:new_time AS TIME),
                   pending_action = NULL,
                   pending_action_since = NULL,
                   status = CASE WHEN status IN ('scheduled','pending','rescheduled') THEN 'confirmed' ELSE status END,
                   workflow_status = CASE WHEN COALESCE(workflow_status,status) IN ('scheduled','pending','rescheduled') THEN 'confirmed' ELSE workflow_status END,
                   last_contacted_at = NOW(),
                   last_contacted_by = CAST(:by AS UUID)
             WHERE id = :id
        """), {"id": str(apt_id), "by": staff_id, "new_time": parsed_time})

    # Commit the main status UPDATE first so it's never rolled back by optional inserts failing
    await db.commit()

    # Optional: log to call_logs (non-critical, separate transaction)
    try:
        await db.execute(sql_text("""
            INSERT INTO appointment_call_logs
                (appointment_id, called_by_staff_id, call_status, notes)
            VALUES (CAST(:a AS UUID), CAST(:by AS UUID), :st, :notes)
        """), {
            "a": str(apt_id),
            "by": staff_id,
            "st": next_contact_status,
            "notes": body.notes or body.action,
        })
        await db.commit()
    except Exception:
        await db.rollback()

    # Optional: log to history (non-critical, separate transaction)
    try:
        await db.execute(sql_text("""
            INSERT INTO appointment_history
                (appointment_id, action_type, old_value, new_value, changed_by_staff_id, notes)
            VALUES (CAST(:a AS UUID), :act,
                    jsonb_build_object('contact_status', :old),
                    jsonb_build_object('action', :action, 'new_date', :nd, 'new_time', :nt),
                    CAST(:by AS UUID), :notes)
        """), {
            "a": str(apt_id), "act": f"call_{body.action}",
            "old": old_status or "", "action": body.action,
            "nd": body.new_date or "", "nt": body.new_time or "",
            "by": staff_id, "notes": body.notes or "",
        })
        await db.commit()
    except Exception:
        await db.rollback()
    return {
        "ok": True,
        "action": body.action,
        "contact_status": next_contact_status,
        "pending_action": next_pending_action,
        "workflow_status": next_workflow_status,
        "status": next_status,
    }


@callconfirm_router.post("/apply-pending/{apt_id}")
async def apply_pending_action(apt_id: UUID, body: dict,
                                db: AsyncSession = Depends(get_db),
                                staff=Depends(get_current_staff)):
    """Apply a pending date/time change (clears the blink)."""
    staff_id = staff.get("staff_id") if isinstance(staff, dict) else str(getattr(staff, "id", ""))

    apt = (await db.execute(sql_text(
        "SELECT pending_action, contact_status, requested_date, requested_time, scheduled_date, scheduled_time FROM appointments WHERE id = :id"
    ), {"id": str(apt_id)})).mappings().one_or_none()
    if not apt:
        raise HTTPException(404)
    pending_action = apt["pending_action"]
    if not pending_action and apt.get("contact_status") == "date_change_pending":
        pending_action = "change_date"
    if not pending_action and apt.get("contact_status") == "time_change_pending":
        pending_action = "change_time"
    if not pending_action:
        raise HTTPException(400, "No pending action on this appointment")

    new_date = body.get("new_date")
    new_time = body.get("new_time")
    if pending_action == "change_date" and not new_date:
        raise HTTPException(400, "new_date required to apply a date change")
    if pending_action == "change_time" and not new_time:
        raise HTTPException(400, "new_time required to apply a time change")
    try:
        parsed_date = date.fromisoformat(new_date) if new_date else None
    except ValueError:
        raise HTTPException(400, "new_date must use YYYY-MM-DD format")
    try:
        parsed_time = datetime.strptime(new_time, "%H:%M").time() if new_time else None
    except ValueError:
        try:
            parsed_time = datetime.strptime(new_time, "%H:%M:%S").time() if new_time else None
        except ValueError:
            raise HTTPException(400, "new_time must use HH:MM format")

    sets = ["pending_action = NULL", "pending_action_since = NULL",
            "contact_status = 'confirmed'",
            "last_contacted_at = NOW()",
            "last_contacted_by = CAST(:by AS UUID)",
            "status = CASE WHEN status IN ('scheduled','pending') THEN 'confirmed' ELSE status END",
            "workflow_status = CASE WHEN COALESCE(workflow_status, status) IN ('scheduled','pending') THEN 'confirmed' ELSE workflow_status END"]
    params: dict = {"id": str(apt_id), "by": staff_id}
    if parsed_date:
        sets.append("scheduled_date = :nd")
        sets.append("confirmed_date = :nd")
        params["nd"] = parsed_date
    if parsed_time:
        sets.append("scheduled_time = :nt")
        sets.append("confirmed_time = CAST(:nt AS TIME)")
        params["nt"] = parsed_time

    await db.execute(sql_text(f"UPDATE appointments SET {', '.join(sets)} WHERE id = :id"), params)

    try:
        await db.execute(sql_text("""
            INSERT INTO appointment_history
                (appointment_id, action_type, new_value, changed_by_staff_id, notes)
            VALUES (CAST(:a AS UUID), 'pending_applied',
                    jsonb_build_object('new_date', :nd, 'new_time', :nt),
                    CAST(:by AS UUID), 'Date/time change applied — blink cleared')
        """), {"a": str(apt_id), "nd": new_date or "", "nt": new_time or "", "by": staff_id})
    except Exception:
        pass

    await db.commit()
    return {"ok": True}


@callconfirm_router.post("/specialist-call/{apt_id}")
async def specialist_call_confirm(apt_id: UUID, body: dict,
                                   db: AsyncSession = Depends(get_db),
                                   staff=Depends(get_current_staff)):
    """Nurse calls specialist, marks confirmed or declined."""
    action = body.get("action")  # 'confirmed' | 'declined'
    if action not in ("confirmed", "declined"):
        raise HTTPException(400, "action must be 'confirmed' or 'declined'")

    staff_id = staff.get("staff_id") if isinstance(staff, dict) else str(getattr(staff, "id", ""))

    await db.execute(sql_text("""
        UPDATE appointments
           SET specialist_confirmation_status = :st,
               specialist_called_at = NOW(),
               specialist_called_by = CAST(:by AS UUID)
         WHERE id = :id
    """), {"id": str(apt_id), "st": action, "by": staff_id})

    try:
        await db.execute(sql_text("""
            INSERT INTO appointment_history
                (appointment_id, action_type, new_value, changed_by_staff_id, notes)
            VALUES (CAST(:a AS UUID), :act,
                    jsonb_build_object('specialist_confirmation', :st),
                    CAST(:by AS UUID), :nt)
        """), {
            "a": str(apt_id), "act": f"specialist_{action}",
            "st": action, "by": staff_id,
            "nt": body.get("notes") or f"Specialist {action} by nurse call",
        })
    except Exception:
        pass

    await db.commit()
    return {"ok": True, "specialist_confirmation_status": action}


@callconfirm_router.get("/booking-gates/{patient_id}")
async def get_booking_gates(patient_id: UUID, db: AsyncSession = Depends(get_db),
                             staff=Depends(get_current_staff)):
    """Returns blockers that must be cleared before finalizing an appointment."""
    try:
        row = (await db.execute(sql_text("""
            SELECT * FROM patient_booking_constraints_v WHERE patient_id = :pid
        """), {"pid": str(patient_id)})).mappings().first()
    except Exception:
        row = None

    if not row:
        return {"gates": [], "can_finalize": True}

    gates = []
    if int(row.get("pending_lab_orders") or 0) > 0:
        gates.append({"type": "lab", "message": f"{row['pending_lab_orders']} lab order(s) still pending/sent",
                       "severity": "block"})
    if int(row.get("specialist_pending_confirmation") or 0) > 0:
        gates.append({"type": "specialist", "message": f"{row['specialist_pending_confirmation']} specialist referral(s) awaiting nurse confirmation call",
                       "severity": "block"})
    if int(row.get("lab_overdue") or 0) > 0:
        gates.append({"type": "lab_overdue", "message": f"{row['lab_overdue']} lab order(s) overdue",
                       "severity": "warn"})
    if float(row.get("outstanding_balance") or 0) > 5000:
        gates.append({"type": "balance", "message": f"Outstanding balance ₹{float(row['outstanding_balance']):,.0f}",
                       "severity": "warn"})

    return {
        "gates": gates,
        "can_finalize": not any(g["severity"] == "block" for g in gates),
        "raw": _row(row),
    }


# ═══════════════════════════════════════════════════════════════════════════
# WORKSHOP TRACKERS
# ═══════════════════════════════════════════════════════════════════════════
workshop_router = APIRouter(tags=["Workshop Trackers"])


@workshop_router.get("/specialist-work")
async def workshop_specialist_work(clinic_id: Optional[UUID] = None,
                                    status: Optional[str] = None,
                                    limit: int = Query(100, le=500),
                                    db: AsyncSession = Depends(get_db),
                                    staff=Depends(get_current_staff)):
    where = ["a.specialist_id IS NOT NULL", "a.status NOT IN ('cancelled')"]
    params: dict = {"lim": limit}
    if clinic_id:
        where.append("a.clinic_id = :cid")
        params["cid"] = str(clinic_id)
    if status:
        where.append("a.specialist_session_status = :st")
        params["st"] = status
    rows = (await db.execute(sql_text(f"""
        SELECT a.id AS appointment_id, a.patient_id, p.name AS patient_name,
               a.specialist_id, sp.name AS specialist_name, sp.specialization,
               a.specialist_session_status, a.specialist_confirmation_status,
               a.specialist_assigned_at, a.specialist_closed_at, a.specialist_notes,
               a.scheduled_date, a.clinic_id, a.workflow_status
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN staff sp ON sp.id = a.specialist_id
        WHERE {' AND '.join(where)}
        ORDER BY
            CASE a.specialist_session_status
                WHEN 'pending' THEN 1 WHEN 'done' THEN 2 WHEN 'closed' THEN 3 WHEN 'verified' THEN 4
                ELSE 5
            END,
            a.specialist_assigned_at DESC
        LIMIT :lim
    """), params)).mappings().all()
    return [_row(r) for r in rows]


@workshop_router.get("/lab-orders")
async def workshop_lab_orders(clinic_id: Optional[UUID] = None,
                               status: Optional[str] = None,
                               limit: int = Query(100, le=500),
                               db: AsyncSession = Depends(get_db),
                               staff=Depends(get_current_staff)):
    where: list = []
    params: dict = {"lim": limit}
    if clinic_id:
        where.append("lo.clinic_id = :cid")
        params["cid"] = str(clinic_id)
    if status:
        where.append("lo.status = :st")
        params["st"] = status
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    rows = (await db.execute(sql_text(f"""
        SELECT lo.id, lo.serial_no, lo.clinic_id, lo.patient_id, p.name AS patient_name,
               lo.vendor_id, v.name AS vendor_name, v.phone AS vendor_phone,
               lo.work_type, lo.teeth, lo.shade, lo.status, lo.cost,
               lo.sent_date, lo.expected_date, lo.received_date,
               lo.notes, lo.created_at,
               (SELECT COALESCE(SUM(amount),0) FROM lab_order_payments WHERE lab_order_id=lo.id) AS paid
        FROM lab_orders lo
        LEFT JOIN patients p ON p.id = lo.patient_id
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        {where_sql}
        ORDER BY CASE lo.status
            WHEN 'pending' THEN 1 WHEN 'sent' THEN 2 WHEN 'received' THEN 3
            WHEN 'fitted' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END,
            lo.created_at DESC
        LIMIT :lim
    """), params)).mappings().all()
    return [_row(r) | {"cost": float(r["cost"] or 0), "paid": float(r["paid"] or 0)} for r in rows]


@workshop_router.get("/lab-payables")
async def workshop_lab_payables(clinic_id: Optional[UUID] = None,
                                 db: AsyncSession = Depends(get_db),
                                 staff=Depends(get_current_staff)):
    where = []
    params: dict = {}
    if clinic_id:
        where.append("clinic_id = :cid")
        params["cid"] = str(clinic_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    try:
        rows = (await db.execute(sql_text(f"""
            SELECT * FROM v_lab_payables {where_sql}
            ORDER BY outstanding DESC
        """), params)).mappings().all()
    except Exception:
        rows = []
    return [_row(r) | {
        "order_cost": float(r.get("order_cost") or 0),
        "paid_amount": float(r.get("paid_amount") or 0),
        "outstanding": float(r.get("outstanding") or 0),
    } for r in rows]


@workshop_router.get("/specialist-payables")
async def workshop_specialist_payables(clinic_id: Optional[UUID] = None,
                                        db: AsyncSession = Depends(get_db),
                                        staff=Depends(get_current_staff)):
    where = []
    params: dict = {}
    if clinic_id:
        where.append("clinic_id = :cid")
        params["cid"] = str(clinic_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    try:
        rows = (await db.execute(sql_text(f"""
            SELECT * FROM v_specialist_payables {where_sql}
            ORDER BY outstanding DESC
        """), params)).mappings().all()
    except Exception:
        rows = []
    return [_row(r) | {
        "earning_amount": float(r.get("earning_amount") or 0),
        "settled_amount": float(r.get("settled_amount") or 0),
        "outstanding": float(r.get("outstanding") or 0),
    } for r in rows]


# ═══════════════════════════════════════════════════════════════════════════
# REVENUE DASHBOARD (30-day stacked)
# ═══════════════════════════════════════════════════════════════════════════
revenue_router = APIRouter(tags=["Revenue Dashboard"])


@revenue_router.get("/full")
async def revenue_full(clinic_id: UUID, days: int = Query(30, le=90),
                        db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    """30-day revenue: treatment payments, specialist outstanding, lab outstanding, net."""
    cid = str(clinic_id)

    # Daily treatment payments (last N days)
    daily = (await db.execute(sql_text("""
        SELECT d::date AS day,
               COALESCE(SUM(pt.amount), 0) AS collected
        FROM generate_series(CURRENT_DATE - :days * INTERVAL '1 day', CURRENT_DATE, '1 day') d
        LEFT JOIN payment_transactions pt
            ON pt.date = d::date AND pt.clinic_id = :cid
        GROUP BY d::date ORDER BY d::date
    """), {"cid": cid, "days": days})).mappings().all()

    # Specialist outstanding total
    spec_out = 0
    try:
        r = (await db.execute(sql_text("""
            SELECT COALESCE(SUM(outstanding), 0) AS total FROM v_specialist_payables
            WHERE clinic_id = :cid
        """), {"cid": cid})).mappings().first()
        spec_out = float(r["total"]) if r else 0
    except Exception:
        pass

    # Lab outstanding total
    lab_out = 0
    try:
        r = (await db.execute(sql_text("""
            SELECT COALESCE(SUM(outstanding), 0) AS total FROM v_lab_payables
            WHERE clinic_id = :cid
        """), {"cid": cid})).mappings().first()
        lab_out = float(r["total"]) if r else 0
    except Exception:
        pass

    # Treatment plan totals
    plan_stats = (await db.execute(sql_text("""
        SELECT COALESCE(SUM(final_payable), 0) AS total_planned,
               COALESCE(SUM(total_paid), 0) AS total_collected,
               COALESCE(SUM(final_payable), 0) - COALESCE(SUM(total_paid), 0) AS patient_outstanding
        FROM treatment_plans WHERE clinic_id = :cid
            AND status NOT IN ('cancelled')
    """), {"cid": cid})).mappings().first()

    return {
        "daily": [{"day": str(r["day"]), "collected": float(r["collected"])} for r in daily],
        "specialist_outstanding": spec_out,
        "lab_outstanding": lab_out,
        "patient_outstanding": float(plan_stats["patient_outstanding"]) if plan_stats else 0,
        "total_collected": float(plan_stats["total_collected"]) if plan_stats else 0,
        "total_planned": float(plan_stats["total_planned"]) if plan_stats else 0,
        "net_position": float(plan_stats["total_collected"] or 0) - spec_out - lab_out if plan_stats else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════
# ARCHIVED PATIENTS
# ═══════════════════════════════════════════════════════════════════════════
archived_router = APIRouter(tags=["Archived Patients"])


@archived_router.get("/archived")
async def list_archived_patients(clinic_id: Optional[UUID] = None,
                                  q: Optional[str] = None,
                                  limit: int = Query(50, le=200),
                                  db: AsyncSession = Depends(get_db),
                                  staff=Depends(get_current_staff)):
    """Patients whose ALL treatment plans are completed/closed AND fully paid."""
    where = ["""
        NOT EXISTS (
            SELECT 1 FROM treatment_plans tp
            WHERE tp.patient_id = p.id
              AND tp.status NOT IN ('completed','closed','archived','cancelled')
        )
    """, """
        NOT EXISTS (
            SELECT 1 FROM treatment_plans tp
            WHERE tp.patient_id = p.id
              AND tp.status IN ('completed','closed','archived')
              AND (tp.final_payable - COALESCE(tp.total_paid,0)) > 1
        )
    """, """
        EXISTS (
            SELECT 1 FROM treatment_plans tp
            WHERE tp.patient_id = p.id
              AND tp.status IN ('completed','closed','archived')
        )
    """]
    params: dict = {"lim": limit}
    if clinic_id:
        where.append("p.preferred_clinic_id = :cid")
        params["cid"] = str(clinic_id)
    if q:
        where.append("(LOWER(p.name) LIKE :qq OR p.phone LIKE :qq)")
        params["qq"] = f"%{q.lower()}%"

    rows = (await db.execute(sql_text(f"""
        SELECT p.id, p.name, p.phone, p.gender, p.age,
               (SELECT MAX(tp.updated_at) FROM treatment_plans tp WHERE tp.patient_id = p.id) AS last_plan_date,
               (SELECT COUNT(*) FROM treatment_plans tp WHERE tp.patient_id = p.id
                    AND tp.status IN ('completed','closed','archived')) AS completed_plans,
               (SELECT COALESCE(SUM(tp.total_paid),0) FROM treatment_plans tp WHERE tp.patient_id = p.id) AS total_paid
        FROM patients p
        WHERE {' AND '.join(where)}
        ORDER BY last_plan_date DESC NULLS LAST
        LIMIT :lim
    """), params)).mappings().all()
    return [_row(r) | {"total_paid": float(r.get("total_paid") or 0)} for r in rows]


@archived_router.post("/archived/{patient_id}/reopen")
async def reopen_archived_patient(patient_id: UUID,
                                  clinic_id: Optional[UUID] = None,
                                  db: AsyncSession = Depends(get_db),
                                  staff=Depends(get_current_staff)):
    patient = (await db.execute(sql_text("""
        SELECT id, COALESCE(preferred_clinic_id, clinic_id) AS clinic_id
        FROM patients
        WHERE id = :p
    """), {"p": str(patient_id)})).mappings().one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")

    target_clinic_id = str(clinic_id or patient.get("clinic_id")) if (clinic_id or patient.get("clinic_id")) else None

    plan = (await db.execute(sql_text("""
        SELECT id
        FROM treatment_plans
        WHERE patient_id = :p
          AND (is_archived = TRUE OR COALESCE(status, '') IN ('completed','closed','archived','cancelled'))
        ORDER BY COALESCE(archived_at, updated_at, created_at) DESC
        LIMIT 1
    """), {"p": str(patient_id)})).mappings().one_or_none()
    if not plan:
        raise HTTPException(404, "No archived treatment plan found")

    await db.execute(sql_text("""
        UPDATE treatment_plans
        SET is_archived = FALSE,
            archived_at = NULL,
            updated_at = NOW(),
            status = CASE
                WHEN COALESCE(status, '') IN ('completed','closed','archived','cancelled')
                    THEN 'treatment_advised'
                ELSE status
            END
        WHERE id = :id
    """), {"id": str(plan["id"])})
    await db.execute(sql_text("""
        UPDATE patients
        SET is_active = TRUE,
            updated_at = NOW()
        WHERE id = :p
    """), {"p": str(patient_id)})

    appointment_id = await _ensure_reopened_patient_followup(db, str(patient_id), target_clinic_id)
    return {
        "ok": True,
        "patient_id": str(patient_id),
        "appointment_id": appointment_id,
    }
