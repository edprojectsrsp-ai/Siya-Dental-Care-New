"""
backend/app/services/messaging.py — Bundle Q+

Pluggable WhatsApp messaging engine.

ARCHITECTURE
============
Every message goes through `send_message()`. The engine:
  1. Loads the template (DB or default fallback)
  2. Interpolates variables ({patient_name}, {date}, etc.)
  3. Reads clinic_settings.message_transport
  4. Routes to the matching transport:
       - 'cloud_api'   → Meta WhatsApp Business Cloud API (HTTPS POST)
       - 'baileys'     → Self-hosted webhook (POST to user-defined URL)
       - 'click2chat'  → Returns wa.me URL (frontend opens; manual confirm)
  5. Records the send (or queue/failure) in message_log

The frontend never knows or cares which transport. Settings drives everything.
Swap providers by changing one dropdown — zero code changes.

USAGE
=====
    # From any endpoint:
    from app.services.messaging import send_message

    result = await send_message(
        db=db,
        clinic_id=clinic_id,
        template_key='appointment_confirmation',
        recipient_kind='patient',
        recipient_id=patient_id,
        recipient_phone=patient.phone,
        recipient_name=patient.name,
        variables={
            'patient_name': patient.name,
            'clinic_name': clinic.name,
            'date': '15 Jun', 'time': '11:00 AM',
            'doctor_name': 'Dr. Madhu',
        },
        appointment_id=apt_id,
        trigger='auto',  # or 'manual'
    )
    # result = {'status': 'sent'|'queued'|'failed'|'manual_pending',
    #           'wa_url': '...' (only if click2chat),
    #           'log_id': '<uuid>'}
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
import re
import json
import asyncio

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _interpolate(template: str, variables: Dict[str, Any]) -> str:
    """Replace {key} placeholders with values from variables dict.
    Missing keys are kept as the literal placeholder (helps debugging)."""
    def repl(m):
        key = m.group(1).strip()
        v = variables.get(key)
        return str(v) if v is not None else m.group(0)
    return re.sub(r"\{([a-zA-Z0-9_]+)\}", repl, template)


def _normalize_phone(phone: str, default_country: str = "91") -> str:
    """Strip non-digits, prefix country code if missing. Returns digits only."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return ""
    if len(digits) == 10:
        return default_country + digits
    if digits.startswith("0") and len(digits) == 11:
        return default_country + digits[1:]
    return digits


async def _load_settings(db: AsyncSession, clinic_id: str) -> Dict[str, Any]:
    """Get clinic_settings row (or seed default)."""
    row = (await db.execute(sql_text("""
        SELECT * FROM clinic_settings WHERE clinic_id = :cid
    """), {"cid": clinic_id})).mappings().one_or_none()
    if row:
        return dict(row)
    # Auto-create default row
    await db.execute(sql_text("""
        INSERT INTO clinic_settings (clinic_id) VALUES (:cid)
        ON CONFLICT DO NOTHING
    """), {"cid": clinic_id})
    return await _load_settings(db, clinic_id)


async def _load_template(db: AsyncSession, clinic_id: Optional[str], template_key: str) -> Optional[Dict[str, Any]]:
    """Find template — prefer clinic-specific override, fall back to global."""
    # Clinic-specific
    if clinic_id:
        row = (await db.execute(sql_text("""
            SELECT * FROM message_templates
            WHERE clinic_id = :cid AND template_key = :k AND is_active = TRUE
        """), {"cid": clinic_id, "k": template_key})).mappings().one_or_none()
        if row:
            return dict(row)
    # Global default
    row = (await db.execute(sql_text("""
        SELECT * FROM message_templates
        WHERE clinic_id IS NULL AND template_key = :k AND is_active = TRUE
    """), {"k": template_key})).mappings().one_or_none()
    return dict(row) if row else None


# ─────────────────────────────────────────────────────────────────────────────
# Transports
# ─────────────────────────────────────────────────────────────────────────────
class TransportResult(dict):
    """status: 'sent' | 'failed' | 'manual_pending'
       provider_msg_id, error_text, wa_url (click2chat only)"""


