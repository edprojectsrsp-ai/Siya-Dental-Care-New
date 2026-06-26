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

-- ============ MIGRATION 020: Bundle R ============
-- ════════════════════════════════════════════════════════════════════════════
-- 020_bundle_r_overhaul.sql — Siya Dental Care Bundle R
--
-- Adds:
--   • 22 new message templates (extended WhatsApp matrix)
--   • specialist_rate_tiers (doctor decides rate per treatment, 2 tiers)
--   • case_status timeline for specialist + lab
--   • tooth_observations (richer per-tooth notes with severity)
--   • appointment_constraints (booking blockers + soft prompts)
--   • communication_counter_v (live dashboard counts)
--   • follow_ups (separated from appointments, dedicated review reminders)
--
-- IDEMPOTENT — safe to re-run.
-- Order: after 019_messaging_and_consult.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Specialist rate tiers (doctor decides per-treatment rate per patient) ──
CREATE TABLE IF NOT EXISTS specialist_rate_tiers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id        UUID NOT NULL,
    specialist_id    UUID NOT NULL,
    tier_name        VARCHAR(40) NOT NULL,       -- 'standard' | 'complex'
    treatment_key    VARCHAR(80),                 -- procedure type (NULL = applies to all)
    rate_amount      NUMERIC(10,2) NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (specialist_id, tier_name, treatment_key)
);

CREATE INDEX IF NOT EXISTS idx_spec_tiers_specialist
    ON specialist_rate_tiers (specialist_id, is_active);

-- Add tier reference to specialist_earnings (if table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='specialist_earnings') THEN
        BEGIN
            ALTER TABLE specialist_earnings ADD COLUMN IF NOT EXISTS rate_tier VARCHAR(40);
            ALTER TABLE specialist_earnings ADD COLUMN IF NOT EXISTS treatment_key VARCHAR(80);
            ALTER TABLE specialist_earnings ADD COLUMN IF NOT EXISTS case_status VARCHAR(20) DEFAULT 'completed';
            -- 'assigned' | 'in_progress' | 'completed' | 'cancelled'
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
    END IF;
END $$;

