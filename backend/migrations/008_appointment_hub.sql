-- Migration 008: Appointment Hub final workflow (apply after 007)
-- 1) CRITICAL FIX: legacy appointments_status_check rejected workflow values
--    ('ready','in_treatment','payment_pending','scheduled','completed'), so
--    hub status writes were failing. Constraint rebuilt with full vocabulary.
-- 2) Appointment Types catalog (Consultation, RCT, Crown Trial, ...) + column.
-- 3) Call Diary statuses on appointments.contact_status.
-- 4) Helpful indexes.

BEGIN;

-- ── 1. Status constraint rebuild ─────────────────────────────────
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (
    status::text = ANY (ARRAY[
        'pending','scheduled','confirmed','arrived','ready',
        'in_progress','in_treatment','payment_pending',
        'completed','done','rescheduled','rejected','no_show','cancelled'
    ]::text[])
);

-- ── 2. Appointment types ─────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(60);

CREATE TABLE IF NOT EXISTS appointment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(60) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 100,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO appointment_types (type_name, sort_order, is_default) VALUES
    ('Consultation', 1, TRUE), ('Tooth Pain', 2, TRUE), ('Cleaning', 3, TRUE),
    ('RCT', 4, TRUE), ('Crown Trial', 5, TRUE), ('Crown Cementation', 6, TRUE),
    ('Extraction', 7, TRUE), ('Implant Review', 8, TRUE), ('Dressing', 9, TRUE),
    ('Orthodontic Review', 10, TRUE), ('Filling', 11, TRUE), ('Other', 99, TRUE)
ON CONFLICT (type_name) DO NOTHING;

-- ── 3. Call Diary status vocabulary on contact_status ────────────
-- pending_call | confirmed | no_answer | call_back_later | cancelled_by_patient | rescheduled
UPDATE appointments SET contact_status = 'pending_call'
WHERE contact_status IS NULL OR contact_status = 'not_contacted';
ALTER TABLE appointments ALTER COLUMN contact_status SET DEFAULT 'pending_call';

-- ── 4. Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_apt_contact_status ON appointments(contact_status);
CREATE INDEX IF NOT EXISTS idx_apt_arrived_at ON appointments(arrived_at);
CREATE INDEX IF NOT EXISTS idx_apt_type ON appointments(appointment_type);

COMMIT;