async def _transport_cloud_api(settings: dict, phone: str, body: str, tpl: Optional[dict]) -> TransportResult:
    """Meta WhatsApp Business Cloud API.
    Docs: https://developers.facebook.com/docs/whatsapp/cloud-api"""
    token = settings.get("cloud_api_token")
    phone_id = settings.get("cloud_api_phone_id")
    if not token or not phone_id:
        return TransportResult(status="failed",
            error_text="cloud_api_token or cloud_api_phone_id missing in settings")

    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Use template message if cloud_template_name set (required outside 24-hr session)
    # Otherwise send as text (only works for users who messaged us in the last 24h)
    if tpl and tpl.get("cloud_template_name"):
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": tpl["cloud_template_name"],
                "language": {"code": tpl.get("cloud_template_lang") or "en"},
            },
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {"body": body, "preview_url": True},
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, headers=headers, json=payload)
        if r.status_code in (200, 201):
            data = r.json()
            msg_id = (data.get("messages") or [{}])[0].get("id")
            return TransportResult(status="sent", provider_msg_id=msg_id)
        return TransportResult(status="failed", error_text=f"HTTP {r.status_code}: {r.text[:300]}")
    except Exception as e:
        return TransportResult(status="failed", error_text=f"Network: {str(e)[:300]}")


async def _transport_baileys(settings: dict, phone: str, body: str, tpl: Optional[dict]) -> TransportResult:
    """Self-hosted webhook — typically pointing at n8n or a Baileys server.
    Expected to accept POST {phone, body, template_key?} → return {ok: true, id?}."""
    url = settings.get("webhook_url")
    secret = settings.get("webhook_secret") or ""
    if not url:
        return TransportResult(status="failed", error_text="webhook_url not configured")

    payload = {"phone": phone, "body": body}
    if tpl and tpl.get("template_key"):
        payload["template_key"] = tpl["template_key"]
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Webhook-Secret"] = secret

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, headers=headers, json=payload)
        if r.status_code in (200, 201, 202):
            try:
                data = r.json()
                if data.get("ok") or data.get("success") or r.status_code == 202:
                    return TransportResult(status="sent",
                        provider_msg_id=str(data.get("id") or data.get("message_id") or ""))
                return TransportResult(status="failed",
                    error_text=f"Webhook returned non-ok: {str(data)[:200]}")
            except Exception:
                return TransportResult(status="sent")  # 200 with no JSON — assume ok
        return TransportResult(status="failed", error_text=f"HTTP {r.status_code}: {r.text[:300]}")
    except Exception as e:
        return TransportResult(status="failed", error_text=f"Network: {str(e)[:300]}")


async def _transport_click2chat(settings: dict, phone: str, body: str, tpl: Optional[dict]) -> TransportResult:
    """Click-to-chat: build a wa.me link and return it. Frontend opens window.
    Status is 'manual_pending' — the actual send is confirmed by the staff
    clicking the link. We optimistically count as sent in the log."""
    import urllib.parse
    encoded = urllib.parse.quote(body)
    return TransportResult(
        status="manual_pending",
        wa_url=f"https://wa.me/{phone}?text={encoded}",
    )


TRANSPORTS = {
    "cloud_api":   _transport_cloud_api,
    "baileys":     _transport_baileys,
    "click2chat":  _transport_click2chat,
}


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────
async def send_message(
    db: AsyncSession,
    clinic_id: str,
    template_key: Optional[str],
    recipient_kind: str,
    recipient_phone: str,
    recipient_name: Optional[str] = None,
    recipient_id: Optional[str] = None,
    variables: Optional[Dict[str, Any]] = None,
    body_override: Optional[str] = None,
    appointment_id: Optional[str] = None,
    payment_id: Optional[str] = None,
    lab_order_id: Optional[str] = None,
    visit_id: Optional[str] = None,
    trigger: str = "manual",
    scheduled_for: Optional[datetime] = None,
    transport_override: Optional[str] = None,
    created_by: Optional[str] = None,
) -> Dict[str, Any]:
    """One call to send a message. Returns dict with status + log_id (+ wa_url for click2chat)."""

    settings = await _load_settings(db, clinic_id)
    transport = transport_override or settings.get("message_transport") or "click2chat"

    # ── Resolve body ─────────────────────────────────────────────────────
    tpl = None
    if template_key:
        tpl = await _load_template(db, clinic_id, template_key)

    if body_override:
        body = _interpolate(body_override, variables or {})
    elif tpl:
        body = _interpolate(tpl["body"], variables or {})
    else:
        return {"status": "failed", "error": f"No template '{template_key}' and no body_override"}

    # ── Normalize phone ──────────────────────────────────────────────────
    phone = _normalize_phone(recipient_phone)
    if not phone:
        log_id = await _log_send(
            db, clinic_id, template_key, recipient_kind, recipient_id,
            recipient_name, recipient_phone or "", body, transport, "failed",
            "manual", "Invalid/empty phone number",
            appointment_id, payment_id, lab_order_id, visit_id,
            scheduled_for, created_by,
        )
        return {"status": "failed", "error": "Invalid phone", "log_id": log_id}

    # ── Queue if scheduled in the future ────────────────────────────────
    if scheduled_for and scheduled_for > datetime.now(timezone.utc):
        log_id = await _log_send(
            db, clinic_id, template_key, recipient_kind, recipient_id,
            recipient_name, phone, body, transport, "queued",
            trigger, None,
            appointment_id, payment_id, lab_order_id, visit_id,
            scheduled_for, created_by,
        )
        return {"status": "queued", "log_id": log_id, "scheduled_for": scheduled_for.isoformat()}

    # ── Dispatch ────────────────────────────────────────────────────────
    fn = TRANSPORTS.get(transport)
    if not fn:
        return {"status": "failed", "error": f"Unknown transport: {transport}"}

    result = await fn(settings, phone, body, tpl)

    # ── Log ─────────────────────────────────────────────────────────────
    log_id = await _log_send(
        db, clinic_id, template_key, recipient_kind, recipient_id,
        recipient_name, phone, body, transport, result.get("status", "failed"),
        trigger, result.get("error_text"),
        appointment_id, payment_id, lab_order_id, visit_id,
        scheduled_for, created_by,
        provider_msg_id=result.get("provider_msg_id"),
    )

    response = {"status": result.get("status"), "log_id": log_id, "transport": transport}
    if result.get("wa_url"):
        response["wa_url"] = result["wa_url"]
    if result.get("error_text"):
        response["error"] = result["error_text"]
    return response


