-- ═══════════════════════════════════════════════════════════════════════════
-- Siya Dental Care — Sprint 9-15 Consolidated Migration
-- Apply AFTER 003_sprint_8_14.sql and 004_diagnoses_linkage.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 9: Nurse's Appointment Diary + Call Tracking
-- ───────────────────────────────────────────────────────────────────────────

-- Extend appointments with contact tracking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_status VARCHAR(30) DEFAULT 'not_contacted';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_contacted_by UUID REFERENCES staff(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_apt_contact_status ON appointments(contact_status);
CREATE INDEX IF NOT EXISTS idx_apt_clinic_date ON appointments(clinic_id, scheduled_date);

-- Call log table
CREATE TABLE IF NOT EXISTS appointment_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    called_by_staff_id UUID REFERENCES staff(id),
    call_status VARCHAR(30) NOT NULL,
    -- (confirmed/no_answer/will_call_later/reschedule_requested/declined/busy)
    call_time TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    callback_scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_apt ON appointment_call_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_call_status ON appointment_call_logs(call_status);

-- Message log (WhatsApp/SMS manual sends)
CREATE TABLE IF NOT EXISTS appointment_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    sent_by_staff_id UUID REFERENCES staff(id),
    channel VARCHAR(20) NOT NULL,  -- whatsapp/sms/email/manual_call
    template_used VARCHAR(50),
    message_body TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'manually_sent',
    -- manually_sent / auto_sent / delivered / read / failed
    patient_reply TEXT
);
CREATE INDEX IF NOT EXISTS idx_msg_apt ON appointment_message_logs(appointment_id);

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 10: "To Be Appointed" List + Walk-in Management
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS to_be_appointed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    original_appointment_id UUID REFERENCES appointments(id),
    reason TEXT,
    proposed_service TEXT,
    added_by_staff_id UUID REFERENCES staff(id),
    added_at TIMESTAMP DEFAULT NOW(),
    followup_scheduled_for TIMESTAMP,
    last_followup_at TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_appointment_id UUID REFERENCES appointments(id),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_tba_patient ON to_be_appointed(patient_id);
CREATE INDEX IF NOT EXISTS idx_tba_clinic_resolved ON to_be_appointed(clinic_id, is_resolved);

-- Walk-in patient tracking
CREATE TABLE IF NOT EXISTS walk_in_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    registered_by_staff_id UUID REFERENCES staff(id),
    registered_at TIMESTAMP DEFAULT NOW(),
    visit_reason TEXT,
    doctor_id UUID REFERENCES staff(id),
    doctor_notified BOOLEAN DEFAULT FALSE,
    doctor_notified_at TIMESTAMP,
    outcome VARCHAR(30) DEFAULT 'pending',
    -- pending / seen_by_doctor / left_no_treatment / rescheduled / moved_to_tba / cancelled
    outcome_recorded_at TIMESTAMP,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_walkin_clinic_date ON walk_in_patients(clinic_id, registered_at);
CREATE INDEX IF NOT EXISTS idx_walkin_outcome ON walk_in_patients(outcome);

