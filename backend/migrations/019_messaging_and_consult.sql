-- ════════════════════════════════════════════════════════════════════════════
-- 019_messaging_and_consult.sql
-- Bundle Q+ — Messaging Engine · Phone Consultation Product · Rating System
--
-- Adds:
--   • clinic_settings        — single-row-per-clinic key/value store (transport
--                              choice, timing windows, template overrides)
--   • message_templates      — editable template library (12 seeded)
--   • message_log            — every send (queued/sent/failed/manual)
--   • patient_ratings        — 1–5 star + comment, ties to visit & credit
--   • patient_credits        — rating-earned credits ledger (+₹100 per rating)
--   • phone_consultations    — ₹100 phone consult product table
--   • appointment_type='phone_consult' allowed
--
-- IDEMPOTENT — safe to re-run.
-- Order: after 018_patient_database.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── clinic_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_settings (
    clinic_id              UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    -- Messaging transport: 'cloud_api' | 'baileys' | 'click2chat'
    message_transport      VARCHAR(20) NOT NULL DEFAULT 'click2chat',
    -- Cloud API (Meta WhatsApp Business)
    cloud_api_token        TEXT,
    cloud_api_phone_id     VARCHAR(60),
    cloud_api_waba_id      VARCHAR(60),
    -- Baileys (self-hosted n8n) or any HTTP webhook
    webhook_url            TEXT,
    webhook_secret         VARCHAR(128),
    -- Reminder timings (per-channel toggles)
    reminder_24h_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_2h_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_30m_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    -- Receipt behavior: 'auto' | 'manual_confirm' | 'daily_batch'
    receipt_mode           VARCHAR(20) NOT NULL DEFAULT 'manual_confirm',
    -- Rating ask timing
    rating_ask_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    rating_ask_hours       INT NOT NULL DEFAULT 24,         -- send T+24h after visit
    rating_retry_days      INT NOT NULL DEFAULT 5,          -- retry T+5d if no response
    rating_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    rating_discount_mode   VARCHAR(20) NOT NULL DEFAULT 'auto_apply',  -- 'auto_apply' | 'coupon' | 'manual'
    -- Razorpay (for phone consult + online payments)
    razorpay_key_id        VARCHAR(80),
    razorpay_key_secret    TEXT,
    razorpay_mode          VARCHAR(10) NOT NULL DEFAULT 'test',  -- 'test' | 'live'
    -- Phone consult product
    phone_consult_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    phone_consult_fee      NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    phone_consult_duration_min INT NOT NULL DEFAULT 10,
    -- Free-form clinic-level prefs (everything else)
    extra_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by             UUID
);

-- Seed default row for every clinic (so settings always exists)
INSERT INTO clinic_settings (clinic_id)
SELECT id FROM clinics WHERE id NOT IN (SELECT clinic_id FROM clinic_settings);

