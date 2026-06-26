from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
from typing import Any, Optional
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import get_current_staff
from app.services.messaging import send_message

router = APIRouter(tags=["Bundle V"])

UPLOAD_DIR = os.getenv("SIYA_UPLOAD_DIR", "uploads")
for folder in ("media", "site", "lab"):
    os.makedirs(os.path.join(UPLOAD_DIR, folder), exist_ok=True)


def _require_roles(staff: dict, *roles: str) -> None:
    if staff.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")


def _decode_data_url(data_url: str) -> tuple[bytes, str]:
    if not data_url.startswith("data:") or "," not in data_url:
        raise HTTPException(400, "Expected a data URL")
    header, payload = data_url.split(",", 1)
    mime = header.split(";")[0].split(":", 1)[1] if ":" in header else "image/png"
    ext = (mime.split("/")[-1] or "png").lower()
    if ext == "jpeg":
        ext = "jpg"
    try:
        return base64.b64decode(payload), ext
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(400, "Invalid image payload") from exc


def _save_data_url(data_url: str, subdir: str) -> str:
    if data_url.startswith("/uploads/"):
        return data_url
    content, ext = _decode_data_url(data_url)
    filename = f"{uuid4().hex}.{ext}"
    rel_path = f"{subdir}/{filename}"
    full_path = os.path.join(UPLOAD_DIR, rel_path.replace("/", os.sep))
    with open(full_path, "wb") as handle:
        handle.write(content)
    return f"/uploads/{rel_path}"


