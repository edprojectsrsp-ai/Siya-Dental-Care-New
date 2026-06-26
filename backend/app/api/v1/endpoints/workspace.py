"""Treatment Workspace v3 — /api/ws/*
Master-spec engine: Treatment Plan is the master; everything derives from it.
Auto: revision history, tooth-chart sync, work-step suggestions, prescription
suggestions, financials, visit creation on close. Doctor never makes sessions.
"""
from datetime import datetime, date as date_type
from typing import Optional, List
from uuid import UUID
import json
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text
from app.core.database import get_db
from app.core.security import get_current_staff

router = APIRouter(prefix="/ws", tags=["Treatment Workspace"])

def _parse_time_input(value: Optional[str], default: Optional[str] = None):
    raw = value or default
    if not raw:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            pass
    raise HTTPException(400, "Invalid time format. Use HH:MM or HH:MM:SS")

async def _record_clinical_link(db: AsyncSession, link_type: str, source: str, target: str, clinic_id: Optional[str] = None):
    """Increment co-occurrence score — powers continual learning suggestions."""
    src, tgt = source.strip(), target.strip()
    if not src or not tgt:
        return
    cid = clinic_id or None
    await db.execute(sql_text("""
        INSERT INTO clinical_link_scores (link_type, source_key, target_key, clinic_id, score)
        VALUES (:lt, :src, :tgt, :cid, 1)
        ON CONFLICT (link_type, source_key, target_key, clinic_id)
        DO UPDATE SET score = clinical_link_scores.score + 1, updated_at = NOW()
    """), {"lt": link_type, "src": src, "tgt": tgt, "cid": cid})

# ─────────────────────────── Schemas ───────────────────────────
class PlanItemIn(BaseModel):
    treatment_name: str
    procedure_id: Optional[UUID] = None
    teeth: List[int] = Field(default_factory=list)
    area_label: Optional[str] = None            # 'Full Mouth' etc.
    suggested_rate: float = 0
    doctor_rate: float = 0
    discount: float = 0
    notes: Optional[str] = None
    clinic_id: UUID
    examination_summary: Optional[str] = None
    diagnosis: Optional[str] = None
class PlanItemPatch(BaseModel):
    treatment_name: Optional[str] = None
    teeth: Optional[List[int]] = None
    area_label: Optional[str] = None
    suggested_rate: Optional[float] = None
    doctor_rate: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    examination_summary: Optional[str] = None
    diagnosis: Optional[str] = None
class CustomTreatmentIn(BaseModel):
    name: str; default_cost: float = 0; is_tooth_based: bool = False
class WorkStepIn(BaseModel):
    step: str
class ToothConditionIn(BaseModel):
    tooth_number: int; condition: str; notes: Optional[str] = None
class ToothExamIn(BaseModel):
    tooth_number: int; finding: str; notes: Optional[str] = None
class ToothDiagIn(BaseModel):
    tooth_number: int; diagnosis: str; notes: Optional[str] = None
    linked_exams: List[str] = Field(default_factory=list)
class ClinicalLinkIn(BaseModel):
    link_type: str
    source: str
    target: str
class NotesIn(BaseModel):
    notes: Optional[str] = ""
class ComplaintsIn(BaseModel):
    chief_complaints: List[str] = Field(default_factory=list)
class DraftIn(BaseModel):
    data: dict = Field(default_factory=dict)
class WorkDone(BaseModel):
    item_id: Optional[UUID] = None
    treatment: str
    teeth: List[int] = Field(default_factory=list)
    step: str
    item_completed: bool = False
class CloseVisitIn(BaseModel):
    patient_id: UUID; clinic_id: UUID
    appointment_id: Optional[UUID] = None
    session_id: Optional[UUID] = None            # from queue Start Treatment — reused, no duplicate visit
    plan_id: Optional[UUID] = None
    todays_work: List[WorkDone] = Field(default_factory=list)
    complaint: Optional[str] = None
    medicines: List[dict] = Field(default_factory=list)
    advice: Optional[str] = None
    internal_notes: Optional[str] = None
    treatment_notes: Optional[str] = None
    amount_to_collect: float = 0
    adjustment_amount: float = 0
    adjustment_reason: Optional[str] = None
    followup_date: Optional[date_type] = None
    followup_time: Optional[str] = None
    next_visit_instructions: Optional[str] = None
    chairside_notes: Optional[str] = None
    close_treatment: bool = False                # True → archive case

# ─────────────────────────── Helpers ───────────────────────────
async def _active_plan(db, patient_id: str, clinic_id: str, doctor_id: str, create: bool = False):
    row = (await db.execute(sql_text("""SELECT id FROM treatment_plans WHERE patient_id=:p AND is_archived=FALSE
        AND status NOT IN ('closed','cancelled') ORDER BY created_at DESC LIMIT 1"""), {"p": patient_id})).mappings().one_or_none()
    if row: return str(row["id"])
    if not create: return None
    new = (await db.execute(sql_text("""INSERT INTO treatment_plans (patient_id,clinic_id,doctor_id,name,status)
        VALUES(:p,:c,:d,:n,'treatment_advised') RETURNING id"""),
        {"p": patient_id, "c": clinic_id, "d": doctor_id,
         "n": f"Treatment Plan — {date_type.today().strftime('%d %b %Y')}"})).mappings().one()
    return str(new["id"])

async def _log_revision(db, plan_id: str, summary: str, snapshot: dict, staff_id: str):
    await db.execute(sql_text("""INSERT INTO plan_revisions (plan_id,revision_number,change_summary,item_snapshot,created_by)
        VALUES(:pl,(SELECT COALESCE(MAX(revision_number),0)+1 FROM plan_revisions WHERE plan_id=:pl),:s,CAST(:sn AS JSONB),:by)"""),
        {"pl": plan_id, "s": summary, "sn": json.dumps(snapshot, default=str), "by": staff_id})

async def _recalc_plan(db, plan_id: str):
    await db.execute(sql_text("""UPDATE treatment_plans SET
        estimated_cost=(SELECT COALESCE(SUM(final_amount),0) FROM treatment_plan_items WHERE plan_id=:pl AND status!='cancelled'),
        final_payable=(SELECT COALESCE(SUM(final_amount),0) FROM treatment_plan_items WHERE plan_id=:pl AND status!='cancelled'),
        updated_at=NOW() WHERE id=:pl"""), {"pl": plan_id})

def _classify_treatment_kind(name: str) -> str:
    """Best-effort tag for the visual tooth chart marker."""
    normalized = (name or "").lower()
    if "extract" in normalized: return "extraction"
    if "implant" in normalized: return "implant"
    if "crown" in normalized or "cap" in normalized: return "crown"
    if "rct" in normalized or "root canal" in normalized: return "rct"
    if "bridge" in normalized: return "bridge"
    if "fill" in normalized or "composite" in normalized or "gic" in normalized or "restorat" in normalized: return "filling"
    if "scaling" in normalized or "clean" in normalized: return "scaling"
    if "veneer" in normalized: return "veneer"
    if "cavity" in normalized or "carie" in normalized: return "cavity"
    if "missing" in normalized: return "missing"
    return "other"

def _map_tooth_tx_status(plan_status: str) -> str:
    """Keep tooth chart status aligned with treatment plan item status."""
    if plan_status == "completed":
        return "completed"
    if plan_status == "in_progress":
        return "in_progress"
    return "planned"

