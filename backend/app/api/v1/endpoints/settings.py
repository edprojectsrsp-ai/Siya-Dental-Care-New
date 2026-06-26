"""
backend/app/api/v1/endpoints/settings.py — Bundle Q+

Frontend Settings page reads/writes clinic_settings + message_templates.
Also exposes message_log query endpoints + send-direct (manual blast).

Endpoints:
  GET   /settings/clinic/{clinic_id}              → all settings (one row)
  PATCH /settings/clinic/{clinic_id}              → update (any subset)
  POST  /settings/clinic/{clinic_id}/test         → test transport (sends to a number)

  GET   /settings/templates?clinic_id=...         → list templates
  GET   /settings/templates/{key}?clinic_id=...   → single
  POST  /settings/templates                        → upsert (clinic override or new)
  DELETE /settings/templates/{key}?clinic_id=...  → remove clinic override

  GET   /msg/log                                  → message log (paginated, filtered)
  GET   /msg/stats?clinic_id=...                  → counts (sent/failed/today/week)
  POST  /msg/send                                 → manual send (1 recipient)
  POST  /msg/bulk                                 → bulk send (N recipients)
  POST  /msg/flush                                → fire scheduler tick now
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.messaging import send_message, flush_queued, _normalize_phone

router = APIRouter(prefix="/settings", tags=["Settings"])
msg_router = APIRouter(prefix="/msg", tags=["Messaging"])


# ═══════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════
class SettingsUpdate(BaseModel):
    message_transport: Optional[str] = None
    cloud_api_token: Optional[str] = None
    cloud_api_phone_id: Optional[str] = None
    cloud_api_waba_id: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    reminder_24h_enabled: Optional[bool] = None
    reminder_2h_enabled: Optional[bool] = None
    reminder_30m_enabled: Optional[bool] = None
    receipt_mode: Optional[str] = None
    rating_ask_enabled: Optional[bool] = None
    rating_ask_hours: Optional[int] = None
    rating_retry_days: Optional[int] = None
    rating_discount_amount: Optional[float] = None
    rating_discount_mode: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_mode: Optional[str] = None
    phone_consult_enabled: Optional[bool] = None
    phone_consult_fee: Optional[float] = None
    phone_consult_duration_min: Optional[int] = None
    extra_json: Optional[dict] = None


@router.get("/clinic/{clinic_id}")
async def get_clinic_settings(clinic_id: UUID, db: AsyncSession = Depends(get_db),
                              staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text("SELECT * FROM clinic_settings WHERE clinic_id = :cid"),
                            {"cid": str(clinic_id)})).mappings().one_or_none()
    if not row:
        # Auto-seed
        await db.execute(sql_text("INSERT INTO clinic_settings (clinic_id) VALUES (:cid) ON CONFLICT DO NOTHING"),
                         {"cid": str(clinic_id)})
        row = (await db.execute(sql_text("SELECT * FROM clinic_settings WHERE clinic_id = :cid"),
                                {"cid": str(clinic_id)})).mappings().one()
    d = dict(row)
    # Mask secrets in GET (show only last 4 chars)
    for k in ("cloud_api_token", "webhook_secret", "razorpay_key_secret"):
        v = d.get(k)
        if v and len(str(v)) > 6:
            d[k + "_masked"] = "•" * 6 + str(v)[-4:]
            d[k] = None
    d["clinic_id"] = str(d["clinic_id"])
    if d.get("updated_by"):
        d["updated_by"] = str(d["updated_by"])
    return d


@router.patch("/clinic/{clinic_id}")
async def update_clinic_settings(clinic_id: UUID, body: SettingsUpdate,
                                 db: AsyncSession = Depends(get_db),
                                 staff=Depends(get_current_staff)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Nothing to update")

    # Whitelist
    allowed = {
        "message_transport", "cloud_api_token", "cloud_api_phone_id", "cloud_api_waba_id",
        "webhook_url", "webhook_secret",
        "reminder_24h_enabled", "reminder_2h_enabled", "reminder_30m_enabled",
        "receipt_mode",
        "rating_ask_enabled", "rating_ask_hours", "rating_retry_days",
        "rating_discount_amount", "rating_discount_mode",
        "razorpay_key_id", "razorpay_key_secret", "razorpay_mode",
        "phone_consult_enabled", "phone_consult_fee", "phone_consult_duration_min",
        "extra_json",
    }
    sets = []
    params: Dict[str, Any] = {"cid": str(clinic_id)}
    for k, v in data.items():
        if k not in allowed:
            continue
        if k == "extra_json":
            sets.append("extra_json = CAST(:extra_json AS JSONB)")
            import json as _json
            params["extra_json"] = _json.dumps(v)
        else:
            sets.append(f"{k} = :{k}")
            params[k] = v
    if not sets:
        raise HTTPException(400, "No valid fields")
    sets.append("updated_at = NOW()")
    sets.append("updated_by = :ub")
    params["ub"] = str(staff["staff_id"]) if staff and staff.get("staff_id") else None

    # Ensure row exists
    await db.execute(sql_text("INSERT INTO clinic_settings (clinic_id) VALUES (:cid) ON CONFLICT DO NOTHING"),
                     {"cid": str(clinic_id)})
    await db.execute(sql_text(f"UPDATE clinic_settings SET {', '.join(sets)} WHERE clinic_id = :cid"), params)
    return {"updated": True}


@router.post("/clinic/{clinic_id}/test")
async def test_transport(clinic_id: UUID, body: dict,
                          db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    """Send a one-off test message to verify transport config works.
    body: {phone: "9876543210", message?: "Hello from Siya Dental"}"""
    phone = body.get("phone")
    text = body.get("message") or "✓ Test from Siya Dental settings. If you see this, your WhatsApp transport is working!"
    if not phone:
        raise HTTPException(400, "phone required")

    result = await send_message(
        db=db, clinic_id=str(clinic_id),
        template_key=None,
        recipient_kind="other",
        recipient_phone=phone,
        recipient_name="Settings Test",
        body_override=text,
        trigger="manual",
        created_by=str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
    )
    return result


# ═══════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════
class TemplateUpsert(BaseModel):
    clinic_id: Optional[UUID] = None    # NULL = update global; UUID = clinic override
    template_key: str
    category: str
    label: str
    body: str
    cloud_template_name: Optional[str] = None
    cloud_template_lang: Optional[str] = "en"
    is_active: bool = True


@router.get("/templates")
async def list_templates(clinic_id: Optional[UUID] = None,
                          category: Optional[str] = None,
                          db: AsyncSession = Depends(get_db),
                          staff=Depends(get_current_staff)):
    """Return effective templates: clinic-overrides first, then globals not overridden."""
    where = ["is_active = TRUE"]
    params: Dict[str, Any] = {}
    if clinic_id:
        # Effective = clinic-specific OR global where clinic doesn't have an override
        rows = (await db.execute(sql_text("""
            WITH effective AS (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY template_key
                                          ORDER BY (clinic_id IS NOT NULL) DESC) AS rk
                FROM message_templates
                WHERE is_active = TRUE
                  AND (clinic_id IS NULL OR clinic_id = :cid)
            )
            SELECT * FROM effective WHERE rk = 1
            ORDER BY category, template_key
        """), {"cid": str(clinic_id)})).mappings().all()
    else:
        rows = (await db.execute(sql_text("""
            SELECT * FROM message_templates
            WHERE is_active = TRUE AND clinic_id IS NULL
            ORDER BY category, template_key
        """))).mappings().all()

    out = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"])
        d["clinic_id"] = str(d["clinic_id"]) if d.get("clinic_id") else None
        d.pop("rk", None)
        d["updated_at"] = d["updated_at"].isoformat() if d.get("updated_at") else None
        out.append(d)
    # Filter by category if requested
    if category:
        out = [t for t in out if t.get("category") == category]
    return {"templates": out, "total": len(out)}


@router.get("/templates/{key}")
async def get_template(key: str, clinic_id: Optional[UUID] = None,
                        db: AsyncSession = Depends(get_db),
                        staff=Depends(get_current_staff)):
    if clinic_id:
        row = (await db.execute(sql_text("""
            SELECT * FROM message_templates
            WHERE template_key = :k AND clinic_id = :cid
        """), {"k": key, "cid": str(clinic_id)})).mappings().one_or_none()
        if row:
            d = dict(row); d["id"] = str(d["id"]); d["clinic_id"] = str(d["clinic_id"])
            d["updated_at"] = d["updated_at"].isoformat() if d.get("updated_at") else None
            return d
    row = (await db.execute(sql_text("""
        SELECT * FROM message_templates WHERE template_key = :k AND clinic_id IS NULL
    """), {"k": key})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, f"Template '{key}' not found")
    d = dict(row); d["id"] = str(d["id"]); d["clinic_id"] = None
    d["updated_at"] = d["updated_at"].isoformat() if d.get("updated_at") else None
    return d


@router.post("/templates")
async def upsert_template(body: TemplateUpsert,
                           db: AsyncSession = Depends(get_db),
                           staff=Depends(get_current_staff)):
    """Create new template OR update existing one for the given clinic scope."""
    cid = str(body.clinic_id) if body.clinic_id else None
    await db.execute(sql_text("""
        INSERT INTO message_templates
            (clinic_id, template_key, category, label, body,
             cloud_template_name, cloud_template_lang, is_active, updated_at)
        VALUES (:cid, :k, :cat, :lab, :body, :ct, :cl, :act, NOW())
        ON CONFLICT (clinic_id, template_key) DO UPDATE SET
            category = EXCLUDED.category,
            label = EXCLUDED.label,
            body = EXCLUDED.body,
            cloud_template_name = EXCLUDED.cloud_template_name,
            cloud_template_lang = EXCLUDED.cloud_template_lang,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
    """), {
        "cid": cid, "k": body.template_key, "cat": body.category,
        "lab": body.label, "body": body.body,
        "ct": body.cloud_template_name, "cl": body.cloud_template_lang,
        "act": body.is_active,
    })
    return {"saved": True, "template_key": body.template_key, "clinic_id": cid}


@router.delete("/templates/{key}")
async def remove_template_override(key: str, clinic_id: UUID,
                                    db: AsyncSession = Depends(get_db),
                                    staff=Depends(get_current_staff)):
    """Remove a clinic-specific override (falls back to global)."""
    await db.execute(sql_text("""
        DELETE FROM message_templates WHERE template_key = :k AND clinic_id = :cid
    """), {"k": key, "cid": str(clinic_id)})
    return {"deleted": True}


# ═══════════════════════════════════════════════════════════════
# MESSAGE LOG + MANUAL SEND + BULK
# ═══════════════════════════════════════════════════════════════
@msg_router.get("/log")
async def message_log(
    clinic_id: Optional[UUID] = None,
    template_key: Optional[str] = None,
    recipient_kind: Optional[str] = None,
    recipient_id: Optional[UUID] = None,
    status: Optional[str] = None,
    trigger: Optional[str] = None,
    days: int = Query(30, ge=1, le=180),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    where = ["created_at >= NOW() - INTERVAL '1 day' * :days"]
    params: Dict[str, Any] = {"days": days, "lim": limit, "off": offset}
    if clinic_id:      where.append("clinic_id = :cid");        params["cid"] = str(clinic_id)
    if template_key:   where.append("template_key = :tk");      params["tk"] = template_key
    if recipient_kind: where.append("recipient_kind = :rk");    params["rk"] = recipient_kind
    if recipient_id:   where.append("recipient_id = :rid");     params["rid"] = str(recipient_id)
    if status:         where.append("status = :st");            params["st"] = status
    if trigger:        where.append("trigger = :trg");          params["trg"] = trigger

    where_sql = " WHERE " + " AND ".join(where)
    rows = (await db.execute(sql_text(f"""
        SELECT id, template_key, recipient_kind, recipient_id, recipient_name,
               recipient_phone, body, status, transport, trigger, direction,
               scheduled_for, sent_at, failed_at, created_at, error_text,
               appointment_id, lab_order_id
        FROM message_log {where_sql}
        ORDER BY created_at DESC
        LIMIT :lim OFFSET :off
    """), params)).mappings().all()
    total = (await db.execute(sql_text(f"SELECT COUNT(*)::int AS c FROM message_log {where_sql}"),
                              {k: v for k, v in params.items() if k not in ("lim", "off")})).mappings().one()["c"]
    def _iso(v): return v.isoformat() if v else None
    return {
        "total": total, "limit": limit, "offset": offset,
        "messages": [{
            "id": str(r["id"]),
            "template_key": r["template_key"],
            "recipient": {
                "kind": r["recipient_kind"],
                "id": str(r["recipient_id"]) if r["recipient_id"] else None,
                "name": r["recipient_name"],
                "phone": r["recipient_phone"],
            },
            "body": r["body"],
            "status": r["status"],
            "transport": r["transport"],
            "trigger": r["trigger"],
            "direction": r["direction"],
            "scheduled_for": _iso(r["scheduled_for"]),
            "sent_at": _iso(r["sent_at"]),
            "failed_at": _iso(r["failed_at"]),
            "created_at": _iso(r["created_at"]),
            "error_text": r["error_text"],
            "appointment_id": str(r["appointment_id"]) if r["appointment_id"] else None,
            "lab_order_id": str(r["lab_order_id"]) if r["lab_order_id"] else None,
        } for r in rows],
    }


@msg_router.get("/stats")
async def message_stats(clinic_id: UUID,
                         db: AsyncSession = Depends(get_db),
                         staff=Depends(get_current_staff)):
    row = (await db.execute(sql_text("""
        SELECT * FROM message_log_stats_v WHERE clinic_id = :cid
    """), {"cid": str(clinic_id)})).mappings().one_or_none()
    if not row:
        return {"clinic_id": str(clinic_id), "total_sent": 0, "auto_sent": 0,
                "manual_sent": 0, "failed": 0, "queued": 0, "today_count": 0, "week_count": 0}
    d = dict(row); d["clinic_id"] = str(d["clinic_id"])
    return d


class SendIn(BaseModel):
    clinic_id: UUID
    template_key: Optional[str] = None
    body_override: Optional[str] = None
    recipient_kind: str = "patient"
    recipient_id: Optional[UUID] = None
    recipient_phone: str
    recipient_name: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    appointment_id: Optional[UUID] = None
    payment_id: Optional[UUID] = None
    lab_order_id: Optional[UUID] = None
    visit_id: Optional[UUID] = None
    scheduled_for: Optional[datetime] = None
    transport_override: Optional[str] = None


@msg_router.post("/send")
async def manual_send(body: SendIn,
                      db: AsyncSession = Depends(get_db),
                      staff=Depends(get_current_staff)):
    result = await send_message(
        db=db,
        clinic_id=str(body.clinic_id),
        template_key=body.template_key,
        recipient_kind=body.recipient_kind,
        recipient_phone=body.recipient_phone,
        recipient_name=body.recipient_name,
        recipient_id=str(body.recipient_id) if body.recipient_id else None,
        variables=body.variables,
        body_override=body.body_override,
        appointment_id=str(body.appointment_id) if body.appointment_id else None,
        payment_id=str(body.payment_id) if body.payment_id else None,
        lab_order_id=str(body.lab_order_id) if body.lab_order_id else None,
        visit_id=str(body.visit_id) if body.visit_id else None,
        trigger="manual",
        scheduled_for=body.scheduled_for,
        transport_override=body.transport_override,
        created_by=str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
    )
    return result


class BulkRecipient(BaseModel):
    recipient_id: Optional[UUID] = None
    recipient_kind: str = "patient"
    recipient_name: Optional[str] = None
    recipient_phone: str
    variables: Dict[str, Any] = Field(default_factory=dict)


class BulkSend(BaseModel):
    clinic_id: UUID
    template_key: Optional[str] = None
    body_override: Optional[str] = None
    common_variables: Dict[str, Any] = Field(default_factory=dict)
    recipients: List[BulkRecipient]
    transport_override: Optional[str] = None


@msg_router.post("/bulk")
async def bulk_send(body: BulkSend,
                     db: AsyncSession = Depends(get_db),
                     staff=Depends(get_current_staff)):
    """Send the same template to many recipients. Per-recipient vars merge with common."""
    if not body.recipients:
        raise HTTPException(400, "recipients empty")
    if len(body.recipients) > 500:
        raise HTTPException(400, "Max 500 recipients per bulk send")

    results = []
    for rcp in body.recipients:
        vars_merged = {**body.common_variables, **rcp.variables}
        r = await send_message(
            db=db,
            clinic_id=str(body.clinic_id),
            template_key=body.template_key,
            recipient_kind=rcp.recipient_kind,
            recipient_phone=rcp.recipient_phone,
            recipient_name=rcp.recipient_name,
            recipient_id=str(rcp.recipient_id) if rcp.recipient_id else None,
            variables=vars_merged,
            body_override=body.body_override,
            trigger="manual",
            transport_override=body.transport_override,
            created_by=str(staff["staff_id"]) if staff and staff.get("staff_id") else None,
        )
        results.append({"phone": rcp.recipient_phone, "name": rcp.recipient_name, **r})

    sent = sum(1 for r in results if r.get("status") in ("sent", "manual_pending", "queued"))
    failed = sum(1 for r in results if r.get("status") == "failed")
    return {
        "total": len(results), "sent": sent, "failed": failed,
        "results": results,
    }


@msg_router.post("/flush")
async def flush_now(db: AsyncSession = Depends(get_db),
                     staff=Depends(get_current_staff)):
    """Manually trigger the scheduler tick (sends all queued messages whose
    scheduled_for has passed). Cron/n8n can call this every 10 min, or admin
    presses 'Send Now' in the message log UI."""
    return await flush_queued(db)