-- ── Tooth observations (richer than simple notes — supports hover UX) ──
CREATE TABLE IF NOT EXISTS tooth_observations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number  INT NOT NULL,            -- FDI notation (11–48)
    surface       VARCHAR(20),             -- 'mesial' | 'distal' | 'occlusal' | 'buccal' | 'lingual' | NULL
    observation   TEXT NOT NULL,           -- doctor's note
    severity      VARCHAR(20) NOT NULL DEFAULT 'info',
    -- 'info' | 'watch' | 'mild' | 'moderate' | 'severe' | 'urgent'
    status        VARCHAR(20) NOT NULL DEFAULT 'open',
    -- 'open' | 'planned' | 'in_progress' | 'completed' | 'resolved'
    suggested_treatment VARCHAR(120),       -- e.g. "RCT", "Filling - Composite"
    observed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observed_by   UUID,                     -- staff_id
    resolved_at   TIMESTAMPTZ,
    resolved_by   UUID,
    visit_id      UUID,                     -- treatment_sessions.id
    notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_tooth_obs_patient
    ON tooth_observations (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_tooth_obs_tooth
    ON tooth_observations (patient_id, tooth_number, status);

-- ── Follow-ups (separated from appointments) ──
CREATE TABLE IF NOT EXISTS follow_ups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id       UUID NOT NULL,
    related_visit_id UUID,                  -- treatment_sessions.id
    related_appointment_id UUID,
    follow_up_date  DATE NOT NULL,
    purpose         VARCHAR(200) NOT NULL,  -- "Crown fitting", "Suture removal", "Review healing"
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- 'scheduled' | 'reminded' | 'completed' | 'missed' | 'cancelled'
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_followups_clinic_date
    ON follow_ups (clinic_id, follow_up_date, status);
CREATE INDEX IF NOT EXISTS idx_followups_patient
    ON follow_ups (patient_id, follow_up_date DESC);

-- ── 22 extended message templates (the WhatsApp matrix) ──
INSERT INTO message_templates (clinic_id, template_key, category, label, body) VALUES
  -- PATIENT — already had: appointment_confirmation, reminder_24h, reminder_2h, reminder_30m, receipt, rating_ask, rating_retry, phone_consult_*
  (NULL, 'appointment_rescheduled', 'appointment', 'Appointment rescheduled',
   'Hi {patient_name}, your appointment at {clinic_name} has been rescheduled from {old_date} {old_time} to *{new_date} at {new_time}*. — Dr. {doctor_name}'),
  (NULL, 'appointment_cancelled', 'appointment', 'Appointment cancelled',
   'Hi {patient_name}, your appointment at {clinic_name} on {date} at {time} has been cancelled. Please call {clinic_phone} to rebook. We''re sorry for any inconvenience.'),
  (NULL, 'arrival_confirmation', 'appointment', 'Arrival confirmed',
   'Hi {patient_name}, we''ve marked you as arrived at {clinic_name}. Estimated wait: {wait_minutes} min. Dr. {doctor_name} will see you shortly.'),
  (NULL, 'thank_you_visit', 'appointment', 'Thank you (post-visit)',
   'Thank you {patient_name} for visiting {clinic_name} today! Take care and reach out anytime at {clinic_phone}. — Dr. {doctor_name}'),
  (NULL, 'reward_earned', 'feedback', 'Reward earned',
   'Hi {patient_name}, your ₹{amount} reward credit is now active! Use it on your next visit at {clinic_name}. Valid until {expires_at}.'),
  -- FOLLOW-UPS
  (NULL, 'followup_scheduled', 'followup', 'Follow-up scheduled',
   'Hi {patient_name}, your follow-up at {clinic_name} is scheduled for *{followup_date}*. Purpose: {purpose}. We''ll send a reminder closer to the date.'),
  (NULL, 'followup_reminder_3d', 'followup', 'Follow-up reminder (3 days)',
   'Hi {patient_name}, friendly reminder: your follow-up at {clinic_name} is in 3 days on {followup_date}. Purpose: {purpose}.'),
  (NULL, 'followup_reminder_1d', 'followup', 'Follow-up reminder (1 day)',
   'Hi {patient_name}, your follow-up is *tomorrow* ({followup_date}) at {clinic_name}. Reply YES to confirm.'),
  (NULL, 'followup_due_today', 'followup', 'Follow-up today',
   'Hi {patient_name}, your follow-up at {clinic_name} is *today*. Purpose: {purpose}. Please come by {time}.'),
  (NULL, 'recall_reminder', 'followup', 'Recall reminder (missed)',
   'Hi {patient_name}, we noticed you missed your scheduled follow-up. Your dental health matters! Please call {clinic_phone} to reschedule.'),
  -- LAB
  (NULL, 'lab_order_placed', 'lab', 'Lab order placed',
   'Hi {vendor_name}, new {work_type} order from {clinic_name}. Patient: {patient_code}, Teeth: {teeth}, Shade: {shade}. Due: *{due_date}*. — Dr. {doctor_name}'),
  (NULL, 'lab_order_modified', 'lab', 'Lab order modified',
   'Hi {vendor_name}, order #{order_id} ({work_type}, patient {patient_code}) has been modified. New requirements: {changes}. Updated due: {due_date}.'),
  (NULL, 'lab_due_tomorrow', 'lab', 'Lab due tomorrow',
   'Hi {vendor_name}, reminder: {work_type} for patient {patient_code} (order #{order_id}) is due *tomorrow* ({due_date}). Please confirm.'),
  (NULL, 'lab_due_today', 'lab', 'Lab due today',
   'Hi {vendor_name}, {work_type} for {patient_code} (order #{order_id}) is *due today*. Please deliver by EOD.'),
  (NULL, 'lab_overdue', 'lab', 'Lab overdue',
   'Hi {vendor_name}, {work_type} for {patient_code} (order #{order_id}) was due on {due_date} — *now {days_overdue} day(s) overdue*. Please update.'),
  (NULL, 'lab_trial_appointment', 'lab', 'Lab trial fitting',
   'Hi {vendor_name}, trial fitting for patient {patient_code} ({work_type}) scheduled at {clinic_name} on *{trial_date}* at {trial_time}.'),
  (NULL, 'lab_case_complete', 'lab', 'Lab case completed',
   'Thank you {vendor_name}! {work_type} for {patient_code} (order #{order_id}) has been received and fitted. Invoice will follow.'),
  -- SPECIALIST
  (NULL, 'specialist_morning_digest', 'specialist', 'Specialist morning digest',
   'Good morning Dr. {specialist_name}! Today''s cases at {clinic_name}:\n\n{case_list}\n\nTotal: {case_count} patient(s). Have a great day!'),
  (NULL, 'specialist_reminder_1d', 'specialist', 'Specialist reminder (1 day)',
   'Hi Dr. {specialist_name}, you have {case_count} case(s) tomorrow at {clinic_name}. Patients: {patient_list}. Please confirm attendance.'),
  (NULL, 'specialist_case_completed', 'specialist', 'Case completed (to doctor)',
   'Dr. {doctor_name}, Dr. {specialist_name} completed case for *{patient_name}* on {date}. Treatment: {treatment_summary}. Rate tier: {rate_tier}.'),
  (NULL, 'specialist_thank_you', 'specialist', 'Specialist thank you (EOD)',
   'Thank you Dr. {specialist_name} for {case_count} case(s) today at {clinic_name}. Total earning: ₹{total_amount}. Settlement will follow as scheduled.'),
  -- DOCTOR / NURSE DIGESTS
  (NULL, 'doctor_daily_digest', 'doctor', 'Doctor morning digest',
   'Good morning Dr. {doctor_name}! Today at {clinic_name}:\n• Appointments: {appointment_count}\n• New patients: {new_patient_count}\n• Follow-ups: {followup_count}\n• Specialist cases: {specialist_count}\n• Pending payments: ₹{pending_amount}\n• Lab deliveries due: {lab_due_count}'),
  (NULL, 'nurse_daily_digest', 'nurse', 'Nurse morning digest',
   'Good morning! Today at {clinic_name}:\n• Patients booked: {appointment_count}\n• New: {new_patient_count}\n• Follow-ups: {followup_count}\n• Specialist visits: {specialist_count}\n• Lab deliveries today: {lab_due_count}\n• Pending payments to collect: ₹{pending_amount}'),
  (NULL, 'high_priority_alert', 'doctor', 'High-priority patient alert',
   '⚠️ Dr. {doctor_name}, high-priority patient: *{patient_name}*. Reason: {reason}. Please review.'),
  (NULL, 'lab_delay_alert', 'doctor', 'Lab delay alert',
   '🔴 Dr. {doctor_name}, lab delay: {work_type} for *{patient_name}* (vendor: {vendor_name}) is {days_overdue} day(s) overdue. Original due: {due_date}.'),
  (NULL, 'failed_reminder_alert', 'nurse', 'Failed reminder alert',
   '⚠️ Reminder to {patient_name} ({patient_phone}) failed: {error}. Please follow up manually.'),
  (NULL, 'treatment_approval_required', 'doctor', 'Treatment needs approval',
   'Dr. {doctor_name}, treatment plan for *{patient_name}* (₹{amount}, {procedure_count} procedures) needs your approval.')
ON CONFLICT (clinic_id, template_key) DO NOTHING;

-- ── Communication counter view (live dashboard) ──
CREATE OR REPLACE VIEW communication_counter_v AS
SELECT
    clinic_id,
    -- Appointment family
    COUNT(*) FILTER (WHERE template_key = 'appointment_confirmation' AND status = 'sent') AS confirmations_sent,
    COUNT(*) FILTER (WHERE template_key LIKE 'reminder_%' AND status = 'sent')             AS reminders_sent,
    COUNT(*) FILTER (WHERE template_key LIKE 'followup_%' AND status = 'sent')             AS followup_reminders_sent,
    -- Billing
    COUNT(*) FILTER (WHERE template_key = 'receipt' AND status = 'sent')                   AS receipts_sent,
    -- Ratings/Rewards
    COUNT(*) FILTER (WHERE template_key = 'rating_ask' AND status = 'sent')                AS rating_requests_sent,
    COUNT(*) FILTER (WHERE template_key = 'rating_retry' AND status = 'sent')              AS rating_reminders_sent,
    COUNT(*) FILTER (WHERE template_key = 'reward_earned' AND status = 'sent')             AS rewards_generated,
    -- Lab
    COUNT(*) FILTER (WHERE template_key LIKE 'lab_order%' AND status = 'sent')             AS lab_orders_sent,
    COUNT(*) FILTER (WHERE template_key IN ('lab_due_tomorrow','lab_due_today','lab_overdue') AND status = 'sent') AS lab_reminders_sent,
    -- Specialist
    COUNT(*) FILTER (WHERE template_key LIKE 'specialist_%' AND status = 'sent')           AS specialist_messages_sent,
    -- Digests
    COUNT(*) FILTER (WHERE template_key = 'doctor_daily_digest' AND status = 'sent')       AS doctor_digest_sent,
    COUNT(*) FILTER (WHERE template_key = 'nurse_daily_digest' AND status = 'sent')        AS nurse_digest_sent,
    -- Manual / Bulk
    COUNT(*) FILTER (WHERE trigger = 'manual' AND status = 'sent')                         AS manual_messages_sent,
    -- Failures
    COUNT(*) FILTER (WHERE status = 'failed')                                              AS failed_messages,
    COUNT(*) FILTER (WHERE status = 'manual_pending')                                      AS click_to_chat_pending,
    -- Time windows
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)                                AS today_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')                 AS week_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')                AS month_count
FROM message_log
GROUP BY clinic_id;