-- ── message_templates ───────────────────────────────────────────────────────
-- Keyed templates. Body supports {variable} interpolation.
CREATE TABLE IF NOT EXISTS message_templates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id    UUID,   -- NULL = global default
    template_key VARCHAR(60) NOT NULL,
    category     VARCHAR(40) NOT NULL,
    label        VARCHAR(120) NOT NULL,
    body         TEXT NOT NULL,
    -- For Cloud API: pre-approved template name + language
    cloud_template_name VARCHAR(80),
    cloud_template_lang VARCHAR(10) DEFAULT 'en',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (clinic_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_msg_tpl_key ON message_templates (template_key, is_active);

-- Seed 14 default templates (clinic_id=NULL means available to all clinics)
INSERT INTO message_templates (clinic_id, template_key, category, label, body) VALUES
  (NULL, 'appointment_confirmation', 'appointment', 'Appointment booked',
   'Hi {patient_name}, your appointment at {clinic_name} is confirmed for {date} at {time}. See you soon! — Dr. {doctor_name}'),
  (NULL, 'reminder_24h', 'appointment', 'Reminder — 24h before',
   'Hi {patient_name}, this is a reminder of your dental appointment tomorrow ({date}) at {time}. Reply YES to confirm, NO to reschedule. — {clinic_name}'),
  (NULL, 'reminder_2h', 'appointment', 'Reminder — 2h before',
   'Hi {patient_name}, your appointment is in 2 hours ({time}). The clinic is at {clinic_address}. See you soon!'),
  (NULL, 'reminder_30m', 'appointment', 'Reminder — 30 min before',
   'Hi {patient_name}, your appointment is in 30 minutes. We''re at {clinic_address}.'),
  (NULL, 'receipt', 'billing', 'Payment receipt',
   'Hi {patient_name}, receipt for your visit on {date}: ₹{amount} ({mode}). Balance: ₹{balance}. Thank you! — {clinic_name}'),
  (NULL, 'rating_ask', 'feedback', 'Ask for rating',
   'Hi {patient_name}, how was your visit at {clinic_name} on {visit_date}? Rate us 1–5 stars here: {rating_link}\n\nLeave a rating and get ₹{discount} off your next visit! 🎁'),
  (NULL, 'rating_retry', 'feedback', 'Rating reminder',
   'Hi {patient_name}, we''d love your feedback on your recent visit! Rate us here for a ₹{discount} credit: {rating_link}'),
  (NULL, 'lab_received', 'lab', 'Lab work received',
   'Hi {patient_name}, your {work_type} is ready! Please book a fitting appointment: {booking_link} or call {clinic_phone}.'),
  (NULL, 'lab_to_vendor', 'lab', 'Lab order to vendor',
   'Hi {vendor_name}, new {work_type} order for patient {patient_initials}, teeth {teeth}, shade {shade}. Expected by {expected_date}. — {clinic_name}'),
  (NULL, 'specialist_assigned', 'specialist', 'Specialist assignment',
   'Hi Dr. {specialist_name}, you''ve been assigned a {appointment_type} case at {clinic_name} on {date} at {time}. Patient: {patient_initials}, {patient_age}{patient_gender}. Chief complaint: {complaint}.'),
  (NULL, 'specialist_to_patient', 'specialist', 'Specialist intro to patient',
   'Hi {patient_name}, Dr. {specialist_name} (specialist in {specialization}) will see you for your appointment on {date} at {time} at {clinic_name}.'),
  (NULL, 'doctor_daily_summary', 'doctor', 'Daily summary to doctor',
   'Dr. {doctor_name}, today: {visits_count} visits · ₹{collected} collected · {pending_count} pay-pending · {tomorrow_count} appointments tomorrow.'),
  (NULL, 'phone_consult_confirmation', 'phone_consult', 'Phone consult booked',
   'Hi {patient_name}, your ₹{fee} phone consultation is confirmed. Dr. {doctor_name} will call you on {phone} within {duration_min} minutes from now. Prescription will be sent via WhatsApp.'),
  (NULL, 'phone_consult_rx', 'phone_consult', 'Phone consult Rx',
   'Hi {patient_name}, here is your prescription from today''s phone consultation with Dr. {doctor_name}:\n\n{rx_text}\n\nDownload PDF: {rx_pdf}\n\nFollow-up: {followup_date}')
ON CONFLICT (clinic_id, template_key) DO NOTHING;

-- ── message_log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL,
    template_key    VARCHAR(60),
    -- Recipient
    recipient_kind  VARCHAR(20) NOT NULL,    -- 'patient' | 'staff' | 'vendor' | 'specialist' | 'other'
    recipient_id    UUID,                    -- patient_id / staff_id / vendor_id (nullable for "other")
    recipient_name  VARCHAR(200),
    recipient_phone VARCHAR(30) NOT NULL,
    -- Content actually sent (after interpolation)
    body            TEXT NOT NULL,
    -- Linking
    appointment_id  UUID,
    payment_id      UUID,
    lab_order_id    UUID,
    visit_id        UUID,
    -- Status flow: queued → sent | failed | manual_pending
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    transport       VARCHAR(20) NOT NULL,    -- 'cloud_api' | 'baileys' | 'click2chat' | 'sms'
    direction       VARCHAR(10) NOT NULL DEFAULT 'out',  -- 'out' | 'in' (for inbound replies)
    -- Trigger origin: 'auto' (scheduled) | 'manual' (button click) | 'webhook' | 'event'
    trigger         VARCHAR(20) NOT NULL DEFAULT 'manual',
    -- Provider response
    provider_msg_id VARCHAR(120),
    error_text      TEXT,
    -- Scheduling
    scheduled_for   TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID
);

