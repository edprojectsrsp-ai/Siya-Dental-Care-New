-- Migration 015: Lab Module + Specialist Workflow (12 Jun 2026)
-- All additions are NULLABLE / ON CONFLICT DO NOTHING. No destructive changes.
-- Run AFTER 014. Re-runnable.
BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- PART A — SPECIALIST WORKFLOW
-- ════════════════════════════════════════════════════════════════════

-- Extend staff role constraint to allow "specialist"
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role::text = ANY (ARRAY['doctor','specialist','nurse','receptionist','admin']::text[]));

-- Specialist-specific fields on staff (NULL for non-specialists)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialization VARCHAR(80);          -- "Endodontist", "Orthodontist", "Periodontist"
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;   -- true = visiting specialist (not on payroll)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS default_visit_fee NUMERIC(10,2);     -- the rate the senior doc usually pays per case (optional default)

-- Appointment assignment to specialist (separate from primary doctor_id)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist_id UUID REFERENCES staff(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist_assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist_assigned_by UUID REFERENCES staff(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist_session_status VARCHAR(20) DEFAULT NULL;
  -- NULL = no specialist · 'pending' (assigned, waiting) · 'in_session' · 'closed' (specialist done, doctor notified)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist_closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_apt_specialist ON appointments(specialist_id, scheduled_date)
  WHERE specialist_id IS NOT NULL;

-- Specialist earnings ledger (manual entries by senior doctor)
CREATE TABLE IF NOT EXISTS specialist_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES staff(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  earned_on DATE DEFAULT CURRENT_DATE,
  -- Settlement tracking
  is_settled BOOLEAN DEFAULT FALSE,
  settled_on DATE,
  settled_amount NUMERIC(10,2),
  settled_payment_mode VARCHAR(20),                 -- cash | upi | bank
  settled_reference VARCHAR(80),                    -- UPI ref / cheque no
  settled_notes TEXT,
  settled_by UUID REFERENCES staff(id),
  -- Audit
  recorded_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spec_earn_specialist ON specialist_earnings(specialist_id, earned_on DESC);
CREATE INDEX IF NOT EXISTS idx_spec_earn_settled ON specialist_earnings(is_settled, specialist_id);

-- Notification log for specialist workflow events
-- (used to track WhatsApp notifications sent to specialist + senior doc; no auto-send yet, just log)
CREATE TABLE IF NOT EXISTS specialist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES staff(id),
  recipient_role VARCHAR(20),                       -- specialist | senior_doctor | nurse | reception
  event_type VARCHAR(40),                           -- assigned | patient_arrived | session_closed
  channel VARCHAR(20) DEFAULT 'manual',             -- whatsapp_link | sms_link | manual
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID REFERENCES staff(id)
);

-- ════════════════════════════════════════════════════════════════════
-- PART B — LAB MODULE
-- ════════════════════════════════════════════════════════════════════

-- Lab vendors directory
CREATE TABLE IF NOT EXISTS lab_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  whatsapp_number VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  gst VARCHAR(20),
  specialities JSONB DEFAULT '[]'::jsonb,           -- e.g. ["Crown", "RPD", "Implant Abutment"]
  rating NUMERIC(2,1) DEFAULT 0,                    -- 0.0 - 5.0
  is_preferred BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  clinic_id UUID REFERENCES clinics(id),            -- optional — vendor scoped to clinic; NULL = global
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_vendors_active ON lab_vendors(is_active, name);

-- Lab work types catalog (reusable across vendors)
CREATE TABLE IF NOT EXISTS lab_work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,                -- "Crown", "RPD", "Implant Abutment"
  category VARCHAR(50),                             -- "Prosthetic", "Restorative", "Orthodontic"
  typical_days INTEGER DEFAULT 7,                   -- expected turnaround
  typical_cost NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab orders — one per work request
CREATE TABLE IF NOT EXISTS lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL,                                 -- human-readable order #
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,    -- the visit when this was created
  treatment_plan_item_id UUID REFERENCES treatment_plan_items(id) ON DELETE SET NULL,  -- linked plan row
  vendor_id UUID REFERENCES lab_vendors(id),
  work_type VARCHAR(120) NOT NULL,                  -- denormalised from lab_work_types.name for resilience
  teeth JSONB DEFAULT '[]'::jsonb,                  -- e.g. [16, 17] for crown work
  shade VARCHAR(20),                                -- "A2", "B3" (shade selection)
  -- Lifecycle
  sent_date DATE,
  expected_date DATE,
  received_date DATE,
  status VARCHAR(20) DEFAULT 'pending'              -- pending | sent | received | fitted | rejected | redo
    CHECK (status IN ('pending','sent','received','fitted','rejected','redo','cancelled')),
  -- Pricing
  cost NUMERIC(10,2) DEFAULT 0,
  invoice_no VARCHAR(80),
  -- Notes
  details TEXT,                                     -- specific spec for this case
  notes TEXT,                                       -- internal
  vendor_notes TEXT,                                -- what the vendor said
  -- Created/updated audit
  created_by UUID REFERENCES staff(id),
  received_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_orders_pending ON lab_orders(status, expected_date)
  WHERE status IN ('pending','sent');
CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id);

-- Lab order payments (separate ledger so the doctor can pay the lab in installments)
CREATE TABLE IF NOT EXISTS lab_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  paid_date DATE DEFAULT CURRENT_DATE,
  payment_mode VARCHAR(20),                         -- cash | upi | bank
  reference VARCHAR(80),
  notes TEXT,
  recorded_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mark which procedure_catalog entries REQUIRE a lab order (used for scheduling guard)
ALTER TABLE procedure_catalog ADD COLUMN IF NOT EXISTS requires_lab BOOLEAN DEFAULT FALSE;
ALTER TABLE procedure_catalog ADD COLUMN IF NOT EXISTS lab_work_type VARCHAR(120);   -- which lab_work_types.name to default to

-- Mark which treatment_plan_items NEED a lab order before next visit (denormalised guard flag)
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS requires_lab BOOLEAN DEFAULT FALSE;
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS lab_status VARCHAR(20) DEFAULT NULL;
  -- NULL = no lab needed · 'pending' (order placed, not back) · 'received' (in clinic, ready)

-- ════════════════════════════════════════════════════════════════════
-- SEEDS
-- ════════════════════════════════════════════════════════════════════

-- Common lab work types
INSERT INTO lab_work_types (name, category, typical_days, typical_cost, sort_order) VALUES
  ('Crown (PFM)', 'Prosthetic', 7, 1500, 1),
  ('Crown (Zirconia)', 'Prosthetic', 7, 4500, 2),
  ('Crown (Full Ceramic)', 'Prosthetic', 10, 6000, 3),
  ('Bridge (3-unit PFM)', 'Prosthetic', 10, 4500, 4),
  ('RPD (Acrylic)', 'Prosthetic', 14, 4000, 5),
  ('RPD (Cobalt-Chrome)', 'Prosthetic', 21, 12000, 6),
  ('Complete Denture', 'Prosthetic', 21, 8000, 7),
  ('Implant Abutment + Crown', 'Prosthetic', 14, 12000, 8),
  ('Night Guard', 'Orthodontic', 10, 2500, 9),
  ('Bleaching Tray', 'Orthodontic', 5, 1500, 10),
  ('Surgical Stent', 'Surgical', 7, 1500, 11)
ON CONFLICT (name) DO NOTHING;

-- Mark common procedures that REQUIRE lab (so the scheduling guard works day 1)
UPDATE procedure_catalog SET requires_lab = TRUE, lab_work_type = 'Crown (PFM)'
  WHERE LOWER(name) LIKE '%crown%' AND requires_lab IS DISTINCT FROM TRUE;
UPDATE procedure_catalog SET requires_lab = TRUE, lab_work_type = 'Bridge (3-unit PFM)'
  WHERE LOWER(name) LIKE '%bridge%' AND requires_lab IS DISTINCT FROM TRUE;
UPDATE procedure_catalog SET requires_lab = TRUE, lab_work_type = 'RPD (Acrylic)'
  WHERE LOWER(name) LIKE '%rpd%' OR LOWER(name) LIKE '%partial denture%';
UPDATE procedure_catalog SET requires_lab = TRUE, lab_work_type = 'Complete Denture'
  WHERE LOWER(name) LIKE '%complete denture%' OR LOWER(name) = 'denture';
UPDATE procedure_catalog SET requires_lab = TRUE, lab_work_type = 'Implant Abutment + Crown'
  WHERE LOWER(name) LIKE '%implant%' AND LOWER(name) NOT LIKE '%review%' AND LOWER(name) NOT LIKE '%consult%';
UPDATE procedure_catalog SET requires_lab = TRUE, lab_work_type = 'Night Guard'
  WHERE LOWER(name) LIKE '%night guard%' OR LOWER(name) LIKE '%bite guard%';

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- VIEWS — convenience for dashboards
-- ════════════════════════════════════════════════════════════════════

-- Pending lab orders per patient (used by scheduling guard)
CREATE OR REPLACE VIEW v_pending_lab_orders_by_patient AS
SELECT
  lo.patient_id,
  lo.clinic_id,
  COUNT(*) FILTER (WHERE lo.status IN ('pending','sent')) AS pending_count,
  COUNT(*) FILTER (WHERE lo.status = 'received') AS received_count,
  MIN(lo.expected_date) FILTER (WHERE lo.status IN ('pending','sent')) AS earliest_expected,
  MAX(lo.expected_date) FILTER (WHERE lo.status IN ('pending','sent') AND lo.expected_date < CURRENT_DATE) AS most_overdue
FROM lab_orders lo
WHERE lo.status NOT IN ('cancelled','fitted')
GROUP BY lo.patient_id, lo.clinic_id;

-- Specialist outstanding (unsettled earnings) summary
CREATE OR REPLACE VIEW v_specialist_outstanding AS
SELECT
  se.specialist_id,
  s.name AS specialist_name,
  se.clinic_id,
  COUNT(*) AS cases_outstanding,
  COALESCE(SUM(se.amount), 0) AS amount_outstanding,
  MIN(se.earned_on) AS oldest_earning
FROM specialist_earnings se
JOIN staff s ON s.id = se.specialist_id
WHERE se.is_settled = FALSE
GROUP BY se.specialist_id, s.name, se.clinic_id;