-- ── Redeemed rewards count (from patient_credits) ──
CREATE OR REPLACE VIEW rewards_redeemed_v AS
SELECT clinic_id, COUNT(*) AS rewards_redeemed
FROM patient_credits
WHERE is_used = TRUE
GROUP BY clinic_id;

-- ── Appointment soft constraints (pre-booking blockers) ──
-- This is a view; the API calls compute it dynamically. Used by the booking
-- form to show "this patient has a pending lab delivery" etc.
CREATE OR REPLACE VIEW patient_booking_constraints_v AS
SELECT
    p.id AS patient_id,
    p.preferred_clinic_id AS clinic_id,
    -- Pending lab orders for this patient
    (SELECT COUNT(*) FROM lab_orders lo
     WHERE lo.patient_id = p.id AND lo.status IN ('placed','in_progress','sent_to_lab')) AS pending_lab_orders,
    -- Lab orders received but not yet fitted (i.e. ready for fitting appt)
    (SELECT COUNT(*) FROM lab_orders lo
     WHERE lo.patient_id = p.id AND lo.status = 'received') AS lab_ready_for_fitting,
    -- Overdue lab orders
    (SELECT COUNT(*) FROM lab_orders lo
     WHERE lo.patient_id = p.id AND lo.status IN ('placed','in_progress','sent_to_lab')
       AND lo.expected_date < CURRENT_DATE) AS lab_overdue,
    -- Outstanding balance
    (SELECT COALESCE(SUM(final_payable) - SUM(total_paid), 0) FROM treatment_plans
     WHERE patient_id = p.id) AS outstanding_balance,
    -- Open tooth observations (severity >= moderate)
    (SELECT COUNT(*) FROM tooth_observations o
     WHERE o.patient_id = p.id AND o.status = 'open'
       AND o.severity IN ('moderate','severe','urgent')) AS urgent_observations