async def _sync_teeth(db: AsyncSession, item_id: str, patient_id: str, plan_id: str, treatment: str, teeth: List[int], plan_status: str = "advised"):
    """Treatment Plan → Tooth Chart, no duplicate entry (spec auto-synchronization)."""
    await db.execute(sql_text("DELETE FROM tooth_treatments WHERE plan_item_id=:i"), {"i": item_id})
    kind = _classify_treatment_kind(treatment)
    tx_status = _map_tooth_tx_status(plan_status)
    for tn in teeth:
        if 11 <= tn <= 85:
            await db.execute(sql_text("""INSERT INTO tooth_treatments (patient_id,tooth_number,treatment_plan_id,plan_item_id,treatment_type,treatment_kind,status)
                VALUES(:p,:t,:pl,:i,:tx,:tk,:st)"""), {"p": patient_id, "t": tn, "pl": plan_id, "i": item_id, "tx": treatment[:50], "tk": kind, "st": tx_status})

def _teeth_label(teeth: List[int], area: Optional[str]) -> str:
    if area: return area
    return ",".join(str(t) for t in teeth) if teeth else "—"

def _item_dict(r) -> dict:
    return {"id": str(r["id"]), "treatment_name": r["procedure_name"], "procedure_id": str(r["procedure_catalog_id"]) if r["procedure_catalog_id"] else None,
            "teeth": r["teeth"] or [], "area_label": r["area_label"],
            "suggested_rate": float(r["suggested_rate"] or 0), "doctor_rate": float(r["doctor_rate"] or 0),
            "discount": float(r["discount"] or 0), "final_amount": float(r["final_amount"] or 0),
            "notes": r["notes"], "status": r["status"], "completed_steps": r["completed_steps"] or [],
            "work_steps": r.get("work_steps") or [], "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "requires_lab": bool(r.get("requires_lab")) if r.get("requires_lab") is not None else False,
            "requires_specialist": bool(r.get("requires_specialist")) if r.get("requires_specialist") is not None else False,
            "lab_status": r.get("lab_status"),
            "lab_order_id": str(r["lab_order_id"]) if r.get("lab_order_id") else None,
            "examination_summary": r.get("examination_summary") or None,
            "diagnosis": r.get("diagnosis") or None}