async def _log_send(
    db, clinic_id, template_key, recipient_kind, recipient_id, recipient_name,
    phone, body, transport, status, trigger, error_text,
    appointment_id, payment_id, lab_order_id, visit_id, scheduled_for, created_by,
    provider_msg_id=None,
):
    log_id = str(uuid4())
    sent_at = datetime.now(timezone.utc) if status in ("sent", "manual_pending") else None
    failed_at = datetime.now(timezone.utc) if status == "failed" else None
    await db.execute(sql_text("""
        INSERT INTO message_log
            (id, clinic_id, template_key, recipient_kind, recipient_id, recipient_name,
             recipient_phone, body, transport, status, trigger, error_text,
             appointment_id, payment_id, lab_order_id, visit_id,
             scheduled_for, sent_at, failed_at, provider_msg_id, created_by)
        VALUES
            (:id, :cid, :tk, :rk, :rid, :rn, :rp, :body, :tr, :st, :trg, :err,
             :apt, :pay, :lab, :vis, :sched, :sent, :failed, :pmid, :cb)
    """), {
        "id": log_id, "cid": clinic_id, "tk": template_key, "rk": recipient_kind,
        "rid": recipient_id, "rn": recipient_name, "rp": phone, "body": body,
        "tr": transport, "st": status, "trg": trigger, "err": error_text,
        "apt": appointment_id, "pay": payment_id, "lab": lab_order_id, "vis": visit_id,
        "sched": scheduled_for, "sent": sent_at, "failed": failed_at,
        "pmid": provider_msg_id, "cb": created_by,
    })
    return log_id


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler — picks up queued messages whose scheduled_for has passed
# ─────────────────────────────────────────────────────────────────────────────
async def flush_queued(db: AsyncSession, limit: int = 50) -> Dict[str, int]:
    """Send all queued messages where scheduled_for <= now. Returns counts."""
    rows = (await db.execute(sql_text("""
        SELECT id, clinic_id, template_key, recipient_kind, recipient_id, recipient_name,
               recipient_phone, body, appointment_id, payment_id, lab_order_id, visit_id
        FROM message_log
        WHERE status = 'queued' AND scheduled_for <= NOW()
        ORDER BY scheduled_for
        LIMIT :lim
    """), {"lim": limit})).mappings().all()

    sent, failed = 0, 0
    for row in rows:
        settings = await _load_settings(db, row["clinic_id"])
        transport = settings.get("message_transport") or "click2chat"
        fn = TRANSPORTS.get(transport)
        if not fn:
            await db.execute(sql_text("""
                UPDATE message_log SET status='failed', error_text=:err, failed_at=NOW()
                WHERE id=:id
            """), {"err": f"Unknown transport: {transport}", "id": row["id"]})
            failed += 1
            continue
        result = await fn(settings, row["recipient_phone"], row["body"], None)
        if result.get("status") in ("sent", "manual_pending"):
            await db.execute(sql_text("""
                UPDATE message_log SET status=:st, sent_at=NOW(), provider_msg_id=:pid
                WHERE id=:id
            """), {"st": result["status"], "pid": result.get("provider_msg_id"), "id": row["id"]})
            sent += 1
        else:
            await db.execute(sql_text("""
                UPDATE message_log SET status='failed', error_text=:err, failed_at=NOW()
                WHERE id=:id
            """), {"err": result.get("error_text") or "Unknown failure", "id": row["id"]})
            failed += 1
    return {"sent": sent, "failed": failed, "checked": len(rows)}
