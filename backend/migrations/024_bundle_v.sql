-- Migration 024: Bundle V
-- Order: 019 -> 020 -> 021 -> 022 -> 023 -> 024
-- Adapted for DentAssist schema (staff, patients.name, medicine_catalog).

BEGIN;

CREATE TABLE IF NOT EXISTS media_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number VARCHAR(10),
  media_type VARCHAR(20) NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  taken_by UUID REFERENCES staff(id),
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
  is_shared_with_patient BOOLEAN DEFAULT FALSE,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_gallery_patient_taken
  ON media_gallery(patient_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_gallery_patient_tooth
  ON media_gallery(patient_id, tooth_number);
CREATE INDEX IF NOT EXISTS idx_media_gallery_clinic_taken
  ON media_gallery(clinic_id, taken_at DESC);

CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  n8n_webhook_url TEXT,
  n8n_enabled BOOLEAN DEFAULT FALSE,
  telegram_bot_token TEXT,
  telegram_chat_id VARCHAR(100),
  telegram_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_bot_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_intent_routing JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id)
);

INSERT INTO bot_config (clinic_id, whatsapp_intent_routing)
SELECT id, '[
  {"keyword":"appointment","action":"list_appointments","label":"List upcoming"},
  {"keyword":"book","action":"request_appointment","label":"Book a slot"},
  {"keyword":"cancel","action":"request_cancel","label":"Cancel last"},
  {"keyword":"balance","action":"show_balance","label":"Show pending payments"},
  {"keyword":"history","action":"show_history","label":"Past visits"}
]'::jsonb
FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS bot_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  channel VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  from_id VARCHAR(100),
  intent VARCHAR(50),
  message_text TEXT,
  response_text TEXT,
  status VARCHAR(20) DEFAULT 'processed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_event_log_clinic_created
  ON bot_event_log(clinic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clinic_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  slug VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  meta_description TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, slug)
);

CREATE TABLE IF NOT EXISTS clinic_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES clinic_pages(id) ON DELETE CASCADE,
  section_type VARCHAR(30) NOT NULL,
  display_order INTEGER DEFAULT 0,
  content JSONB DEFAULT '{}'::jsonb,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_page_sections_page_order
  ON clinic_page_sections(page_id, display_order);

INSERT INTO clinic_pages (clinic_id, slug, title, meta_description, display_order)
SELECT c.id, p.slug, p.title, p.meta, p.ord
FROM clinics c
CROSS JOIN (VALUES
  ('home', 'Siya Dental Care', 'Modern dental care in Rourkela. Expert RCT, crowns, implants, smile design.', 1),
  ('about', 'About Us', 'About Dr. Madhu Edward and Siya Dental Care.', 2),
  ('services', 'Our Services', 'Comprehensive dental services from cleanings to implants.', 3),
  ('gallery', 'Smile Gallery', 'Real smile transformations from our patients.', 4),
  ('contact', 'Contact', 'Visit us at Rourkela. Two branches.', 5)
) AS p(slug, title, meta, ord)
ON CONFLICT (clinic_id, slug) DO NOTHING;

WITH home_pages AS (
  SELECT id
  FROM clinic_pages
  WHERE slug = 'home'
),
seed_data AS (
  SELECT
    hp.id AS page_id,
    s.section_type,
    s.display_order,
    s.content::jsonb AS content
  FROM home_pages hp
  CROSS JOIN (VALUES
    ('hero', 1, '{"headline":"Modern Dental Care, Trusted Hands","subheadline":"Two branches in Rourkela. Expert care, gentle approach.","cta_text":"Book Appointment","cta_link":"#contact","background_image":"/uploads/hero-default.jpg"}'),
    ('slideshow', 2, '{"slides":[],"autoplay":true,"interval":5000}'),
    ('service_grid', 3, '{"title":"What We Do","services":[{"name":"Root Canal","icon":"🦷","desc":"Painless, single-sitting"},{"name":"Crowns & Bridges","icon":"👑","desc":"PFM, Zirconia"},{"name":"Smile Design","icon":"✨","desc":"Veneers, whitening"},{"name":"Implants","icon":"🔩","desc":"Permanent solutions"},{"name":"Kids Dentistry","icon":"👶","desc":"Child-friendly"},{"name":"Oral Surgery","icon":"⚕️","desc":"Wisdom teeth"}]}'),
    ('doctor_card', 4, '{"name":"Dr. Madhu Edward","credentials":"BDS","bio":"Expert dental practitioner with years of experience in restorative and cosmetic dentistry.","image":"/uploads/doctor.jpg"}'),
    ('testimonial', 5, '{"title":"Our Patients Say","items":[]}'),
    ('cta_block', 6, '{"headline":"Ready for a Brighter Smile?","subheadline":"Book your appointment today","cta_text":"WhatsApp Us","cta_link":"https://wa.me/918895050000"}'),
    ('map', 7, '{"address":"Sector 5, Rourkela, Odisha","embed_url":""}')
  ) AS s(section_type, display_order, content)
)
INSERT INTO clinic_page_sections (page_id, section_type, display_order, content)
SELECT sd.page_id, sd.section_type, sd.display_order, sd.content
FROM seed_data sd
WHERE NOT EXISTS (
  SELECT 1
  FROM clinic_page_sections cps
  WHERE cps.page_id = sd.page_id
    AND cps.section_type = sd.section_type
    AND cps.display_order = sd.display_order
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE medicine_catalog ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE medicine_catalog ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE medicine_catalog ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_medicine_catalog_usage
  ON medicine_catalog(usage_count DESC, name);
CREATE INDEX IF NOT EXISTS idx_medicine_catalog_name_trgm
  ON medicine_catalog USING gin (lower(name) gin_trgm_ops);

ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS before_image_url TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS after_image_url TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS closure_notes TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES staff(id);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE lab_orders DROP CONSTRAINT IF EXISTS lab_orders_status_check;
ALTER TABLE lab_orders ADD CONSTRAINT lab_orders_status_check
  CHECK (status IN ('pending','sent','received','fitted','completed','rejected','redo','cancelled'));

COMMIT;
