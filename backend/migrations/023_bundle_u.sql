-- Migration 023: Bundle U (adapted for Siya Dental current schema)
-- Run AFTER 022.

BEGIN;

CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  whatsapp_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  appt_24h_enabled BOOLEAN DEFAULT true,
  appt_24h_send_time TIME DEFAULT '09:00',
  appt_2h_enabled BOOLEAN DEFAULT true,
  appt_30m_enabled BOOLEAN DEFAULT false,
  followup_day_enabled BOOLEAN DEFAULT true,
  followup_day_send_time TIME DEFAULT '10:00',
  followup_1day_before_enabled BOOLEAN DEFAULT false,
  followup_7day_before_enabled BOOLEAN DEFAULT false,
  payment_3day_enabled BOOLEAN DEFAULT false,
  payment_7day_enabled BOOLEAN DEFAULT false,
  birthday_enabled BOOLEAN DEFAULT false,
  birthday_send_time TIME DEFAULT '08:00',
  morning_digest_enabled BOOLEAN DEFAULT true,
  morning_digest_send_time TIME DEFAULT '07:00',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id)
);

INSERT INTO reminder_settings (clinic_id)
SELECT id FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  reminder_key VARCHAR(100) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  fired_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_detail TEXT,
  UNIQUE(reminder_key)
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_clinic_fired ON reminder_log(clinic_id, fired_at DESC);

CREATE TABLE IF NOT EXISTS patient_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  token VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_patient ON patient_portal_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON patient_portal_tokens(token);

CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  requested_date DATE NOT NULL,
  requested_time TIME,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_by UUID REFERENCES staff(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_clinic_status ON reschedule_requests(clinic_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS smile_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID REFERENCES patients(id),
  before_image_url TEXT,
  after_image_url TEXT,
  whitening_level INTEGER DEFAULT 5,
  gum_contour_level INTEGER DEFAULT 0,
  alignment_overlay BOOLEAN DEFAULT false,
  shade_preset VARCHAR(20) DEFAULT 'A2',
  notes TEXT,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS default_sittings INTEGER DEFAULT 1;
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,2);
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS procedures JSONB DEFAULT '[]'::jsonb;
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS default_medicines JSONB DEFAULT '[]'::jsonb;
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS default_advice TEXT;
ALTER TABLE treatment_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE treatment_templates
SET template_name = COALESCE(template_name, name)
WHERE template_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_treatment_templates_bundle_u
  ON treatment_templates(clinic_id, is_active, template_name);

INSERT INTO treatment_templates
  (clinic_id, name, template_name, category, description, default_sittings, estimated_cost, procedures, default_advice, items, is_active)
SELECT
  c.id,
  seed.template_name,
  seed.template_name,
  seed.category,
  seed.description,
  seed.default_sittings,
  seed.estimated_cost,
  seed.procedures::jsonb,
  seed.default_advice,
  '[]'::jsonb,
  TRUE
FROM clinics c
CROSS JOIN (
  VALUES
    ('Root Canal Treatment (3-sitting)', 'endodontic', 'Standard RCT protocol', 3, 5500.00,
      '[{"procedure_name":"Access Opening + Working Length","sitting_no":1,"notes":"Local anesthesia"},{"procedure_name":"BMP + Cleaning","sitting_no":2,"notes":"Intracanal medicament"},{"procedure_name":"Obturation","sitting_no":3,"notes":"Final seal"}]',
      'Avoid hard food on treated tooth.'),
    ('Single-Sitting RCT', 'endodontic', 'Single visit RCT', 1, 4500.00,
      '[{"procedure_name":"Access + BMP + Obturation","sitting_no":1,"notes":"Full procedure"}]',
      'Soft diet for 24 hrs.'),
    ('Composite Filling', 'restorative', 'Direct composite restoration', 1, 1200.00,
      '[{"procedure_name":"Cavity Prep + Composite Fill","sitting_no":1,"notes":"Shade match"}]',
      'Avoid hot/cold for 24 hrs.'),
    ('Crown (PFM, 2-sitting)', 'prosthetic', 'Tooth preparation + cementation', 2, 8000.00,
      '[{"procedure_name":"Tooth Preparation + Impression","sitting_no":1,"notes":"Temp crown"},{"procedure_name":"Crown Cementation","sitting_no":2,"notes":"Occlusion check"}]',
      'Soft diet 24 hrs.'),
    ('Scaling + Polishing', 'periodontic', 'Full mouth scaling', 1, 1500.00,
      '[{"procedure_name":"Ultrasonic Scaling + Polishing","sitting_no":1,"notes":"Both arches"}]',
      'Salt water rinse 3x/day.'),
    ('Extraction (Simple)', 'surgical', 'Simple extraction', 1, 1000.00,
      '[{"procedure_name":"Simple Extraction","sitting_no":1,"notes":"LA, post-op instructions"}]',
      'Bite on gauze 30 min.'),
    ('Wisdom Tooth Extraction', 'surgical', 'Surgical 3rd molar removal', 1, 4000.00,
      '[{"procedure_name":"Surgical Extraction + Suturing","sitting_no":1,"notes":"LA, flap if needed"}]',
      'Ice pack first day.'),
    ('Zirconia Crown (2-sitting)', 'prosthetic', 'Premium crown', 2, 14000.00,
      '[{"procedure_name":"Tooth Preparation + Digital Impression","sitting_no":1,"notes":"Temp crown"},{"procedure_name":"Zirconia Crown Cementation","sitting_no":2,"notes":"Occlusion adjustment"}]',
      'Avoid biting hard items on crown.')
) AS seed(template_name, category, description, default_sittings, estimated_cost, procedures, default_advice)
WHERE NOT EXISTS (
  SELECT 1
  FROM treatment_templates t
  WHERE t.clinic_id = c.id
    AND LOWER(COALESCE(t.template_name, t.name)) = LOWER(seed.template_name)
    AND t.is_active = TRUE
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created ON prescriptions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_created ON treatment_plans(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_patient_created ON payment_transactions(patient_id, created_at DESC);

COMMIT;