FROM patients p;

DO $$
BEGIN
    RAISE NOTICE 'Migration 020 complete: 22 templates, specialist tiers, tooth observations, follow-ups, counters';
END $$;

-- ============ MIGRATION 021: Bundle S ============
-- ════════════════════════════════════════════════════════════════════════════
-- 021_bundle_s_settings_expansion.sql — Siya Dental Care Bundle S
--
-- Adds:
--   • clinic_info_ext         — logo, GST, license, registration, branding
--   • business_hours          — per-day open/close times + breaks
--   • clinic_holidays         — closed dates with reason
--   • service_catalog         — procedures with default duration + price
--   • fee_schedule_overrides  — seasonal/category-based price changes
--   • kanban_columns          — configurable kanban board columns per clinic
--   • illness_library         — diagnosis vocabulary (extends Sprint 14)
--   • n8n_config              — frontend-selectable hosting config
--
-- IDEMPOTENT. Apply after migration 020.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Clinic info extensions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_info_ext (
    clinic_id            UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    logo_url             TEXT,
    letterhead_url       TEXT,
    gst_number           VARCHAR(40),
    license_number       VARCHAR(60),
    establishment_year   INT,
    tagline              VARCHAR(200),
    -- Doctor credentials (printed on Rx)
    primary_doctor_name  VARCHAR(120),
    primary_doctor_qual  VARCHAR(200),    -- "BDS, OD-28456"
    primary_doctor_reg   VARCHAR(60),
    -- Branding
    accent_color         VARCHAR(20) DEFAULT '#0E7C7B',
    secondary_color      VARCHAR(20) DEFAULT '#0A5C5B',
    -- Prescription preferences
    rx_language          VARCHAR(10) DEFAULT 'en',   -- 'en' | 'en+hi' | 'en+or'
    rx_format            VARCHAR(10) DEFAULT 'A4',   -- 'A4' | 'A5'
    rx_show_qr           BOOLEAN DEFAULT TRUE,
    rx_footer_text       TEXT,
    -- Public site
    public_about         TEXT,
    public_emergency_msg TEXT,
    -- Misc
    socials              JSONB DEFAULT '{}'::jsonb,   -- {instagram, facebook, ...}
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_by           UUID
);

