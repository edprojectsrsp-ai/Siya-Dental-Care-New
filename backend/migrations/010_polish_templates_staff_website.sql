-- Migration 010: Polish round — Templates · Staff · Gallery · Website
-- Run AFTER 009. Idempotent.
BEGIN;

-- ─── 1. Treatment Templates (hidden inside Plan tab, optional use) ───
CREATE TABLE IF NOT EXISTS treatment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]',         -- [{procedure_id, treatment_name, teeth, rate, discount}]
    usage_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_templates_clinic ON treatment_templates(clinic_id, is_active);

-- Seed common templates (Dr. Madhu's typical combos)
DO $$
DECLARE v_cid UUID;
BEGIN
    SELECT id INTO v_cid FROM clinics ORDER BY created_at LIMIT 1;
    IF NOT EXISTS (SELECT 1 FROM treatment_templates LIMIT 1) THEN
        INSERT INTO treatment_templates (clinic_id, name, description, items) VALUES
        (v_cid, 'RCT + Crown', 'Single-tooth RCT followed by Zirconia crown',
            '[{"treatment_name":"RCT","teeth_placeholder":true,"suggested_rate":4500,"doctor_rate":4500,"discount":0},
              {"treatment_name":"Crown","teeth_placeholder":true,"suggested_rate":3500,"doctor_rate":3500,"discount":0}]'),
        (v_cid, 'Full Mouth Scaling + Polish', 'Routine cleaning package',
            '[{"treatment_name":"Scaling","area_label":"Full Mouth","suggested_rate":1200,"doctor_rate":1200,"discount":0}]'),
        (v_cid, 'Implant Workup', 'Consultation + diagnostic prep for implant',
            '[{"treatment_name":"Consultation","suggested_rate":300,"doctor_rate":300,"discount":0},
              {"treatment_name":"Implant","teeth_placeholder":true,"suggested_rate":25000,"doctor_rate":25000,"discount":0}]'),
        (v_cid, 'Orthodontic Review (6-week)', 'Routine ortho adjustment',
            '[{"treatment_name":"Orthodontic Review","suggested_rate":500,"doctor_rate":500,"discount":0}]'),
        (v_cid, 'Emergency Pain Management', 'Pain relief + diagnosis',
            '[{"treatment_name":"Consultation","suggested_rate":300,"doctor_rate":300,"discount":0},
              {"treatment_name":"Dressing","teeth_placeholder":true,"suggested_rate":300,"doctor_rate":300,"discount":0}]');
    END IF;
END $$;

-- ─── 2. Staff (User Control) — extend existing table ────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS deactivated_by UUID;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_staff_clinic_role ON staff(clinic_id, role, is_active);

-- ─── 3. Gallery (futuristic website — doctor uploads images) ────────
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID,
    category VARCHAR(40) DEFAULT 'general',   -- hero / clinic / treatment / team / before_after
    title VARCHAR(200),
    caption TEXT,
    image_url TEXT NOT NULL,
    order_idx INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gallery_clinic_order ON gallery_images(clinic_id, category, order_idx) WHERE is_active;

-- ─── 4. Website settings (extend clinic_content) ────────────────────
ALTER TABLE clinic_content ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE clinic_content ADD COLUMN IF NOT EXISTS cta_text VARCHAR(60);
ALTER TABLE clinic_content ADD COLUMN IF NOT EXISTS cta_link TEXT;

-- Seed default website sections if none exist
DO $$
DECLARE v_cid UUID;
BEGIN
    SELECT id INTO v_cid FROM clinics ORDER BY created_at LIMIT 1;
    IF v_cid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_content WHERE clinic_id=v_cid AND section='hero') THEN
        INSERT INTO clinic_content (clinic_id, section, title, subtitle, body, order_idx) VALUES
        (v_cid, 'hero', 'Siya Dental Care', 'Where smiles are reborn',
            'World-class dental treatment in the heart of Rourkela — Dr. Madhu Edward (BDS, OD-28456) and team.', 0),
        (v_cid, 'about', 'About Us',
            'Two decades of excellence',
            'Dr. Madhu Edward leads Siya Dental Care with a vision to combine modern technology with compassionate care. Our two clinics in Rourkela serve thousands of patients with treatments ranging from routine cleaning to complex implants.', 1),
        (v_cid, 'service', 'Root Canal Treatment', 'Painless RCT',
            'Modern endodontic treatment with rotary instrumentation. Save your natural tooth.', 2),
        (v_cid, 'service', 'Dental Implants', 'Permanent solution',
            'Titanium implants with crown — restore your bite and smile permanently.', 3),
        (v_cid, 'service', 'Cosmetic Dentistry', 'Smile makeover',
            'Veneers, whitening, and smile design for the confidence you deserve.', 4),
        (v_cid, 'service', 'Pediatric Dentistry', 'Child-friendly care',
            'Specialized care for milk teeth, fluoride treatment, and orthodontic screening.', 5),
        (v_cid, 'contact', 'Visit Us', NULL,
            'Rourkela, Odisha · Two branches · Open Mon–Sat 9 AM – 8 PM', 99);
    END IF;
END $$;

COMMIT;