def _parse_jsonish(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


class MediaUploadRequest(BaseModel):
    patient_id: UUID
    tooth_number: Optional[str] = None
    media_type: str = "general"
    image_data_url: str
    caption: Optional[str] = None
    treatment_plan_id: Optional[UUID] = None
    is_shared_with_patient: bool = False


class MediaUpdateRequest(BaseModel):
    caption: Optional[str] = None
    is_shared_with_patient: Optional[bool] = None


class BotConfigRequest(BaseModel):
    n8n_webhook_url: Optional[str] = None
    n8n_enabled: Optional[bool] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    whatsapp_bot_enabled: Optional[bool] = None
    whatsapp_intent_routing: Optional[list[dict[str, Any]]] = None


class WhatsAppInboundRequest(BaseModel):
    from_phone: str
    message_text: str
    clinic_id: UUID


def _meta_message_text(message: dict[str, Any]) -> Optional[str]:
    """Extract user-visible text from Meta message event variants."""
    message_type = message.get("type")
    if message_type == "text":
        return (message.get("text") or {}).get("body")
    if message_type == "button":
        button = message.get("button") or {}
        return button.get("text") or button.get("payload")
    if message_type == "interactive":
        interactive = message.get("interactive") or {}
        reply = interactive.get("button_reply") or interactive.get("list_reply") or {}
        return reply.get("title") or reply.get("id")
    return None


class SectionUpdateRequest(BaseModel):
    content: dict[str, Any]
    display_order: Optional[int] = None
    is_visible: Optional[bool] = None


class SectionCreateRequest(BaseModel):
    page_id: UUID
    section_type: str
    content: dict[str, Any]
    display_order: int = 99


class LabClosureRequest(BaseModel):
    before_image_data_url: Optional[str] = None
    after_image_data_url: Optional[str] = None
    closure_notes: Optional[str] = None


async def _log_bot_event(
    db: AsyncSession,
    *,
    clinic_id: str,
    channel: str,
    direction: str,
    patient_id: Optional[str],
    from_id: Optional[str],
    intent: Optional[str],
    message_text: Optional[str],
    response_text: Optional[str],
    status: str = "processed",
) -> None:
    await db.execute(
        sql_text(
            """
            INSERT INTO bot_event_log
                (id, clinic_id, channel, direction, patient_id, from_id, intent, message_text, response_text, status)
            VALUES
                (:id, :clinic_id, :channel, :direction, :patient_id, :from_id, :intent, :message_text, :response_text, :status)
            """
        ),
        {
            "id": str(uuid4()),
            "clinic_id": clinic_id,
            "channel": channel,
            "direction": direction,
            "patient_id": patient_id,
            "from_id": from_id,
            "intent": intent,
            "message_text": message_text,
            "response_text": response_text,
            "status": status,
        },
    )


@router.post("/media")
async def upload_media(
    clinic_id: UUID,
    body: MediaUploadRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    image_url = _save_data_url(body.image_data_url, "media")
    media_id = str(uuid4())
    await db.execute(
        sql_text(
            """
            INSERT INTO media_gallery
                (id, clinic_id, patient_id, tooth_number, media_type, image_url, caption,
                 treatment_plan_id, is_shared_with_patient, taken_by)
            VALUES
                (:id, :clinic_id, :patient_id, :tooth_number, :media_type, :image_url, :caption,
                 :treatment_plan_id, :is_shared_with_patient, :taken_by)
            """
        ),
        {
            "id": media_id,
            "clinic_id": str(clinic_id),
            "patient_id": str(body.patient_id),
            "tooth_number": body.tooth_number,
            "media_type": body.media_type,
            "image_url": image_url,
            "caption": body.caption,
            "treatment_plan_id": str(body.treatment_plan_id) if body.treatment_plan_id else None,
            "is_shared_with_patient": body.is_shared_with_patient,
            "taken_by": str(staff["staff_id"]),
        },
    )
    return {"media_id": media_id, "image_url": image_url}


@router.get("/patients/{patient_id}/media")
async def list_patient_media(
    patient_id: UUID,
    tooth_number: Optional[str] = None,
    media_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    query = """
        SELECT id, clinic_id, patient_id, tooth_number, media_type, image_url, thumbnail_url, caption,
               taken_at, taken_by, treatment_plan_id, is_shared_with_patient, file_size_bytes, created_at
        FROM media_gallery
        WHERE patient_id = :patient_id
    """
    params: dict[str, Any] = {"patient_id": str(patient_id)}
    if tooth_number:
        query += " AND tooth_number = :tooth_number"
        params["tooth_number"] = tooth_number
    if media_type:
        query += " AND media_type = :media_type"
        params["media_type"] = media_type
    query += " ORDER BY taken_at DESC, created_at DESC"
    rows = (await db.execute(sql_text(query), params)).mappings().all()
    return {"media": [dict(row) for row in rows]}


@router.patch("/media/{media_id}")
async def update_media(
    media_id: UUID,
    body: MediaUpdateRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        return {"updated": False}
    sets = [f"{key} = :{key}" for key in fields]
    await db.execute(sql_text(f"UPDATE media_gallery SET {', '.join(sets)} WHERE id = :id"), {"id": str(media_id), **fields})
    return {"updated": True}


@router.delete("/media/{media_id}")
async def delete_media(media_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin")
    await db.execute(sql_text("DELETE FROM media_gallery WHERE id = :id"), {"id": str(media_id)})
    return {"deleted": True}


@router.get("/settings/bot")
async def get_bot_config(clinic_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    row = (
        await db.execute(sql_text("SELECT * FROM bot_config WHERE clinic_id = :clinic_id"), {"clinic_id": str(clinic_id)})
    ).mappings().one_or_none()
    if not row:
        await db.execute(
            sql_text("INSERT INTO bot_config (clinic_id) VALUES (:clinic_id) ON CONFLICT (clinic_id) DO NOTHING"),
            {"clinic_id": str(clinic_id)},
        )
        row = (
            await db.execute(sql_text("SELECT * FROM bot_config WHERE clinic_id = :clinic_id"), {"clinic_id": str(clinic_id)})
        ).mappings().one()
    result = dict(row)
    if result.get("telegram_bot_token"):
        result["telegram_bot_token"] = "***" + result["telegram_bot_token"][-4:]
    result["whatsapp_intent_routing"] = _parse_jsonish(result.get("whatsapp_intent_routing")) or []
    return result


@router.put("/settings/bot")
async def update_bot_config(
    clinic_id: UUID,
    body: BotConfigRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin")
    fields = body.model_dump(exclude_unset=True, exclude_none=True)
    if not fields:
        return {"updated": False}
    await db.execute(
        sql_text("INSERT INTO bot_config (clinic_id) VALUES (:clinic_id) ON CONFLICT (clinic_id) DO NOTHING"),
        {"clinic_id": str(clinic_id)},
    )
    sets = []
    params: dict[str, Any] = {"clinic_id": str(clinic_id)}
    for key, value in fields.items():
        if key == "whatsapp_intent_routing":
            sets.append(f"{key} = CAST(:{key} AS JSONB)")
            params[key] = json.dumps(value)
        else:
            sets.append(f"{key} = :{key}")
            params[key] = value
    sets.append("updated_at = NOW()")
    await db.execute(sql_text(f"UPDATE bot_config SET {', '.join(sets)} WHERE clinic_id = :clinic_id"), params)
    return {"updated": True}


@router.post("/bot/whatsapp/inbound")
async def whatsapp_inbound(body: WhatsAppInboundRequest, db: AsyncSession = Depends(get_db)):
    cfg = (
        await db.execute(
            sql_text(
                """
                SELECT whatsapp_bot_enabled, whatsapp_intent_routing, n8n_enabled, n8n_webhook_url
                FROM bot_config
                WHERE clinic_id = :clinic_id
                """
            ),
            {"clinic_id": str(body.clinic_id)},
        )
    ).mappings().one_or_none()
    if not cfg or not cfg["whatsapp_bot_enabled"]:
        return {"response": None, "reason": "bot_disabled"}

    routing = _parse_jsonish(cfg.get("whatsapp_intent_routing")) or []
    msg_lower = body.message_text.lower()
    intent = None
    label = None
    for rule in routing:
        keyword = (rule.get("keyword") or "").lower()
        if keyword and keyword in msg_lower:
            intent = rule.get("action")
            label = rule.get("label")
            break

    normalized_phone = "".join(ch for ch in body.from_phone if ch.isdigit())[-10:]
    patient = (
        await db.execute(
            sql_text(
                """
                SELECT id, name, phone
                FROM patients
                WHERE preferred_clinic_id = :clinic_id
                  AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '%' || :phone
                LIMIT 1
                """
            ),
            {"clinic_id": str(body.clinic_id), "phone": normalized_phone},
        )
    ).mappings().one_or_none()

    if not patient:
        response = "Hi! We couldn't find your number. Reply BOOK to schedule, or contact reception."
    elif not intent:
        choices = [f"• Reply *{rule.get('keyword','')}* — {rule.get('label','')}" for rule in routing]
        response = f"Hi {patient['name']}! How can I help?\n\n" + "\n".join(choices)
    elif intent == "list_appointments":
        appointments = (
            await db.execute(
                sql_text(
                    """
                    SELECT COALESCE(confirmed_date, requested_date) AS appointment_date,
                           COALESCE(confirmed_time, requested_time) AS appointment_time,
                           COALESCE(workflow_status, status) AS status,
                           contact_status,
                           CASE
                             WHEN contact_status = 'pending_call' THEN 'awaiting_confirmation'
                             WHEN contact_status = 'rescheduled'  THEN 'rescheduled'
                             WHEN workflow_status IN ('arrived','ready','in_treatment','payment_pending') THEN 'in_clinic'
                             ELSE 'confirmed'
                           END AS bucket
                    FROM appointments
                    WHERE patient_id = :patient_id
                      AND COALESCE(confirmed_date, requested_date) >= CURRENT_DATE
                      AND COALESCE(workflow_status, status) NOT IN ('cancelled','completed','done')
                    ORDER BY COALESCE(confirmed_date, requested_date), COALESCE(confirmed_time, requested_time)
                    LIMIT 5
                    """
                ),
                {"patient_id": str(patient["id"])},
            )
        ).mappings().all()
        if not appointments:
            response = "No upcoming appointments. Reply BOOK to schedule."
        else:
            lines = []
            for row in appointments:
                date_str = row['appointment_date'].strftime("%d %b") if row['appointment_date'] else "TBD"
                time_str = row['appointment_time'].strftime("%H:%M") if row['appointment_time'] else ""
                tag = {
                    "awaiting_confirmation": "⏳ Awaiting confirmation",
                    "rescheduled":           "🔄 Rescheduled",
                    "in_clinic":             "🏥 In clinic",
                    "confirmed":             "✅ Confirmed",
                }.get(row['bucket'], row['status'])
                lines.append(f"• {date_str} {time_str} — {tag}")
            response = f"Hi {patient['name']}, upcoming:\n" + "\n".join(lines)
    elif intent == "show_balance":
        balance = (
            await db.execute(
                sql_text(
                    """
                    SELECT COALESCE(SUM(COALESCE(balance, 0)), 0) AS pending
                    FROM treatment_plans
                    WHERE patient_id = :patient_id
                      AND COALESCE(status, '') <> 'cancelled'
                    """
                ),
                {"patient_id": str(patient["id"])},
            )
        ).mappings().one()
        response = f"Hi {patient['name']}, pending balance: ₹{float(balance['pending'] or 0):,.0f}"
    elif intent == "show_history":
        history = (
            await db.execute(
                sql_text(
                    """
                    SELECT created_at, complaint
                    FROM prescriptions
                    WHERE patient_id = :patient_id
                    ORDER BY created_at DESC
                    LIMIT 5
                    """
                ),
                {"patient_id": str(patient["id"])},
            )
        ).mappings().all()
        if not history:
            response = "No past visits on record."
        else:
            lines = [f"• {row['created_at'].date()} — {(row['complaint'] or 'Consultation')[:50]}" for row in history]
            response = "Recent visits:\n" + "\n".join(lines)
    elif intent in ("request_appointment", "request_cancel"):
        response = "Got it — our reception will contact you shortly to confirm."
    else:
        response = f"Sorry, I didn't catch that. {label or 'Reply HELP to see options.'}"

    await _log_bot_event(
        db,
        clinic_id=str(body.clinic_id),
        channel="whatsapp",
        direction="in",
        patient_id=str(patient["id"]) if patient else None,
        from_id=body.from_phone,
        intent=intent,
        message_text=body.message_text,
        response_text=response,
    )

    if cfg.get("n8n_enabled") and cfg.get("n8n_webhook_url"):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    cfg["n8n_webhook_url"],
                    json={
                        "channel": "whatsapp",
                        "clinic_id": str(body.clinic_id),
                        "patient_id": str(patient["id"]) if patient else None,
                        "from_phone": body.from_phone,
                        "message_text": body.message_text,
                        "intent": intent,
                        "response_text": response,
                    },
                )
        except httpx.HTTPError:
            pass

    return {"response": response, "intent": intent}


@router.get("/webhooks/meta/whatsapp", response_class=PlainTextResponse)
async def verify_meta_whatsapp_webhook(
    mode: Optional[str] = Query(default=None, alias="hub.mode"),
    token: Optional[str] = Query(default=None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(default=None, alias="hub.challenge"),
):
    """Complete Meta's one-time webhook callback verification."""
    if mode is None and token is None and challenge is None:
        return "Meta WhatsApp webhook is ready"
    settings = get_settings()
    if mode == "subscribe" and token and hmac.compare_digest(token, settings.WA_VERIFY_TOKEN):
        return challenge or ""
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/webhooks/meta/whatsapp")
async def receive_meta_whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Translate Meta Cloud API events into the existing Siya bot workflow."""
    raw_body = await request.body()
    settings = get_settings()
    signature = request.headers.get("x-hub-signature-256", "")
    if settings.WA_APP_SECRET:
        expected = "sha256=" + hmac.new(
            settings.WA_APP_SECRET.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()
        if not signature or not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    if payload.get("object") != "whatsapp_business_account":
        return {"received": True, "processed": 0}

    processed = 0
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            if change.get("field") != "messages":
                continue
            value = change.get("value") or {}
            phone_number_id = str((value.get("metadata") or {}).get("phone_number_id") or "")
            if not phone_number_id:
                continue

            clinic = (
                await db.execute(
                    sql_text(
                        """
                        SELECT cs.clinic_id
                        FROM clinic_settings cs
                        JOIN bot_config bc ON bc.clinic_id = cs.clinic_id
                        WHERE cs.cloud_api_phone_id = :phone_number_id
                          AND bc.whatsapp_bot_enabled = TRUE
                        LIMIT 1
                        """
                    ),
                    {"phone_number_id": phone_number_id},
                )
            ).mappings().one_or_none()

            if not clinic and settings.WA_PHONE_NUMBER_ID == phone_number_id:
                candidates = (
                    await db.execute(
                        sql_text(
                            """
                            SELECT clinic_id
                            FROM bot_config
                            WHERE whatsapp_bot_enabled = TRUE
                            LIMIT 2
                            """
                        )
                    )
                ).mappings().all()
                if len(candidates) == 1:
                    clinic = candidates[0]
            if not clinic:
                continue

            for message in value.get("messages") or []:
                sender = str(message.get("from") or "")
                message_text = _meta_message_text(message)
                if not sender or not message_text:
                    continue

                result = await whatsapp_inbound(
                    WhatsAppInboundRequest(
                        from_phone=sender,
                        message_text=message_text,
                        clinic_id=clinic["clinic_id"],
                    ),
                    db,
                )
                response_text = result.get("response")
                if response_text:
                    await send_message(
                        db=db,
                        clinic_id=str(clinic["clinic_id"]),
                        template_key=None,
                        recipient_kind="patient",
                        recipient_phone=sender,
                        body_override=response_text,
                        trigger="auto",
                        transport_override="cloud_api",
                    )
                processed += 1

    return {"received": True, "processed": processed}


@router.get("/bot/events")
async def list_bot_events(
    clinic_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    rows = (
        await db.execute(
            sql_text(
                """
                SELECT bel.*, p.name AS patient_name
                FROM bot_event_log bel
                LEFT JOIN patients p ON p.id = bel.patient_id
                WHERE bel.clinic_id = :clinic_id
                ORDER BY bel.created_at DESC
                LIMIT :limit
                """
            ),
            {"clinic_id": str(clinic_id), "limit": limit},
        )
    ).mappings().all()
    return {"events": [dict(row) for row in rows]}


@router.post("/bot/telegram/test")
async def test_telegram(clinic_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin")
    cfg = (
        await db.execute(
            sql_text(
                """
                SELECT telegram_bot_token, telegram_chat_id
                FROM bot_config
                WHERE clinic_id = :clinic_id
                """
            ),
            {"clinic_id": str(clinic_id)},
        )
    ).mappings().one_or_none()
    if not cfg or not cfg["telegram_bot_token"] or not cfg["telegram_chat_id"]:
        raise HTTPException(400, "Telegram not configured")
    url = f"https://api.telegram.org/bot{cfg['telegram_bot_token']}/sendMessage"
    payload = {"chat_id": cfg["telegram_chat_id"], "text": "🦷 Siya Dental Care test message — Telegram bot connected!"}
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(url, json=payload)
    await _log_bot_event(
        db,
        clinic_id=str(clinic_id),
        channel="telegram",
        direction="out",
        patient_id=None,
        from_id=str(cfg["telegram_chat_id"]),
        intent="telegram_test",
        message_text=payload["text"],
        response_text=response.text[:500],
        status="sent" if response.is_success else "failed",
    )
    return {"status": response.status_code, "ok": response.is_success}


@router.get("/cms/pages")
async def list_pages(clinic_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            sql_text("SELECT * FROM clinic_pages WHERE clinic_id = :clinic_id ORDER BY display_order, slug"),
            {"clinic_id": str(clinic_id)},
        )
    ).mappings().all()
    return {"pages": [dict(row) for row in rows]}


@router.get("/cms/pages/{slug}")
async def get_page(clinic_id: UUID, slug: str, db: AsyncSession = Depends(get_db)):
    page = (
        await db.execute(
            sql_text("SELECT * FROM clinic_pages WHERE clinic_id = :clinic_id AND slug = :slug"),
            {"clinic_id": str(clinic_id), "slug": slug},
        )
    ).mappings().one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")
    sections_rows = (
        await db.execute(
            sql_text(
                """
                SELECT *
                FROM clinic_page_sections
                WHERE page_id = :page_id AND is_visible = TRUE
                ORDER BY display_order, created_at
                """
            ),
            {"page_id": str(page["id"])},
        )
    ).mappings().all()
    sections = []
    for row in sections_rows:
        item = dict(row)
        item["content"] = _parse_jsonish(item.get("content")) or {}
        sections.append(item)
    return {"page": dict(page), "sections": sections}


@router.patch("/cms/sections/{section_id}")
async def update_section(
    section_id: UUID,
    body: SectionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin")
    params: dict[str, Any] = {"section_id": str(section_id), "content": json.dumps(body.content)}
    sets = ["content = CAST(:content AS JSONB)"]
    if body.display_order is not None:
        sets.append("display_order = :display_order")
        params["display_order"] = body.display_order
    if body.is_visible is not None:
        sets.append("is_visible = :is_visible")
        params["is_visible"] = body.is_visible
    await db.execute(sql_text(f"UPDATE clinic_page_sections SET {', '.join(sets)} WHERE id = :section_id"), params)
    return {"updated": True}


@router.post("/cms/sections")
async def create_section(
    body: SectionCreateRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin")
    section_id = str(uuid4())
    await db.execute(
        sql_text(
            """
            INSERT INTO clinic_page_sections (id, page_id, section_type, display_order, content)
            VALUES (:id, :page_id, :section_type, :display_order, CAST(:content AS JSONB))
            """
        ),
        {
            "id": section_id,
            "page_id": str(body.page_id),
            "section_type": body.section_type,
            "display_order": body.display_order,
            "content": json.dumps(body.content),
        },
    )
    return {"section_id": section_id}


@router.delete("/cms/sections/{section_id}")
async def delete_section(section_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin")
    await db.execute(sql_text("DELETE FROM clinic_page_sections WHERE id = :id"), {"id": str(section_id)})
    return {"deleted": True}


@router.post("/cms/upload-image")
async def cms_upload_image(image_data_url: str = Form(...), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin")
    return {"url": _save_data_url(image_data_url, "site")}


@router.get("/medicines/search")
async def search_medicines(
    clinic_id: Optional[UUID] = None,
    q: str = "",
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    params: dict[str, Any] = {"limit": limit}
    if q.strip():
        params["q"] = q.strip()
        query = """
            SELECT id, name, default_strength AS common_dose, default_frequency AS common_frequency,
                   default_duration AS common_duration, usage_count,
                   similarity(lower(name), lower(:q)) AS score
            FROM medicine_catalog
            WHERE is_active = TRUE
              AND (lower(name) % lower(:q) OR lower(name) LIKE '%' || lower(:q) || '%')
            ORDER BY score DESC, usage_count DESC NULLS LAST, name
            LIMIT :limit
        """
    else:
        query = """
            SELECT id, name, default_strength AS common_dose, default_frequency AS common_frequency,
                   default_duration AS common_duration, usage_count
            FROM medicine_catalog
            WHERE is_active = TRUE
            ORDER BY usage_count DESC NULLS LAST, name
            LIMIT :limit
        """
    rows = (await db.execute(sql_text(query), params)).mappings().all()
    return {"medicines": [dict(row) for row in rows], "clinic_id": str(clinic_id) if clinic_id else None}


@router.post("/medicines/{medicine_id}/increment-usage")
async def increment_medicine_usage(medicine_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin", "nurse")
    await db.execute(
        sql_text(
            """
            UPDATE medicine_catalog
            SET usage_count = COALESCE(usage_count, 0) + 1,
                last_used_at = NOW(),
                updated_at = NOW()
            WHERE id = :medicine_id
            """
        ),
        {"medicine_id": str(medicine_id)},
    )
    return {"updated": True}


@router.post("/lab-orders/{order_id}/close")
async def close_lab_order(
    order_id: UUID,
    body: LabClosureRequest,
    db: AsyncSession = Depends(get_db),
    staff=Depends(get_current_staff),
):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    before_image_url = _save_data_url(body.before_image_data_url, "lab") if body.before_image_data_url else None
    after_image_url = _save_data_url(body.after_image_data_url, "lab") if body.after_image_data_url else None
    await db.execute(
        sql_text(
            """
            UPDATE lab_orders
            SET status = 'completed',
                before_image_url = COALESCE(:before_image_url, before_image_url),
                after_image_url = COALESCE(:after_image_url, after_image_url),
                closure_notes = :closure_notes,
                closed_by = :closed_by,
                closed_at = NOW(),
                updated_at = NOW()
            WHERE id = :order_id
            """
        ),
        {
            "order_id": str(order_id),
            "before_image_url": before_image_url,
            "after_image_url": after_image_url,
            "closure_notes": body.closure_notes,
            "closed_by": str(staff["staff_id"]),
        },
    )
    return {"closed": True, "before_image_url": before_image_url, "after_image_url": after_image_url}


@router.get("/lab-orders/{order_id}/closure")
async def get_lab_closure(order_id: UUID, db: AsyncSession = Depends(get_db), staff=Depends(get_current_staff)):
    _require_roles(staff, "doctor", "admin", "nurse", "receptionist")
    row = (
        await db.execute(
            sql_text(
                """
                SELECT before_image_url, after_image_url, closure_notes, closed_at, closed_by
                FROM lab_orders
                WHERE id = :order_id
                """
            ),
            {"order_id": str(order_id)},
        )
    ).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Order not found")
    return dict(row)