-- Seed default row per clinic
INSERT INTO clinic_info_ext (clinic_id)
SELECT id FROM clinics
WHERE id NOT IN (SELECT clinic_id FROM clinic_info_ext);

-- ── Business hours (per-day per-clinic) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS business_hours (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    weekday       INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0=Mon, 6=Sun
    is_closed     BOOLEAN DEFAULT FALSE,
    open_time     TIME,
    close_time    TIME,
    break_start   TIME,
    break_end     TIME,
    UNIQUE (clinic_id, weekday)
);

-- Seed Mon-Sat 9-7 with 2-3 break, Sun closed
INSERT INTO business_hours (clinic_id, weekday, is_closed, open_time, close_time, break_start, break_end)
SELECT c.id, wd, FALSE, '09:00', '19:00', '14:00', '15:00'
FROM clinics c, generate_series(0, 5) wd
WHERE NOT EXISTS (
    SELECT 1 FROM business_hours bh WHERE bh.clinic_id = c.id AND bh.weekday = wd
);
INSERT INTO business_hours (clinic_id, weekday, is_closed)
SELECT c.id, 6, TRUE FROM clinics c
WHERE NOT EXISTS (
    SELECT 1 FROM business_hours bh WHERE bh.clinic_id = c.id AND bh.weekday = 6
);

-- ── Holidays ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_holidays (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    reason      VARCHAR(200),
    is_recurring BOOLEAN DEFAULT FALSE,
    UNIQUE (clinic_id, holiday_date)
);