CREATE INDEX IF NOT EXISTS idx_msg_log_clinic        ON message_log (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_log_recipient     ON message_log (recipient_kind, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_log_scheduled     ON message_log (status, scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_msg_log_appointment   ON message_log (appointment_id);
CREATE INDEX IF NOT EXISTS idx_msg_log_lab_order     ON message_log (lab_order_id);

-- ── patient_ratings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id       UUID NOT NULL,
    visit_id        UUID,                    -- treatment_sessions.id (nullable)
    appointment_id  UUID,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    asked_at        TIMESTAMPTZ,             -- when we sent the rating_ask
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    credit_applied  BOOLEAN NOT NULL DEFAULT FALSE,
    credit_id       UUID,
    -- Public token (for the rating link that doesn't need auth)
    token           VARCHAR(60) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_ratings_patient ON patient_ratings (patient_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_token   ON patient_ratings (token);

-- ── patient_credits (rating discounts + adjustments) ────────────────────────
CREATE TABLE IF NOT EXISTS patient_credits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id     UUID NOT NULL,
    amount        NUMERIC(10,2) NOT NULL,    -- positive = credit earned, negative = used
    reason        VARCHAR(120) NOT NULL,
    rating_id     UUID,
    applied_to_plan_id     UUID,            -- when used, which plan it discounted
    applied_to_payment_id  UUID,            -- when used, which payment
    is_used       BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at    DATE,                      -- e.g. 90 days from earned
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at       TIMESTAMPTZ,
    notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_credits_patient_unused
    ON patient_credits (patient_id, is_used)
    WHERE is_used = FALSE;

-- ── phone_consultations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_consultations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL,
    patient_id      UUID,                    -- linked when patient row created
    patient_name    VARCHAR(200) NOT NULL,
    patient_phone   VARCHAR(30) NOT NULL,
    patient_age     INT,
    patient_gender  VARCHAR(20),
    complaint       TEXT NOT NULL,
    duration_complaint VARCHAR(60),          -- "3 days", "1 month"…
    -- Payment
    fee_amount      NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    razorpay_order_id  VARCHAR(80),
    razorpay_payment_id VARCHAR(80),
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 'pending' | 'paid' | 'failed' | 'refunded'
    paid_at         TIMESTAMPTZ,
    -- Lifecycle
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    -- queued → doctor_calling → completed | missed | refunded
    doctor_id       UUID,
    called_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    -- Rx (after completion)
    rx_id           UUID,                    -- prescriptions.id
    rx_sent_at      TIMESTAMPTZ,
    -- Notes
    consult_notes   TEXT,
    -- Created
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source          VARCHAR(40) NOT NULL DEFAULT 'public_website'
);

CREATE INDEX IF NOT EXISTS idx_phone_consult_clinic ON phone_consultations (clinic_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_consult_payment ON phone_consultations (payment_status, created_at DESC);

-- ── Add phone_consult to appointment_type allowed values ────────────────────
-- (No constraint currently — appointment_type is free-form VARCHAR. Just noting.)

-- ── Tiny helper view: outbound message counts (frontend dashboard widget) ───
CREATE OR REPLACE VIEW message_log_stats_v AS
SELECT
    clinic_id,
    COUNT(*) FILTER (WHERE status = 'sent' AND direction = 'out')               AS total_sent,
    COUNT(*) FILTER (WHERE status = 'sent' AND direction = 'out' AND trigger = 'auto')   AS auto_sent,
    COUNT(*) FILTER (WHERE status = 'sent' AND direction = 'out' AND trigger = 'manual') AS manual_sent,
    COUNT(*) FILTER (WHERE status = 'failed')                                   AS failed,
    COUNT(*) FILTER (WHERE status = 'queued')                                   AS queued,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)                     AS today_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')      AS week_count
FROM message_log
GROUP BY clinic_id;

DO $$
BEGIN
    RAISE NOTICE 'Migration 019 complete: clinic_settings + message_templates (14 seeded) + message_log + ratings + credits + phone_consultations';
END$$;