-- Auto-cleanup tracking for new patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_new_no_treatment BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS manually_flagged_to_keep BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_patient_auto_delete ON patients(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 11: Real-Time Doctor-Nurse Coordination
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    notification_type VARCHAR(50) NOT NULL,
    -- morning_schedule / walk_in_arrived / payment_to_collect / payment_received
    -- treatment_finalized / new_appointment / reminder_due
    recipient_staff_id UUID REFERENCES staff(id),
    recipient_role VARCHAR(30),  -- doctor / nurse / receptionist / admin
    sender_staff_id UUID REFERENCES staff(id),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal',  -- low/normal/high/urgent
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    related_patient_id UUID,
    related_appointment_id UUID,
    related_session_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON clinic_notifications(recipient_staff_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_clinic_type ON clinic_notifications(clinic_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notif_created ON clinic_notifications(created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 12: Treatment + Payment Handoff Flow
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS treatment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES staff(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    appointment_id UUID REFERENCES appointments(id),
    sitting_id UUID REFERENCES treatment_sittings(id),
    plan_id UUID REFERENCES treatment_plans(id),
    walk_in_id UUID REFERENCES walk_in_patients(id),
    started_at TIMESTAMP DEFAULT NOW(),
    finalized_at TIMESTAMP,
    procedures_done JSONB DEFAULT '[]',
    treatment_notes TEXT,
    next_step TEXT,
    amount_payable DECIMAL(10,2) DEFAULT 0,
    prescription_id UUID REFERENCES prescriptions(id),
    used_tooth_chart BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'in_progress',
    -- in_progress / awaiting_payment / partial_payment / completed
    nurse_notified_at TIMESTAMP,
    payment_collected_at TIMESTAMP,
    payment_collected_by UUID REFERENCES staff(id),
    amount_collected DECIMAL(10,2) DEFAULT 0,
    balance_remaining DECIMAL(10,2) DEFAULT 0,
    payment_components JSONB DEFAULT '[]',
    -- [{mode: 'cash', amount: 2000}, {mode: 'upi', amount: 1500, txn_id: '...'}]
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_patient ON treatment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_status ON treatment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_clinic_date ON treatment_sessions(clinic_id, started_at);

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 13: Advanced Reports (mostly views — no new tables needed)
-- ───────────────────────────────────────────────────────────────────────────

-- Daily revenue summary view (per clinic per day per mode)
CREATE OR REPLACE VIEW v_daily_revenue_by_mode AS
SELECT 
    p.clinic_id,
    DATE(p.created_at) AS revenue_date,
    p.payment_mode,
    COUNT(*) AS transaction_count,
    SUM(p.amount) AS total_amount
FROM payment_transactions p
WHERE p.amount > 0
GROUP BY p.clinic_id, DATE(p.created_at), p.payment_mode;

-- Monthly revenue summary
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT 
    clinic_id,
    DATE_TRUNC('month', created_at) AS revenue_month,
    payment_mode,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
FROM payment_transactions
WHERE amount > 0
GROUP BY clinic_id, DATE_TRUNC('month', created_at), payment_mode;

-- Outstanding balance view (patients with unpaid amounts)
CREATE OR REPLACE VIEW v_outstanding_balances AS
SELECT 
    tp.patient_id,
    p.name AS patient_name,
    p.phone AS patient_phone,
    tp.clinic_id,
    tp.id AS plan_id,
    tp.plan_name,
    tp.estimated_cost,
    COALESCE(tp.total_paid, 0) AS total_paid,
    tp.estimated_cost - COALESCE(tp.total_paid, 0) AS balance,
    EXTRACT(DAY FROM NOW() - tp.updated_at)::INT AS days_since_update,
    tp.updated_at AS last_activity
FROM treatment_plans tp
JOIN patients p ON p.id = tp.patient_id
WHERE tp.estimated_cost > COALESCE(tp.total_paid, 0);

-- Doctor performance view
CREATE OR REPLACE VIEW v_doctor_performance AS
SELECT 
    ts.doctor_id,
    s.name AS doctor_name,
    ts.clinic_id,
    DATE_TRUNC('day', ts.started_at) AS work_day,
    COUNT(DISTINCT ts.id) AS sessions_count,
    COUNT(DISTINCT ts.patient_id) AS unique_patients,
    SUM(ts.amount_collected) AS revenue_generated
FROM treatment_sessions ts
JOIN staff s ON s.id = ts.doctor_id
WHERE ts.status = 'completed'
GROUP BY ts.doctor_id, s.name, ts.clinic_id, DATE_TRUNC('day', ts.started_at);

-- Procedure revenue (top procedures by revenue/count)
CREATE OR REPLACE VIEW v_procedure_revenue AS
SELECT 
    tpi.procedure_id,
    pc.name AS procedure_name,
    pc.category,
    tp.clinic_id,
    COUNT(*) AS times_used,
    AVG(tpi.unit_price) AS avg_price,
    SUM(tpi.total_price) AS total_revenue
FROM treatment_plan_items tpi
JOIN procedure_catalog pc ON pc.id = tpi.procedure_id
JOIN treatment_plans tp ON tp.id = tpi.plan_id
GROUP BY tpi.procedure_id, pc.name, pc.category, tp.clinic_id;

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 14: Tooth Chart (Optional Feature)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tooth_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number INT NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
    condition VARCHAR(50),
    -- decay / fracture / missing / treated / filling / crown / rct_done / extracted / healthy
    surface VARCHAR(30),
    -- occlusal / mesial / distal / buccal / lingual / incisal / multiple
    severity VARCHAR(20),  -- mild / moderate / severe
    notes TEXT,
    recorded_by UUID REFERENCES staff(id),
    recorded_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(patient_id, tooth_number, is_active) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_tooth_patient ON tooth_conditions(patient_id);

CREATE TABLE IF NOT EXISTS tooth_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number INT NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    sitting_id UUID REFERENCES treatment_sittings(id),
    treatment_type VARCHAR(50),  -- rct / crown / filling / extraction / scaling / implant
    surface VARCHAR(30),
    status VARCHAR(20) DEFAULT 'planned',  -- planned / in_progress / completed
    notes TEXT,
    planned_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES staff(id)
);
CREATE INDEX IF NOT EXISTS idx_tooth_tx_patient ON tooth_treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_tx_plan ON tooth_treatments(treatment_plan_id);

-- ───────────────────────────────────────────────────────────────────────────
-- SPRINT 15: RVG Image Management
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patient_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id),
    image_url TEXT NOT NULL,  -- relative path or S3 URL
    thumbnail_url TEXT,
    image_type VARCHAR(30) NOT NULL,
    -- rvg / opg / cbct / clinical_photo / before / after / lab_image / other
    title TEXT,
    description TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(50),
    width INT,
    height INT,
    linked_tooth_number INT,
    linked_plan_id UUID REFERENCES treatment_plans(id),
    linked_sitting_id UUID REFERENCES treatment_sittings(id),
    linked_session_id UUID REFERENCES treatment_sessions(id),
    captured_date DATE,
    uploaded_by UUID REFERENCES staff(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_image_patient ON patient_images(patient_id);
CREATE INDEX IF NOT EXISTS idx_image_tooth ON patient_images(linked_tooth_number);
CREATE INDEX IF NOT EXISTS idx_image_type ON patient_images(image_type);

CREATE TABLE IF NOT EXISTS image_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES patient_images(id) ON DELETE CASCADE,
    annotation_type VARCHAR(30) NOT NULL,  -- text / arrow / circle / freehand / measurement
    annotation_data JSONB NOT NULL,
    -- {x, y, text} or {x1, y1, x2, y2, color} etc.
    added_by UUID REFERENCES staff(id),
    added_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_annot_image ON image_annotations(image_id);

-- ───────────────────────────────────────────────────────────────────────────
-- Done
-- ───────────────────────────────────────────────────────────────────────────
COMMIT;

-- Verification queries (run after migration to confirm)
-- SELECT COUNT(*) FROM appointment_call_logs;
-- SELECT COUNT(*) FROM to_be_appointed;
-- SELECT COUNT(*) FROM walk_in_patients;
-- SELECT COUNT(*) FROM clinic_notifications;
-- SELECT COUNT(*) FROM treatment_sessions;
-- SELECT COUNT(*) FROM tooth_conditions;
-- SELECT COUNT(*) FROM tooth_treatments;
-- SELECT COUNT(*) FROM patient_images;
-- SELECT COUNT(*) FROM image_annotations;