-- ── Service catalog (procedures with default duration + price) ────────────
CREATE TABLE IF NOT EXISTS service_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    category        VARCHAR(60) NOT NULL,
    -- 'consultation' | 'restorative' | 'endodontic' | 'periodontal' |
    -- 'oral_surgery' | 'orthodontic' | 'prosthodontic' | 'pediatric' |
    -- 'cosmetic' | 'preventive' | 'diagnostic'
    name            VARCHAR(120) NOT NULL,
    code            VARCHAR(40),       -- optional ADA/internal code
    default_duration_min INT DEFAULT 30,
    default_price   NUMERIC(10,2),
    description     TEXT,
    requires_lab    BOOLEAN DEFAULT FALSE,
    requires_specialist BOOLEAN DEFAULT FALSE,
    typical_sittings INT DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (clinic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_cat_clinic ON service_catalog (clinic_id, category, is_active);

-- Seed common services
INSERT INTO service_catalog (clinic_id, category, name, default_duration_min, default_price, typical_sittings, requires_lab)
SELECT c.id, s.cat, s.name, s.dur, s.price, s.sittings, s.lab FROM clinics c, (VALUES
    ('consultation',   'New consultation',       30, 500,    1, FALSE),
    ('consultation',   'Follow-up consultation', 15, 200,    1, FALSE),
    ('diagnostic',     'IOPA X-ray',              5, 200,    1, FALSE),
    ('diagnostic',     'OPG',                    10, 600,    1, FALSE),
    ('diagnostic',     'CBCT scan',              15, 3500,   1, FALSE),
    ('preventive',     'Scaling & polishing',    30, 1500,   1, FALSE),
    ('preventive',     'Fluoride application',   15, 800,    1, FALSE),
    ('restorative',    'Composite filling — small',  30, 1200,  1, FALSE),
    ('restorative',    'Composite filling — large',  45, 2000,  1, FALSE),
    ('restorative',    'GIC filling',                30, 800,   1, FALSE),
    ('endodontic',     'RCT — Anterior',         60, 4500,   2, FALSE),
    ('endodontic',     'RCT — Premolar',         75, 5500,   2, FALSE),
    ('endodontic',     'RCT — Molar',            90, 6500,   2, FALSE),
    ('endodontic',     'RCT re-treatment',      120, 8500,   3, FALSE),
    ('oral_surgery',   'Extraction — simple',    20, 1500,   1, FALSE),
    ('oral_surgery',   'Extraction — surgical',  60, 4500,   1, FALSE),
    ('oral_surgery',   'Wisdom tooth extraction',90, 7500,   1, FALSE),
    ('prosthodontic',  'PFM Crown',              60, 6500,   3, TRUE),
    ('prosthodontic',  'Zirconia Crown',         60, 12000,  3, TRUE),
    ('prosthodontic',  'Complete Denture',      120, 18000,  4, TRUE),
    ('prosthodontic',  'Partial Denture',        90, 9500,   3, TRUE),
    ('prosthodontic',  'Implant — single',      120, 35000,  4, TRUE),
    ('cosmetic',       'Veneer (per tooth)',     60, 8500,   2, TRUE),
    ('cosmetic',       'Teeth whitening',        90, 6500,   1, FALSE),
    ('orthodontic',    'Ortho consult + records',60, 2500,   1, FALSE),
    ('orthodontic',    'Metal braces (full course)', 30, 35000, 18, FALSE),
    ('orthodontic',    'Clear aligners',         30, 75000,  12, TRUE),
    ('pediatric',      'Pediatric exam',         20, 500,    1, FALSE),
    ('pediatric',      'Pulpectomy (milk tooth)',45, 2500,   1, FALSE),
    ('periodontal',    'Curettage (per quadrant)', 30, 2500, 4, FALSE),
    ('periodontal',    'Flap surgery (per quadrant)', 60, 6500, 4, FALSE)
) AS s(cat, name, dur, price, sittings, lab)
ON CONFLICT (clinic_id, name) DO NOTHING;

-- ── Fee schedule overrides (seasonal/promo prices) ────────────────────────
CREATE TABLE IF NOT EXISTS fee_schedule_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    service_id      UUID REFERENCES service_catalog(id) ON DELETE CASCADE,
    category        VARCHAR(60),    -- override at category level
    label           VARCHAR(120) NOT NULL,
    override_price  NUMERIC(10,2),
    discount_percent NUMERIC(5,2),
    valid_from      DATE,
    valid_until     DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_override_active
    ON fee_schedule_overrides (clinic_id, is_active, valid_from, valid_until);

-- ── Kanban columns (configurable per clinic) ──────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_columns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    label           VARCHAR(60) NOT NULL,
    plan_status     VARCHAR(40) NOT NULL,
    -- maps to treatment_plans.status
    column_order    INT NOT NULL,
    color           VARCHAR(20) DEFAULT '#3B82F6',
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (clinic_id, plan_status)
);

-- Seed default columns
INSERT INTO kanban_columns (clinic_id, label, plan_status, column_order, color)
SELECT c.id, lbl, status, ord, color FROM clinics c, (VALUES
    ('💡 Proposed',     'proposed',     1, '#94A3B8'),
    ('📋 Planned',      'planned',      2, '#3B82F6'),
    ('🦷 In Progress',  'in_progress',  3, '#F59E0B'),
    ('✓ Completed',     'completed',    4, '#10B981')
) AS k(lbl, status, ord, color)
ON CONFLICT (clinic_id, plan_status) DO NOTHING;

-- ── Illness/diagnosis library ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS illness_library (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    icd_code        VARCHAR(20),
    category        VARCHAR(60),
    -- 'caries' | 'pulpal' | 'periodontal' | 'gingival' | 'occlusal' |
    -- 'developmental' | 'trauma' | 'oral_lesion' | 'systemic' | 'other'
    severity_default VARCHAR(20),  -- maps to tooth_observations.severity
    suggested_treatment_default VARCHAR(120),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (clinic_id, name)
);

