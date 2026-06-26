-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Migration 025 — Bundle W (Final Overhaul)                  ║
-- ║  Order: 019 → 020 → 021 → 022 → 023 → 024 → 025            ║
-- ║  Idempotent: safe to re-run.                                ║
-- ╚══════════════════════════════════════════════════════════════╝

BEGIN;

-- A.  QR CODES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='qr_codes') THEN
    CREATE TABLE qr_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
      kind VARCHAR(30) NOT NULL,
      target_id UUID,
      target_url TEXT NOT NULL,
      short_code VARCHAR(20) UNIQUE,
      scans_count INTEGER DEFAULT 0,
      last_scanned_at TIMESTAMPTZ,
      png_path TEXT,
      svg_path TEXT,
      created_by UUID REFERENCES staff(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE
    );
  END IF;
END$$;

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS kind VARCHAR(30);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS target_url TEXT;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS short_code VARCHAR(20);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS scans_count INTEGER DEFAULT 0;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS png_path TEXT;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS svg_path TEXT;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qr_codes_short_code_uq')
  AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='qr_codes_short_code_uq') THEN
    ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_short_code_uq UNIQUE (short_code);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qr_codes' AND column_name='source') THEN
    ALTER TABLE qr_codes ALTER COLUMN source DROP NOT NULL;
    ALTER TABLE qr_codes ALTER COLUMN source SET DEFAULT 'bundle_w';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qr_codes' AND column_name='whatsapp_url') THEN
    ALTER TABLE qr_codes ALTER COLUMN whatsapp_url DROP NOT NULL;
    ALTER TABLE qr_codes ALTER COLUMN whatsapp_url SET DEFAULT '';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_qr_codes_kind_target ON qr_codes(kind, target_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_clinic ON qr_codes(clinic_id);

-- B.  DASHBOARD WIDGETS
CREATE TABLE IF NOT EXISTS dashboard_widget_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  widget_key VARCHAR(50) NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, staff_id, widget_key)
);
CREATE INDEX IF NOT EXISTS idx_dwp_clinic_staff ON dashboard_widget_prefs(clinic_id, staff_id);

INSERT INTO dashboard_widget_prefs (clinic_id, staff_id, widget_key, is_visible, display_order)
SELECT c.id, NULL, w.key, TRUE, w.ord FROM clinics c
CROSS JOIN (VALUES
  ('today_summary', 1), ('revenue_pulse', 2), ('appt_funnel', 3),
  ('lab_pipeline', 4), ('outstanding_aging', 5), ('followup_alerts', 6),
  ('no_show_30d', 7), ('top_procedures', 8), ('reschedule_queue', 9),
  ('bot_pulse', 10), ('reminders_health', 11)
) AS w(key, ord)
ON CONFLICT (clinic_id, staff_id, widget_key) DO NOTHING;

-- C.  bot_event_log
ALTER TABLE bot_event_log DROP CONSTRAINT IF EXISTS bot_event_log_status_check;
ALTER TABLE bot_event_log ADD CONSTRAINT bot_event_log_status_check
  CHECK (status IN ('processed','sent','failed','queued','duplicate','ignored'));
CREATE INDEX IF NOT EXISTS idx_bot_log_channel_dir
  ON bot_event_log(clinic_id, channel, direction, created_at DESC);

-- D.  lab_orders
ALTER TABLE lab_orders DROP CONSTRAINT IF EXISTS lab_orders_status_check;
ALTER TABLE lab_orders ADD CONSTRAINT lab_orders_status_check
  CHECK (status IN ('pending','sent','received','fitted','completed','rejected','redo','cancelled'));
ALTER TABLE lab_orders ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_orders' AND column_name='qr_code_id') THEN
    ALTER TABLE lab_orders ADD COLUMN qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL;
  END IF;
END$$;

-- E.  prescriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prescriptions' AND column_name='qr_code_id') THEN
    ALTER TABLE prescriptions ADD COLUMN qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL;
  END IF;
END$$;

-- F.  clinic_pages seeded
INSERT INTO clinic_pages (clinic_id, slug, title, meta_description, display_order)
SELECT c.id, p.slug, p.title, p.meta, p.ord FROM clinics c
CROSS JOIN (VALUES
  ('home', 'Siya Dental Care', 'Modern dental care in Rourkela.', 1),
  ('about', 'About Us', 'About Dr. Madhu Edward.', 2),
  ('services', 'Our Services', 'Comprehensive dental services.', 3),
  ('gallery', 'Smile Gallery', 'Real smile transformations.', 4),
  ('contact', 'Contact', 'Visit our clinic in Rourkela.', 5)
) AS p(slug, title, meta, ord)
ON CONFLICT (clinic_id, slug) DO NOTHING;

-- G.  bot_config seeded
INSERT INTO bot_config (clinic_id, whatsapp_intent_routing)
SELECT c.id,
  '[{"keyword":"appointment","action":"list_appointments","label":"List upcoming"},
    {"keyword":"book","action":"request_appointment","label":"Book a slot"},
    {"keyword":"cancel","action":"request_cancel","label":"Cancel last"},
    {"keyword":"balance","action":"show_balance","label":"Pending payments"},
    {"keyword":"history","action":"show_history","label":"Past visits"}]'::jsonb
FROM clinics c
ON CONFLICT (clinic_id) DO NOTHING;

-- H.  reminder_settings seeded
INSERT INTO reminder_settings (clinic_id) SELECT id FROM clinics ON CONFLICT (clinic_id) DO NOTHING;

-- I.  v_appointments_bucketed
CREATE OR REPLACE VIEW v_appointments_bucketed AS
SELECT a.*,
  COALESCE(a.confirmed_date, a.requested_date) AS effective_date,
  COALESCE(a.confirmed_time, a.requested_time) AS effective_time,
  CASE
    WHEN a.workflow_status = 'cancelled' OR a.status = 'cancelled' THEN 'cancelled'
    WHEN a.workflow_status = 'completed' OR a.status IN ('completed','done') THEN 'completed'
    WHEN a.status = 'no_show' THEN 'no_show'
    WHEN a.workflow_status IN ('arrived','ready','in_treatment','payment_pending') THEN 'in_clinic'
    WHEN a.contact_status = 'pending_call' THEN 'unscheduled'
    WHEN a.contact_status = 'rescheduled' THEN 'rescheduled'
    WHEN a.contact_status = 'no_answer' THEN 'no_answer'
    WHEN a.contact_status = 'confirmed' AND a.workflow_status = 'scheduled' THEN 'confirmed'
    WHEN a.workflow_status = 'confirmed' THEN 'confirmed'
    WHEN a.workflow_status = 'scheduled' THEN 'scheduled'
    ELSE 'other'
  END AS bucket
FROM appointments a;

CREATE INDEX IF NOT EXISTS idx_apt_effective_date
  ON appointments (clinic_id, (COALESCE(confirmed_date, requested_date)));

COMMIT;
