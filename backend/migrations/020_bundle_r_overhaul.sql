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