-- Seed common diagnoses (clinic_id = NULL = global)
INSERT INTO illness_library (clinic_id, name, category, severity_default, suggested_treatment_default) VALUES
    (NULL, 'Dental caries (Class I)',        'caries',        'mild',     'Composite filling'),
    (NULL, 'Dental caries (Class II)',       'caries',        'moderate', 'Composite filling'),
    (NULL, 'Dental caries (Class III/IV)',   'caries',        'moderate', 'Aesthetic composite'),
    (NULL, 'Dental caries (Class V)',        'caries',        'mild',     'GIC filling'),
    (NULL, 'Pulpitis — reversible',          'pulpal',        'moderate', 'Sedative dressing'),
    (NULL, 'Pulpitis — irreversible',        'pulpal',        'severe',   'RCT'),
    (NULL, 'Periapical abscess',             'pulpal',        'urgent',   'RCT + drainage'),
    (NULL, 'Chronic apical periodontitis',   'pulpal',        'severe',   'RCT'),
    (NULL, 'Gingivitis',                     'gingival',      'mild',     'Scaling + OHI'),
    (NULL, 'Chronic periodontitis',          'periodontal',   'moderate', 'Scaling + root planing'),
    (NULL, 'Aggressive periodontitis',       'periodontal',   'severe',   'Flap surgery'),
    (NULL, 'Bruxism',                        'occlusal',      'watch',    'Night guard'),
    (NULL, 'Attrition',                      'occlusal',      'watch',    'Occlusal adjustment'),
    (NULL, 'Abrasion',                       'occlusal',      'mild',     'Restoration'),
    (NULL, 'Tooth fracture — enamel',        'trauma',        'mild',     'Composite repair'),
    (NULL, 'Tooth fracture — dentin',        'trauma',        'moderate', 'Composite + monitoring'),
    (NULL, 'Tooth fracture — pulpal',        'trauma',        'urgent',   'RCT or extraction'),
    (NULL, 'Impacted wisdom tooth',          'developmental', 'watch',    'Surgical extraction'),
    (NULL, 'Hypoplasia',                     'developmental', 'info',     'Aesthetic restoration'),
    (NULL, 'Aphthous ulcer',                 'oral_lesion',   'mild',     'Topical anaesthetic + reassurance'),
    (NULL, 'Oral candidiasis',               'oral_lesion',   'moderate', 'Antifungal'),
    (NULL, 'Leukoplakia',                    'oral_lesion',   'severe',   'Biopsy required')
ON CONFLICT (clinic_id, name) DO NOTHING;

-- ── n8n hosting config (frontend-selectable) ──────────────────────────────
-- Stored as JSONB in clinic_settings.extra_json — but we add a dedicated column too
DO $$ BEGIN
    BEGIN
        ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS n8n_hosting_kind VARCHAR(30) DEFAULT 'self_hosted';
        -- 'n8n_cloud' | 'render_hosted' | 'self_hosted' | 'inprocess'
        ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS n8n_webhook_base TEXT;
        ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS n8n_dashboard_url TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Ensure treatment_plans.status accepts the kanban statuses
DO $$ BEGIN
    BEGIN
        ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS kanban_position INT DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Migration 021 complete: clinic_info_ext, business_hours, holidays, service_catalog (31 seeded), fee overrides, kanban columns, illness library (22 seeded), n8n config';
END $$;

-- ============ MIGRATION 022: Bundle T ============
-- ============================================================================
-- Migration 022: Bundle T — AR Preview Settings + Treatment Card Enhancements
-- ============================================================================
-- Safe to re-run: all CREATE TABLE use IF NOT EXISTS

-- AR Smile Preview configuration
CREATE TABLE IF NOT EXISTS ar_preview_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banuba_token TEXT,
    enabled_effects TEXT[] DEFAULT ARRAY['whitening'],
    default_whitening_intensity INTEGER DEFAULT 60,
    braces_style VARCHAR(20) DEFAULT 'metal',      -- metal, ceramic, lingual
    veneer_shade VARCHAR(20) DEFAULT 'natural',     -- natural, hollywood, bright
    show_alignment_guide BOOLEAN DEFAULT TRUE,
    custom_branding_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add priority column to treatment_plan_items if not exists
DO $$ BEGIN
    ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'routine';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add lab_order_id linkage to treatment_plan_items if not exists
DO $$ BEGIN
    ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS lab_order_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Insert default AR settings row
INSERT INTO ar_preview_settings (id, enabled_effects, default_whitening_intensity)
VALUES (gen_random_uuid(), ARRAY['whitening'], 60)
ON CONFLICT DO NOTHING;