# ════════════════════════ FULL WORKSPACE ═══════════════════════
@router.get("/{patient_id}/full")
async def workspace_full(patient_id: UUID, clinic_id: UUID, apt_id: Optional[UUID] = None,
                         db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    pid = str(patient_id)
    p = (await db.execute(sql_text("""SELECT id,name,age,gender,phone,existing_illnesses,chairside_notes,total_visits,created_at
        FROM patients WHERE id=:p"""), {"p": pid})).mappings().one_or_none()
    if not p: raise HTTPException(404, "Patient not found")

    apt = None
    if apt_id:
        apt = (await db.execute(sql_text("""SELECT id, chief_complaints, appointment_type, reason, source,
            COALESCE(workflow_status,status) AS ws, contact_status,
            requested_date, requested_time, confirmed_date, confirmed_time,
            specialist_id, specialist_confirmation_status, specialist_session_status,
            specialist_assigned_at, specialist_closed_at, specialist_notes,
            pending_action, pending_action_since
            FROM appointments WHERE id=:a"""), {"a": str(apt_id)})).mappings().one_or_none()
    patient_type = ("emergency" if apt and apt["source"] == "emergency" else
                    "walkin" if apt and apt["source"] == "walkin" else
                    "new" if (p["total_visits"] or 0) <= 0 else "followup")

    plan_id = await _active_plan(db, pid, str(clinic_id), str(staff["staff_id"]), create=False)
    items, revisions, plan = [], [], None
    if plan_id:
        plan_row = (await db.execute(sql_text("SELECT id,name,status,estimated_cost,created_at FROM treatment_plans WHERE id=:pl"), {"pl": plan_id})).mappings().one()
        plan = {"id": plan_id, "name": plan_row["name"], "status": plan_row["status"],
                "total_value": float(plan_row["estimated_cost"] or 0), "created_at": plan_row["created_at"].isoformat()}
        rows = (await db.execute(sql_text("""SELECT i.*, pc.work_steps FROM treatment_plan_items i
            LEFT JOIN procedure_catalog pc ON pc.id=i.procedure_catalog_id
            WHERE i.plan_id=:pl AND i.status!='cancelled' ORDER BY i.created_at"""), {"pl": plan_id})).mappings().all()
        items = [_item_dict(r) for r in rows]
        revs = (await db.execute(sql_text("""SELECT revision_number,change_summary,created_at FROM plan_revisions
            WHERE plan_id=:pl ORDER BY revision_number DESC LIMIT 30"""), {"pl": plan_id})).mappings().all()
        revisions = [{"n": r["revision_number"], "summary": r["change_summary"], "at": r["created_at"].isoformat()} for r in revs]

    # Financials: Total Value · Paid Till Date · Today Added · Outstanding
    total_value = sum(i["final_amount"] for i in items)
    paid = float((await db.execute(sql_text("SELECT COALESCE(SUM(amount),0) AS t FROM payment_transactions WHERE patient_id=:p"), {"p": pid})).mappings().one()["t"])
    today_added = sum(i["final_amount"] for i in items if i["created_at"] and i["created_at"][:10] == date_type.today().isoformat())
    ledger_rows = (await db.execute(sql_text("""SELECT date,amount,payment_mode,razorpay_payment_id,created_at FROM payment_transactions
        WHERE patient_id=:p ORDER BY created_at DESC LIMIT 25"""), {"p": pid})).mappings().all()
    running = paid
    ledger = []
    for r in ledger_rows:
        ledger.append({"date": r["date"].isoformat() if r["date"] else None, "amount": float(r["amount"]),
                       "mode": r["payment_mode"], "ref": r["razorpay_payment_id"],
                       "balance_after": max(total_value - running, 0)})
        running -= float(r["amount"])

    # Visits (auto-created sessions) + prescriptions timeline
    visits = (await db.execute(sql_text("""SELECT id,started_at,finalized_at,procedures_done,treatment_notes,next_step,
        amount_payable,amount_collected,discount_amount,discount_reason FROM treatment_sessions
        WHERE patient_id=:p AND finalized_at IS NOT NULL ORDER BY finalized_at DESC LIMIT 50"""), {"p": pid})).mappings().all()
    rx_rows = (await db.execute(sql_text("""SELECT id,serial_number,complaint,diagnosis,medicines,visible_advice,followup_date,pdf_url,created_at
        FROM prescriptions WHERE patient_id=:p ORDER BY created_at"""), {"p": pid})).mappings().all()
    prescriptions = [{"id": str(r["id"]), "serial": r["serial_number"], "complaint": r["complaint"], "diagnosis": r["diagnosis"],
                      "medicines": r["medicines"] or [], "advice": r["visible_advice"], "followup_date": r["followup_date"].isoformat() if r["followup_date"] else None,
                      "pdf_url": r["pdf_url"], "date": r["created_at"].isoformat()} for r in rx_rows]

    last_visit = None
    if visits:
        v = visits[0]
        last_visit = {"date": v["finalized_at"].isoformat(), "notes": v["treatment_notes"],
                      "work": v["procedures_done"] or [], "collected": float(v["amount_collected"] or 0),
                      "rx_summary": ", ".join(m.get("name", "") for m in (prescriptions[-1]["medicines"] if prescriptions else []))[:120]}

    # Tooth chart state (auto-synced + manual conditions)
    tt = (await db.execute(sql_text("""SELECT tooth_number,treatment_type,treatment_kind,status,plan_item_id FROM tooth_treatments
        WHERE patient_id=:p ORDER BY planned_at"""), {"p": pid})).mappings().all()
    tc = (await db.execute(sql_text("""SELECT id,tooth_number,condition,notes,recorded_at FROM tooth_conditions
        WHERE patient_id=:p AND is_active=TRUE ORDER BY recorded_at"""), {"p": pid})).mappings().all()

    # Clinical examination + diagnosis per tooth
    tex = (await db.execute(sql_text("""SELECT id,tooth_number,finding,notes,recorded_at FROM tooth_examinations
        WHERE patient_id=:p AND is_active=TRUE ORDER BY recorded_at"""), {"p": pid})).mappings().all()
    tdx = (await db.execute(sql_text("""SELECT id,tooth_number,diagnosis,notes,recorded_at FROM tooth_diagnoses
        WHERE patient_id=:p AND is_active=TRUE ORDER BY recorded_at"""), {"p": pid})).mappings().all()

    draft = (await db.execute(sql_text("SELECT data FROM workspace_drafts WHERE patient_id=:p"), {"p": pid})).mappings().one_or_none()

    specialist_cases_rows = (await db.execute(sql_text("""
        SELECT a.id AS appointment_id, a.patient_id, a.specialist_id,
               sp.name AS specialist_name, sp.specialization, sp.phone AS specialist_phone, sp.whatsapp_number AS specialist_whatsapp,
               a.specialist_confirmation_status, a.specialist_session_status,
               a.specialist_assigned_at, a.specialist_closed_at, a.specialist_notes,
               COALESCE(a.confirmed_date, a.requested_date) AS scheduled_date,
               COALESCE(a.confirmed_time, a.requested_time) AS scheduled_time
        FROM appointments a
        LEFT JOIN staff sp ON sp.id = a.specialist_id
        WHERE a.patient_id = :p
          AND a.specialist_id IS NOT NULL
          AND COALESCE(a.workflow_status, a.status) NOT IN ('cancelled', 'rejected')
        ORDER BY a.specialist_assigned_at DESC NULLS LAST, a.created_at DESC
        LIMIT 20
    """), {"p": pid})).mappings().all()

    lab_orders_rows = (await db.execute(sql_text("""
        SELECT lo.id, lo.serial_no, lo.appointment_id, lo.treatment_plan_item_id,
               lo.vendor_id, v.name AS vendor_name, v.phone AS vendor_phone, v.whatsapp_number AS vendor_whatsapp,
               lo.work_type, lo.teeth, lo.shade, lo.status, lo.cost,
               lo.sent_date, lo.expected_date, lo.received_date,
               lo.notes, lo.created_at,
               tpi.procedure_name AS linked_treatment_name,
               tpi.teeth AS linked_treatment_teeth,
               (SELECT COALESCE(SUM(amount),0) FROM lab_order_payments WHERE lab_order_id=lo.id) AS paid_amount
        FROM lab_orders lo
        LEFT JOIN lab_vendors v ON v.id = lo.vendor_id
        LEFT JOIN treatment_plan_items tpi ON tpi.id = lo.treatment_plan_item_id
        WHERE lo.patient_id = :p
          AND lo.status <> 'cancelled'
        ORDER BY lo.created_at DESC
        LIMIT 20
    """), {"p": pid})).mappings().all()

    history_rows = []
    if apt_id:
        try:
            history_rows = (await db.execute(sql_text("""
                SELECT id, action_type, old_value, new_value, notes, changed_at
                FROM appointment_history
                WHERE appointment_id = :a
                ORDER BY changed_at DESC
                LIMIT 30
            """), {"a": str(apt_id)})).mappings().all()
        except Exception:
            history_rows = []

    no_answer_count = 0
    if apt_id:
        try:
            no_answer_count = int((await db.execute(sql_text("""
                SELECT COUNT(*) AS c
                FROM appointment_call_logs
                WHERE appointment_id = :a
                  AND call_status IN ('no_answer', 'call_back_later')
            """), {"a": str(apt_id)})).mappings().one()["c"] or 0)
        except Exception:
            no_answer_count = 0

    try:
        spec_due_row = (await db.execute(sql_text("""
            SELECT COALESCE(SUM(outstanding),0) AS total
            FROM v_specialist_payables
            WHERE patient_id = :p
        """), {"p": pid})).mappings().first()
    except Exception:
        spec_due_row = None
    try:
        lab_due_row = (await db.execute(sql_text("""
            SELECT COALESCE(SUM(outstanding),0) AS total
            FROM v_lab_payables
            WHERE patient_id = :p
        """), {"p": pid})).mappings().first()
    except Exception:
        lab_due_row = None

    return {
        "patient": {"id": pid, "name": p["name"], "age": p["age"], "gender": p["gender"], "phone": p["phone"],
                    "existing_illnesses": p["existing_illnesses"] or [], "chairside_notes": p["chairside_notes"],
                    "total_visits": p["total_visits"] or 0, "patient_type": patient_type},
        "appointment": ({"id": str(apt["id"]), "chief_complaints": apt["chief_complaints"] or [],
                         "appointment_type": apt["appointment_type"] or apt["reason"], "workflow_status": apt["ws"],
                         "contact_status": apt["contact_status"],
                         "requested_date": apt["requested_date"].isoformat() if apt["requested_date"] else None,
                         "requested_time": str(apt["requested_time"])[:5] if apt["requested_time"] else None,
                         "confirmed_date": apt["confirmed_date"].isoformat() if apt["confirmed_date"] else None,
                         "confirmed_time": str(apt["confirmed_time"])[:5] if apt["confirmed_time"] else None,
                         "specialist_id": str(apt["specialist_id"]) if apt["specialist_id"] else None,
                         "specialist_confirmation_status": apt["specialist_confirmation_status"],
                         "specialist_session_status": apt["specialist_session_status"],
                         "specialist_assigned_at": apt["specialist_assigned_at"].isoformat() if apt["specialist_assigned_at"] else None,
                         "specialist_closed_at": apt["specialist_closed_at"].isoformat() if apt["specialist_closed_at"] else None,
                         "specialist_notes": apt["specialist_notes"],
                         "pending_action": apt["pending_action"],
                         "pending_action_since": apt["pending_action_since"].isoformat() if apt["pending_action_since"] else None,
                         "no_answer_count": no_answer_count} if apt else None),
        "plan": plan, "items": items, "revisions": revisions,
        "financial": {"total_value": total_value, "paid": paid, "today_added": today_added,
                      "previous_outstanding": max(total_value - today_added - paid, 0),
                      "outstanding": max(total_value - paid, 0),
                      "specialist_due": float(spec_due_row["total"] or 0) if spec_due_row else 0,
                      "lab_due": float(lab_due_row["total"] or 0) if lab_due_row else 0,
                      "ledger": ledger},
        "visits": [{"id": str(v["id"]), "date": v["finalized_at"].isoformat(), "work": v["procedures_done"] or [],
                    "notes": v["treatment_notes"], "next_step": v["next_step"],
                    "payable": float(v["amount_payable"] or 0), "collected": float(v["amount_collected"] or 0)} for v in visits],
        "prescriptions": prescriptions, "last_visit": last_visit,
        "specialist_cases": [{
            "appointment_id": str(r["appointment_id"]),
            "specialist_id": str(r["specialist_id"]) if r["specialist_id"] else None,
            "specialist_name": r["specialist_name"],
            "specialization": r["specialization"],
            "specialist_phone": r["specialist_phone"],
            "specialist_whatsapp": r["specialist_whatsapp"],
            "specialist_confirmation_status": r["specialist_confirmation_status"],
            "specialist_session_status": r["specialist_session_status"],
            "specialist_assigned_at": r["specialist_assigned_at"].isoformat() if r["specialist_assigned_at"] else None,
            "specialist_closed_at": r["specialist_closed_at"].isoformat() if r["specialist_closed_at"] else None,
            "specialist_notes": r["specialist_notes"],
            "scheduled_date": r["scheduled_date"].isoformat() if r["scheduled_date"] else None,
            "scheduled_time": str(r["scheduled_time"])[:5] if r["scheduled_time"] else None,
        } for r in specialist_cases_rows],
        "lab_orders": [{
            "id": str(r["id"]),
            "serial_no": r["serial_no"],
            "appointment_id": str(r["appointment_id"]) if r["appointment_id"] else None,
            "treatment_plan_item_id": str(r["treatment_plan_item_id"]) if r["treatment_plan_item_id"] else None,
            "vendor_id": str(r["vendor_id"]) if r["vendor_id"] else None,
            "vendor_name": r["vendor_name"],
            "vendor_phone": r["vendor_phone"],
            "vendor_whatsapp": r["vendor_whatsapp"],
            "work_type": r["work_type"],
            "teeth": r["teeth"] or [],
            "shade": r["shade"],
            "status": r["status"],
            "cost": float(r["cost"] or 0),
            "paid_amount": float(r["paid_amount"] or 0),
            "sent_date": r["sent_date"].isoformat() if r["sent_date"] else None,
            "expected_date": r["expected_date"].isoformat() if r["expected_date"] else None,
            "received_date": r["received_date"].isoformat() if r["received_date"] else None,
            "notes": r["notes"],
            "linked_treatment_name": r["linked_treatment_name"],
            "linked_treatment_teeth": r["linked_treatment_teeth"] or [],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        } for r in lab_orders_rows],
        "appointment_history": [{
            "id": str(r["id"]),
            "action_type": r["action_type"],
            "old_value": r["old_value"] or {},
            "new_value": r["new_value"] or {},
            "notes": r["notes"],
            "changed_at": r["changed_at"].isoformat() if r["changed_at"] else None,
        } for r in history_rows],
        "tooth_treatments": [{"tooth": r["tooth_number"], "treatment": r["treatment_type"],
                              "treatment_name": r["treatment_type"], "treatment_kind": r.get("treatment_kind"),
                              "status": r["status"], "item_id": str(r["plan_item_id"]) if r["plan_item_id"] else None} for r in tt],
        "tooth_conditions": [{"id": str(r["id"]), "tooth": r["tooth_number"], "condition": r["condition"], "notes": r["notes"]} for r in tc],
        "tooth_examinations": [{"id": str(r["id"]), "tooth": r["tooth_number"], "finding": r["finding"], "notes": r["notes"],
                                "at": r["recorded_at"].isoformat() if r["recorded_at"] else None} for r in tex],
        "tooth_diagnoses": [{"id": str(r["id"]), "tooth": r["tooth_number"], "diagnosis": r["diagnosis"], "notes": r["notes"],
                             "at": r["recorded_at"].isoformat() if r["recorded_at"] else None} for r in tdx],
        "draft": draft["data"] if draft else None,
    }

# ════════════════════ TREATMENT PLAN (MASTER) ══════════════════
@router.post("/{patient_id}/plan-item", status_code=201)
async def add_plan_item(patient_id: UUID, body: PlanItemIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    pid = str(patient_id)
    plan_id = await _active_plan(db, pid, str(body.clinic_id), str(staff["staff_id"]), create=True)
    # The catalog suggestion is the treatment charge. Keep a single source of
    # truth so alternate clients cannot silently create a different doctor rate.
    doctor_rate = max(float(body.suggested_rate or 0), 0)
    final = max(doctor_rate - body.discount, 0)
    row = (await db.execute(sql_text("""INSERT INTO treatment_plan_items
        (plan_id,procedure_catalog_id,procedure_name,teeth,area_label,suggested_rate,doctor_rate,discount,final_amount,notes,status,tooth_number,examination_summary,diagnosis)
        VALUES(:pl,:pc,:n,CAST(:t AS JSONB),:al,:sr,:dr,:d,:f,:no,'advised',:tn,:es,:dx) RETURNING id"""),
        {"pl": plan_id, "pc": str(body.procedure_id) if body.procedure_id else None, "n": body.treatment_name,
         "t": json.dumps(body.teeth), "al": body.area_label, "sr": body.suggested_rate, "dr": doctor_rate,
         "d": body.discount, "f": final, "no": body.notes,
         "tn": str(body.teeth[0]) if body.teeth else None,
         "es": body.examination_summary, "dx": body.diagnosis})).mappings().one()
    item_id = str(row["id"])
    await _sync_teeth(db, item_id, pid, plan_id, body.treatment_name, body.teeth)          # → Tooth Chart
    await _log_revision(db, plan_id, f"Added {body.treatment_name} {_teeth_label(body.teeth, body.area_label)} — ₹{final:,.0f}",
                        {"item_id": item_id, "action": "add"}, str(staff["staff_id"]))
    await _recalc_plan(db, plan_id)
    if body.procedure_id:
        await db.execute(sql_text("UPDATE procedure_catalog SET usage_count=COALESCE(usage_count,0)+1 WHERE id=:i"), {"i": str(body.procedure_id)})
    if body.diagnosis and body.treatment_name:
        try:
            await _record_clinical_link(db, "diag_treatment", body.diagnosis, body.treatment_name, str(body.clinic_id))
        except Exception:
            pass
    return {"id": item_id, "item_id": item_id, "plan_id": plan_id, "final_amount": final}

@router.patch("/plan-item/{item_id}")
async def edit_plan_item(item_id: UUID, body: PlanItemPatch, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    cur = (await db.execute(sql_text("""SELECT i.*, p.patient_id FROM treatment_plan_items i
        JOIN treatment_plans p ON p.id=i.plan_id WHERE i.id=:i"""), {"i": str(item_id)})).mappings().one_or_none()
    if not cur: raise HTTPException(404, "Item not found")
    name = body.treatment_name if body.treatment_name is not None else cur["procedure_name"]
    teeth = body.teeth if body.teeth is not None else (cur["teeth"] or [])
    area = body.area_label if body.area_label is not None else cur["area_label"]
    sr = body.suggested_rate if body.suggested_rate is not None else float(cur["suggested_rate"] or 0)
    # doctor_rate always follows suggested_rate; discount remains a separate,
    # auditable adjustment.
    dr = sr
    disc = body.discount if body.discount is not None else float(cur["discount"] or 0)
    status = body.status if body.status is not None else cur["status"]
    notes = body.notes if body.notes is not None else cur["notes"]
    exam = body.examination_summary if body.examination_summary is not None else cur.get("examination_summary")
    diag = body.diagnosis if body.diagnosis is not None else cur.get("diagnosis")
    final = max(dr - disc, 0)
    await db.execute(sql_text("""UPDATE treatment_plan_items SET procedure_name=:n,teeth=CAST(:t AS JSONB),area_label=:al,
        suggested_rate=:sr,doctor_rate=:dr,discount=:d,final_amount=:f,notes=:no,status=:st,
        tooth_number=:tn,examination_summary=:es,diagnosis=:dx,updated_at=NOW() WHERE id=:i"""),
        {"n": name, "t": json.dumps(teeth), "al": area, "sr": sr, "dr": dr, "d": disc, "f": final,
         "no": notes, "st": status, "tn": str(teeth[0]) if teeth else None, "i": str(item_id),
         "es": exam, "dx": diag})
    await _sync_teeth(db, str(item_id), str(cur["patient_id"]), str(cur["plan_id"]), name, teeth, status)
    changes = []
    if body.discount is not None and body.discount != float(cur["discount"] or 0): changes.append(f"discount ₹{disc:,.0f}")
    if dr != float(cur["doctor_rate"] or 0): changes.append(f"rate ₹{dr:,.0f}")
    if body.teeth is not None: changes.append(f"teeth {_teeth_label(teeth, area)}")
    if body.status == "completed": changes.append("marked completed")
    await _log_revision(db, str(cur["plan_id"]), f"Updated {name} {_teeth_label(teeth, area)}" + (f" ({', '.join(changes)})" if changes else ""),
                        {"item_id": str(item_id), "action": "edit"}, str(staff["staff_id"]))
    await _recalc_plan(db, str(cur["plan_id"]))
    return {"item_id": str(item_id), "final_amount": final}

@router.delete("/plan-item/{item_id}")
async def delete_plan_item(item_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    cur = (await db.execute(sql_text("""SELECT i.procedure_name,i.teeth,i.area_label,i.plan_id FROM treatment_plan_items i WHERE i.id=:i"""),
                            {"i": str(item_id)})).mappings().one_or_none()
    if not cur: raise HTTPException(404, "Item not found")
    await db.execute(sql_text("UPDATE treatment_plan_items SET status='cancelled',updated_at=NOW() WHERE id=:i"), {"i": str(item_id)})
    await db.execute(sql_text("DELETE FROM tooth_treatments WHERE plan_item_id=:i"), {"i": str(item_id)})
    await _log_revision(db, str(cur["plan_id"]), f"Removed {cur['procedure_name']} {_teeth_label(cur['teeth'] or [], cur['area_label'])}",
                        {"item_id": str(item_id), "action": "delete"}, str(staff["staff_id"]))
    await _recalc_plan(db, str(cur["plan_id"]))
    return {"deleted": True}

@router.post("/plan-item/{item_id}/duplicate", status_code=201)
async def duplicate_plan_item(item_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text("""INSERT INTO treatment_plan_items
        (plan_id,procedure_catalog_id,procedure_name,teeth,area_label,suggested_rate,doctor_rate,discount,final_amount,notes,status,tooth_number)
        SELECT plan_id,procedure_catalog_id,procedure_name,teeth,area_label,suggested_rate,doctor_rate,discount,final_amount,notes,'advised',tooth_number
        FROM treatment_plan_items WHERE id=:i RETURNING id,plan_id,procedure_name,teeth,area_label"""),
        {"i": str(item_id)})).mappings().one_or_none()
    if not row: raise HTTPException(404, "Item not found")
    pat = (await db.execute(sql_text("SELECT patient_id FROM treatment_plans WHERE id=:pl"), {"pl": str(row["plan_id"])})).mappings().one()
    await _sync_teeth(db, str(row["id"]), str(pat["patient_id"]), str(row["plan_id"]), row["procedure_name"], row["teeth"] or [])
    await _log_revision(db, str(row["plan_id"]), f"Duplicated {row['procedure_name']} {_teeth_label(row['teeth'] or [], row['area_label'])}",
                        {"item_id": str(row["id"]), "action": "duplicate"}, str(staff["staff_id"]))
    await _recalc_plan(db, str(row["plan_id"]))
    return {"item_id": str(row["id"])}

# ═══════════════════ TREATMENT CATALOG + STEPS ═════════════════
@router.get("/treatments")
async def treatments(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("""SELECT id,name,category,default_cost,is_tooth_based,work_steps,common_advice,usage_count
        FROM procedure_catalog WHERE is_active=TRUE ORDER BY usage_count DESC,sort_order,name"""))).mappings().all()
    return [{"id": str(r["id"]), "name": r["name"], "category": r["category"], "rate": float(r["default_cost"] or 0),
             "is_tooth_based": bool(r["is_tooth_based"]), "work_steps": r["work_steps"] or [],
             "advice": r["common_advice"] or [], "usage_count": r["usage_count"] or 0} for r in rows]

@router.post("/treatments", status_code=201)
async def add_custom_treatment(body: CustomTreatmentIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    existing = (await db.execute(sql_text("SELECT id FROM procedure_catalog WHERE LOWER(name)=LOWER(:n)"), {"n": body.name.strip()})).mappings().one_or_none()
    if existing: return {"id": str(existing["id"]), "existed": True}
    row = (await db.execute(sql_text("""INSERT INTO procedure_catalog (name,category,default_cost,is_tooth_based,work_steps,added_from,is_active)
        VALUES(:n,:c,:r,:tb,CAST(:ws AS JSONB),'workspace',TRUE) RETURNING id"""),
        {"n": body.name.strip(), "c": "Tooth-Based" if body.is_tooth_based else "General",
         "r": body.default_cost, "tb": body.is_tooth_based,
         "ws": json.dumps([f"{body.name.strip()} Done"])})).mappings().one()
    return {"id": str(row["id"]), "existed": False}

@router.post("/treatments/{proc_id}/work-step")
async def add_work_step(proc_id: UUID, body: WorkStepIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Custom 'today's work' item — auto-saved into the treatment's future suggestions."""
    await db.execute(sql_text("""UPDATE procedure_catalog SET work_steps =
        CASE WHEN work_steps @> CAST(:s AS JSONB) THEN work_steps ELSE work_steps || CAST(:s AS JSONB) END
        WHERE id=:i"""), {"s": json.dumps([body.step.strip()]), "i": str(proc_id)})
    return {"added": body.step}

# ═══════════════════════ TOOTH CHART ═══════════════════════════
@router.get("/tooth-issues")
async def tooth_issues(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("SELECT id,issue_name FROM tooth_issue_catalog ORDER BY is_default DESC,issue_name"))).mappings().all()
    return [{"id": str(r["id"]), "name": r["issue_name"]} for r in rows]

@router.post("/tooth-issues", status_code=201)
async def add_tooth_issue(name: str, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("INSERT INTO tooth_issue_catalog (issue_name) VALUES(:n) ON CONFLICT (issue_name) DO NOTHING"), {"n": name.strip()})
    return {"name": name}

@router.post("/{patient_id}/tooth-condition", status_code=201)
async def add_tooth_condition(patient_id: UUID, body: ToothConditionIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    if not (11 <= body.tooth_number <= 85): raise HTTPException(400, "Tooth number must be FDI 11–85")
    row = (await db.execute(sql_text("""INSERT INTO tooth_conditions (patient_id,tooth_number,condition,notes,recorded_by)
        VALUES(:p,:t,:c,:n,:by) RETURNING id"""),
        {"p": str(patient_id), "t": body.tooth_number, "c": body.condition[:50], "n": body.notes, "by": str(staff["staff_id"])})).mappings().one()
    return {"id": str(row["id"])}

@router.delete("/tooth-condition/{cond_id}")
async def remove_tooth_condition(cond_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE tooth_conditions SET is_active=FALSE WHERE id=:i"), {"i": str(cond_id)})
    return {"removed": True}

# ═══════════════ OVERVIEW EDITS · NOTES · DRAFT ════════════════
@router.patch("/{patient_id}/chairside-notes")
async def chairside_notes(patient_id: UUID, body: NotesIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE patients SET chairside_notes=:n WHERE id=:p"), {"n": body.notes, "p": str(patient_id)})
    return {"saved": True}

@router.patch("/appointment/{apt_id}/complaints")
async def apt_complaints(apt_id: UUID, body: ComplaintsIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE appointments SET chief_complaints=CAST(:c AS JSONB),updated_at=NOW() WHERE id=:a"),
                     {"c": json.dumps(body.chief_complaints), "a": str(apt_id)})
    return {"saved": True}

@router.post("/{patient_id}/draft")
async def save_draft(patient_id: UUID, body: DraftIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("""INSERT INTO workspace_drafts (patient_id,data,updated_at) VALUES(:p,CAST(:d AS JSONB),NOW())
        ON CONFLICT (patient_id) DO UPDATE SET data=CAST(:d AS JSONB),updated_at=NOW()"""),
        {"p": str(patient_id), "d": json.dumps(body.data, default=str)})
    return {"saved": True}

# ═══════════════ CLOSE VISIT / CLOSE TREATMENT ═════════════════
@router.post("/visit/close")
async def close_visit(body: CloseVisitIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """AUTO VISIT CREATION — doctor never creates sessions manually.
    Saves work + prescription + files links, sends amount to nurse, follow-up,
    moves patient to Payment Collection. close_treatment=True archives the case."""
    pid, cid = str(body.patient_id), str(body.clinic_id)
    doctor_id = str(staff["staff_id"])

    # ─── GATES: Close Treatment (archive) requires specialist verified + lab completed ───
    if body.close_treatment:
        # Gate A: all specialist appointments must be verified (if any)
        unverified = (await db.execute(sql_text("""
            SELECT COUNT(*) AS cnt FROM appointments
            WHERE patient_id = :pid AND specialist_id IS NOT NULL
              AND COALESCE(specialist_session_status, 'pending') NOT IN ('verified','none')
              AND status NOT IN ('cancelled','no_show')
        """), {"pid": pid})).mappings().first()
        if unverified and int(unverified["cnt"]) > 0:
            raise HTTPException(409,
                f"Cannot close treatment: {unverified['cnt']} specialist session(s) not yet verified by doctor. "
                f"Go to Workshop → Specialist Work → Verify first.")

        # Gate B: all lab orders must be received/completed (none still pending/sent)
        pending_lab = (await db.execute(sql_text("""
            SELECT COUNT(*) AS cnt FROM lab_orders
            WHERE patient_id = :pid AND status IN ('pending','sent')
        """), {"pid": pid})).mappings().first()
        if pending_lab and int(pending_lab["cnt"]) > 0:
            raise HTTPException(409,
                f"Cannot close treatment: {pending_lab['cnt']} lab order(s) still pending. "
                f"Confirm lab orders are received/completed first.")

    work_json = json.dumps([w.dict() for w in body.todays_work], default=str)
    final_amount = max(body.amount_to_collect - body.adjustment_amount, 0)

    # 1. Visit record (reuse queue-started session if present — no duplicates)
    if body.session_id:
        sess = (await db.execute(sql_text("""UPDATE treatment_sessions SET procedures_done=CAST(:w AS JSONB),treatment_notes=:tn,
            next_step=:ns,amount_payable=:a,discount_amount=:adj,discount_reason=:ar,finalized_at=NOW(),status='awaiting_payment'
            WHERE id=:i RETURNING id"""),
            {"w": work_json, "tn": body.treatment_notes, "ns": body.next_visit_instructions, "a": final_amount,
             "adj": body.adjustment_amount, "ar": body.adjustment_reason, "i": str(body.session_id)})).mappings().one_or_none()
        session_id = str(sess["id"]) if sess else None
    else:
        session_id = None
    if not session_id:
        sess = (await db.execute(sql_text("""INSERT INTO treatment_sessions (patient_id,clinic_id,doctor_id,appointment_id,
            procedures_done,treatment_notes,next_step,amount_payable,discount_amount,discount_reason,started_at,finalized_at,status)
            VALUES(:p,:c,:d,:a,CAST(:w AS JSONB),:tn,:ns,:amt,:adj,:ar,NOW(),NOW(),'awaiting_payment') RETURNING id"""),
            {"p": pid, "c": cid, "d": doctor_id, "a": str(body.appointment_id) if body.appointment_id else None,
             "w": work_json, "tn": body.treatment_notes, "ns": body.next_visit_instructions,
             "amt": final_amount, "adj": body.adjustment_amount, "ar": body.adjustment_reason})).mappings().one()
        session_id = str(sess["id"])

    # 2. Tick today's work → plan items: completed_steps + status + tooth chart
    plan_id = body.plan_id and str(body.plan_id) or await _active_plan(db, pid, cid, doctor_id, create=False)
    done_labels = []
    for w in body.todays_work:
        done_labels.append(f"{w.step} ({w.treatment}{' ' + ','.join(map(str, w.teeth)) if w.teeth else ''})")
        if w.item_id:
            await db.execute(sql_text("""UPDATE treatment_plan_items SET completed_steps =
                CASE WHEN completed_steps @> CAST(:s AS JSONB) THEN completed_steps ELSE completed_steps || CAST(:s AS JSONB) END,
                updated_at=NOW() WHERE id=:i"""), {"s": json.dumps([w.step]), "i": str(w.item_id)})
            if w.item_completed:
                await db.execute(sql_text("UPDATE treatment_plan_items SET status='completed',updated_at=NOW() WHERE id=:i"), {"i": str(w.item_id)})
                await db.execute(sql_text("UPDATE tooth_treatments SET status='completed',completed_at=NOW(),completed_by=:by WHERE plan_item_id=:i"),
                                 {"by": doctor_id, "i": str(w.item_id)})
            else:
                await db.execute(sql_text("UPDATE tooth_treatments SET status='in_progress' WHERE plan_item_id=:i AND status='planned'"), {"i": str(w.item_id)})
    if plan_id and done_labels:
        await _log_revision(db, plan_id, "Visit: " + "; ".join(done_labels[:6]) + ("…" if len(done_labels) > 6 else ""),
                            {"session_id": session_id}, doctor_id)
        await db.execute(sql_text("UPDATE treatment_plans SET sittings_completed=COALESCE(sittings_completed,0)+1,updated_at=NOW() WHERE id=:pl"), {"pl": plan_id})

    # 3. Prescription (auto, serial-numbered per patient). Clinical findings
    # are copied into the visit prescription so the final PDF remains a useful
    # clinical record rather than only a medicine list.
    rx_id = None
    diagnosis_rows = (await db.execute(sql_text("""
        SELECT DISTINCT diagnosis FROM tooth_diagnoses
        WHERE patient_id=:p AND is_active=TRUE AND NULLIF(TRIM(diagnosis),'') IS NOT NULL
        UNION
        SELECT DISTINCT diagnosis FROM treatment_plan_items
        WHERE plan_id=:pl AND NULLIF(TRIM(diagnosis),'') IS NOT NULL
    """), {"p": pid, "pl": plan_id})).mappings().all() if plan_id else (await db.execute(sql_text("""
        SELECT DISTINCT diagnosis FROM tooth_diagnoses
        WHERE patient_id=:p AND is_active=TRUE AND NULLIF(TRIM(diagnosis),'') IS NOT NULL
    """), {"p": pid})).mappings().all()
    diagnosis_text = " | ".join(r["diagnosis"].strip() for r in diagnosis_rows if r["diagnosis"])
    treatment_done_text = "; ".join(done_labels)
    if body.medicines or body.advice or body.complaint or diagnosis_text or treatment_done_text or body.treatment_notes:
        rx = (await db.execute(sql_text("""INSERT INTO prescriptions (appointment_id,plan_id,patient_id,doctor_id,clinic_id,
            serial_number,complaint,diagnosis,doctor_raw_notes,medicines,visible_advice,internal_notes,followup_date)
            VALUES(:a,:pl,:p,:d,:c,(SELECT COALESCE(MAX(serial_number),0)+1 FROM prescriptions WHERE patient_id=:p),
            :co,:dx,:done,CAST(:m AS JSONB),:adv,:int,:fd) RETURNING id"""),
            {"a": str(body.appointment_id) if body.appointment_id else None, "pl": plan_id, "p": pid, "d": doctor_id, "c": cid,
             "co": body.complaint, "dx": diagnosis_text or None,
             "done": treatment_done_text or body.treatment_notes,
             "m": json.dumps(body.medicines, default=str), "adv": body.advice,
             "int": body.internal_notes or body.treatment_notes,
             "fd": body.followup_date if not body.close_treatment else None})).mappings().one()
        rx_id = str(rx["id"])
        # ─── Medicine learning ─────────────────────────────────────
        # 1. catalog frequency counter (already there)
        # 2. NEW: diag→medicine link (uses linked_diagnosis_id per-medicine when present,
        #        otherwise falls back to body.diagnosis on the plan item)
        # 3. NEW: treat_med — treatment_name → medicine link, derived via the plan item
        #        the diagnosis is linked to
        # Pull current plan items keyed by diagnosis text → treatment name (for treat_med)
        diag_to_treat = {}
        if plan_id:
            rows = (await db.execute(sql_text(
                "SELECT diagnosis, procedure_name FROM treatment_plan_items WHERE plan_id=:pl AND diagnosis IS NOT NULL"
            ), {"pl": plan_id})).mappings().all()
            for r in rows:
                d = (r["diagnosis"] or "").strip()
                t = (r["procedure_name"] or "").strip()
                if d and t and d not in diag_to_treat:
                    diag_to_treat[d] = t
        for m in body.medicines:
            mname = (m.get("name") or "").strip()
            if not mname:
                continue
            # catalog frequency
            await db.execute(sql_text(
                "UPDATE medicine_catalog SET usage_count=COALESCE(usage_count,0)+1 WHERE LOWER(name)=LOWER(:n)"
            ), {"n": mname})
            # learning edges — best-effort, never block Rx save
            try:
                linked_diag = (m.get("linked_diagnosis") or m.get("diagnosis") or "").strip()
                if linked_diag:
                    await _record_clinical_link(db, "diag_medicine", linked_diag, mname, cid)
                    # also record treat_med via the plan-item map
                    treat = diag_to_treat.get(linked_diag)
                    if treat:
                        await _record_clinical_link(db, "treat_med", treat, mname, cid)
                else:
                    # No per-medicine diagnosis — record against every diagnosis in the plan
                    for diag, treat in diag_to_treat.items():
                        await _record_clinical_link(db, "diag_medicine", diag, mname, cid)
                        await _record_clinical_link(db, "treat_med", treat, mname, cid)
            except Exception:
                pass

    # 4. Appointment → Nurse collection queue, including valid zero-payment closures
    if body.appointment_id:
        await db.execute(sql_text("""
            UPDATE appointments
               SET workflow_status='payment_pending',
                   status='payment_pending',
                   updated_at=NOW()
             WHERE id=:a
        """), {"a": str(body.appointment_id)})
    pname = (await db.execute(sql_text("SELECT name FROM patients WHERE id=:p"), {"p": pid})).mappings().one()["name"]
    if final_amount > 0 or body.appointment_id:
        await db.execute(sql_text("""INSERT INTO clinic_notifications (clinic_id,notification_type,recipient_role,sender_staff_id,title,message,priority,related_patient_id,related_session_id)
            VALUES(:c,'payment_to_collect','nurse',:d,:t,:m,'high',:p,:s)"""),
            {"c": cid, "d": doctor_id,
             "t": (f"💰 Collect ₹{final_amount:,.0f} — {pname}" if final_amount > 0 else f"✅ Close Zero-Payment Visit — {pname}"),
             "m": (f"Adjustment ₹{body.adjustment_amount:,.0f} ({body.adjustment_reason})" if body.adjustment_amount else
                   ("Visit closed by doctor. Confirm zero collection to complete." if final_amount <= 0 else "Visit closed by doctor")),
             "p": pid, "s": session_id})

    # 5. Follow-up → Schedule (Close Visit keeps the plan active)
    followup_apt = None
    if body.followup_date and not body.close_treatment:
        followup_time = _parse_time_input(body.followup_time, "10:00")
        fa = (await db.execute(sql_text("""INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,
            reason,appointment_type,source,status,workflow_status) VALUES(:p,:c,:d,:dt,:tm,
            :r,:at,'followup','scheduled','scheduled') RETURNING id"""),
            {"p": pid, "c": cid, "d": doctor_id, "dt": body.followup_date, "tm": followup_time,
             "r": body.next_visit_instructions or "Follow-up", "at": "Follow-up"})).mappings().one()
        followup_apt = str(fa["id"])

    # 6. Close Treatment → archive case, retain complete history
    if body.close_treatment and plan_id:
        await db.execute(sql_text("UPDATE treatment_plans SET status='closed',is_archived=TRUE,archived_at=NOW(),updated_at=NOW() WHERE id=:pl"), {"pl": plan_id})
        await _log_revision(db, plan_id, "Treatment closed & archived", {"session_id": session_id}, doctor_id)

    # 7. Chair-side notes + clear draft
    if body.chairside_notes is not None:
        await db.execute(sql_text("UPDATE patients SET chairside_notes=:n WHERE id=:p"), {"n": body.chairside_notes, "p": pid})
    await db.execute(sql_text("DELETE FROM workspace_drafts WHERE patient_id=:p"), {"p": pid})

    return {"session_id": session_id, "prescription_id": rx_id, "amount_to_collect": final_amount,
            "payment_status": "payment_pending",
            "followup_appointment_id": followup_apt, "treatment_closed": body.close_treatment}

# ════════════════════ CLINICAL EXAMINATION + DIAGNOSIS ══════════

@router.get("/exam-catalog")
async def exam_catalog(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("SELECT id,name,category FROM examination_catalog WHERE is_active=TRUE ORDER BY category,name"))).mappings().all()
    return [{"id": str(r["id"]), "name": r["name"], "category": r["category"]} for r in rows]

@router.post("/exam-catalog/custom", status_code=201)
async def add_custom_exam(name: str, category: str = "custom", db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    existing = (await db.execute(sql_text("SELECT id FROM examination_catalog WHERE LOWER(name)=LOWER(:n) AND is_active=TRUE"), {"n": name.strip()})).mappings().one_or_none()
    if existing: return {"id": str(existing["id"]), "exists": True}
    row = (await db.execute(sql_text("INSERT INTO examination_catalog (name,category) VALUES(:n,:c) RETURNING id"), {"n": name.strip(), "c": category})).mappings().one()
    return {"id": str(row["id"]), "created": True}

@router.get("/diagnosis-catalog")
async def diag_catalog(db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    rows = (await db.execute(sql_text("SELECT id,name,suggested_treatments FROM diagnosis_catalog WHERE is_active=TRUE ORDER BY name"))).mappings().all()
    return [{"id": str(r["id"]), "name": r["name"], "suggested_treatments": r["suggested_treatments"] or []} for r in rows]

@router.post("/diagnosis-catalog/custom", status_code=201)
async def add_custom_diag(name: str, suggested_treatments: str = "[]", db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    existing = (await db.execute(sql_text("SELECT id FROM diagnosis_catalog WHERE LOWER(name)=LOWER(:n) AND is_active=TRUE"), {"n": name.strip()})).mappings().one_or_none()
    if existing: return {"id": str(existing["id"]), "exists": True}
    row = (await db.execute(sql_text("INSERT INTO diagnosis_catalog (name,suggested_treatments) VALUES(:n,CAST(:st AS JSONB)) RETURNING id"),
                            {"n": name.strip(), "st": suggested_treatments})).mappings().one()
    return {"id": str(row["id"]), "created": True}

@router.post("/{patient_id}/tooth-exam", status_code=201)
async def add_tooth_exam(patient_id: UUID, body: ToothExamIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    pid = str(patient_id)
    # Auto-save custom finding to catalog
    existing = (await db.execute(sql_text("SELECT id FROM examination_catalog WHERE LOWER(name)=LOWER(:n) AND is_active=TRUE"), {"n": body.finding.strip()})).mappings().one_or_none()
    if not existing:
        await db.execute(sql_text("INSERT INTO examination_catalog (name,category) VALUES(:n,'custom')"), {"n": body.finding.strip()})
    row = (await db.execute(sql_text("""INSERT INTO tooth_examinations (patient_id,tooth_number,finding,notes,recorded_by)
        VALUES(:p,:t,:f,:n,:by) RETURNING id"""),
        {"p": pid, "t": body.tooth_number, "f": body.finding.strip(), "n": body.notes, "by": str(staff["staff_id"])})).mappings().one()
    return {"id": str(row["id"])}

@router.delete("/tooth-exam/{exam_id}")
async def remove_tooth_exam(exam_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE tooth_examinations SET is_active=FALSE WHERE id=:i"), {"i": str(exam_id)})
    return {"removed": True}

@router.post("/{patient_id}/tooth-diagnosis", status_code=201)
async def add_tooth_diagnosis(patient_id: UUID, body: ToothDiagIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    pid = str(patient_id)
    existing = (await db.execute(sql_text("SELECT id FROM diagnosis_catalog WHERE LOWER(name)=LOWER(:n) AND is_active=TRUE"), {"n": body.diagnosis.strip()})).mappings().one_or_none()
    if not existing:
        await db.execute(sql_text("INSERT INTO diagnosis_catalog (name,suggested_treatments) VALUES(:n,'[]')"), {"n": body.diagnosis.strip()})
    row = (await db.execute(sql_text("""INSERT INTO tooth_diagnoses (patient_id,tooth_number,diagnosis,notes,recorded_by)
        VALUES(:p,:t,:d,:n,:by) RETURNING id"""),
        {"p": pid, "t": body.tooth_number, "d": body.diagnosis.strip(), "n": body.notes, "by": str(staff["staff_id"])})).mappings().one()
    cid = str(staff.get("clinic_id") or "")
    for ex in body.linked_exams or []:
        try:
            await _record_clinical_link(db, "exam_diag", ex, body.diagnosis.strip(), cid or None)
        except Exception:
            pass
    return {"id": str(row["id"])}

@router.delete("/tooth-diagnosis/{diag_id}")
async def remove_tooth_diagnosis(diag_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    await db.execute(sql_text("UPDATE tooth_diagnoses SET is_active=FALSE WHERE id=:i"), {"i": str(diag_id)})
    return {"removed": True}

@router.get("/{patient_id}/tooth-timeline/{tooth_number}")
async def tooth_timeline(patient_id: UUID, tooth_number: int, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Full clinical history for a single tooth: examinations → diagnoses → treatments → visits → files."""
    pid = str(patient_id)
    events = []
    # Examinations
    exams = (await db.execute(sql_text("""SELECT finding,notes,recorded_at FROM tooth_examinations
        WHERE patient_id=:p AND tooth_number=:t AND is_active=TRUE ORDER BY recorded_at"""), {"p": pid, "t": tooth_number})).mappings().all()
    for e in exams:
        events.append({"type": "examination", "text": e["finding"], "notes": e["notes"], "at": e["recorded_at"].isoformat()})
    # Diagnoses
    diags = (await db.execute(sql_text("""SELECT diagnosis,notes,recorded_at FROM tooth_diagnoses
        WHERE patient_id=:p AND tooth_number=:t AND is_active=TRUE ORDER BY recorded_at"""), {"p": pid, "t": tooth_number})).mappings().all()
    for d in diags:
        events.append({"type": "diagnosis", "text": d["diagnosis"], "notes": d["notes"], "at": d["recorded_at"].isoformat()})
    # Treatments (from plan)
    treatments = (await db.execute(sql_text("""SELECT tt.treatment_type,tt.status,tt.planned_at FROM tooth_treatments tt
        WHERE tt.patient_id=:p AND tt.tooth_number=:t ORDER BY tt.planned_at"""), {"p": pid, "t": tooth_number})).mappings().all()
    for t in treatments:
        events.append({"type": "treatment", "text": f"{t['treatment_type']} ({t['status']})", "at": t["planned_at"].isoformat() if t["planned_at"] else None})
    # Visits that reference this tooth
    visits = (await db.execute(sql_text("""SELECT ts.finalized_at,ts.procedures_done,ts.treatment_notes FROM treatment_sessions ts
        WHERE ts.patient_id=:p AND ts.finalized_at IS NOT NULL ORDER BY ts.finalized_at"""), {"p": pid})).mappings().all()
    for v in visits:
        procs = v["procedures_done"] or []
        relevant = [p for p in procs if any(str(tooth_number) in str(p.get("teeth", [])) for _ in [1]) or str(tooth_number) in str(p)]
        if relevant:
            events.append({"type": "visit", "text": ", ".join(p.get("name", str(p)) if isinstance(p, dict) else str(p) for p in relevant),
                           "at": v["finalized_at"].isoformat()})
    # Files for this tooth
    files = (await db.execute(sql_text("""SELECT original_filename,file_kind,uploaded_at FROM patient_uploads
        WHERE patient_id=:p AND tooth_number=:t ORDER BY uploaded_at"""), {"p": pid, "t": str(tooth_number)})).mappings().all()
    for f in files:
        events.append({"type": "file", "text": f"{f['file_kind'] or 'File'}: {f['original_filename']}", "at": f["uploaded_at"].isoformat()})
    # Sort all events by date
    events.sort(key=lambda e: e.get("at") or "")
    return {"tooth": tooth_number, "events": events}

# ════════════════════ CLINICAL LEARNING ════════════════════════

@router.post("/clinical-learn")
async def record_clinical_link(body: ClinicalLinkIn, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    """Record doctor co-selection. Supported link_types:
       - exam_diag        : examination finding → diagnosis
       - diag_treatment   : diagnosis → treatment / procedure name
       - treat_med        : treatment → medicine (NEW)
       - diag_medicine    : diagnosis → medicine (NEW, used by Rx auto-suggest)
       - treatment_medicine : alias kept for backwards compat with older clients
    """
    lt = body.link_type.strip()
    aliases = {"treatment_medicine": "treat_med"}
    lt = aliases.get(lt, lt)
    if lt not in ("exam_diag", "diag_treatment", "treat_med", "diag_medicine"):
        raise HTTPException(400, "Invalid link_type")
    cid = str(staff.get("clinic_id") or "") or None
    try:
        await _record_clinical_link(db, lt, body.source, body.target, cid)
    except Exception as e:
        raise HTTPException(500, f"Learning table unavailable — run migration 013: {e}")
    return {"recorded": True}

@router.get("/clinical-suggest")
async def suggest_clinical_links(
    link_type: str,
    source: str,
    limit: int = Query(8, le=20),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    """Ranked suggestions from learned co-occurrences (+ global seeds)."""
    lt = link_type.strip()
    src = source.strip()
    if not src:
        return {"suggestions": []}
    cid = str(staff.get("clinic_id") or "")
    try:
        rows = (await db.execute(sql_text("""
            SELECT target_key, SUM(score) AS total
            FROM clinical_link_scores
            WHERE link_type = :lt AND LOWER(source_key) = LOWER(:src)
              AND (clinic_id IS NULL OR clinic_id = CAST(:cid AS UUID))
            GROUP BY target_key
            ORDER BY total DESC, target_key
            LIMIT :lim
        """), {"lt": lt, "src": src, "cid": cid, "lim": limit})).mappings().all()
        return {"suggestions": [{"name": r["target_key"], "score": int(r["total"] or 0)} for r in rows]}
    except Exception:
        return {"suggestions": []}
