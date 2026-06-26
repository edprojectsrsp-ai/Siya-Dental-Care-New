-- Migration 011: Clinical Examination + Diagnosis layer
-- Adds per-tooth examination findings, diagnosis, and catalog tables.
-- Run AFTER 010. Idempotent.
BEGIN;

-- ─── 1. Examination Catalog (master list of clinical findings) ───
CREATE TABLE IF NOT EXISTS examination_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    category VARCHAR(40) DEFAULT 'general',  -- vitality / mobility / caries / other
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_catalog_name ON examination_catalog(LOWER(name)) WHERE is_active;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM examination_catalog LIMIT 1) THEN
    INSERT INTO examination_catalog (name, category) VALUES
      ('TOP Positive', 'vitality'), ('TOP Negative', 'vitality'),
      ('Air Blow Sensitive', 'vitality'),
      ('Cold Test Positive', 'vitality'), ('Cold Test Negative', 'vitality'),
      ('Heat Test Positive', 'vitality'), ('Heat Test Negative', 'vitality'),
      ('Electric Pulp Test Positive', 'vitality'), ('Electric Pulp Test Negative', 'vitality'),
      ('Tenderness Present', 'periapical'), ('Tenderness Absent', 'periapical'),
      ('Swelling Present', 'periapical'), ('Sinus Tract Present', 'periapical'),
      ('Mobility Grade 1', 'mobility'), ('Mobility Grade 2', 'mobility'), ('Mobility Grade 3', 'mobility'),
      ('Caries', 'caries'), ('Deep Caries', 'caries'), ('Secondary Caries', 'caries'),
      ('Fracture', 'trauma'), ('Crack Line', 'trauma'), ('Chipped', 'trauma'),
      ('Missing Tooth', 'other'), ('Impacted', 'other'), ('Partially Erupted', 'other'),
      ('Attrition', 'other'), ('Abrasion', 'other'), ('Erosion', 'other'),
      ('Discoloration', 'other'), ('Calculus', 'periodontal'),
      ('Gingival Recession', 'periodontal'), ('Pocket > 4mm', 'periodontal'),
      ('Bleeding on Probing', 'periodontal'), ('Food Impaction', 'other');
  END IF;
END $$;

-- ─── 2. Diagnosis Catalog (with suggested treatments per diagnosis) ───
CREATE TABLE IF NOT EXISTS diagnosis_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    suggested_treatments JSONB DEFAULT '[]',  -- ["RCT", "Extraction"] etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE diagnosis_catalog ADD COLUMN IF NOT EXISTS name VARCHAR(120);
ALTER TABLE diagnosis_catalog ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE diagnosis_catalog
SET name = diagnosis_name
WHERE name IS NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'diagnosis_catalog'
      AND column_name = 'diagnosis_name'
);
ALTER TABLE diagnosis_catalog ALTER COLUMN name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_diag_catalog_name ON diagnosis_catalog(LOWER(name)) WHERE is_active;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM diagnosis_catalog LIMIT 1) THEN
    INSERT INTO diagnosis_catalog (name, suggested_treatments) VALUES
      ('Gingivitis', '["Scaling", "Oral Prophylaxis"]'),
      ('Reversible Pulpitis', '["Filling", "Observation"]'),
      ('Irreversible Pulpitis', '["RCT", "Extraction"]'),
      ('Necrotic Pulp', '["RCT", "Extraction"]'),
      ('Periapical Abscess', '["RCT", "Extraction", "Incision & Drainage"]'),
      ('Periapical Granuloma', '["RCT", "Apicoectomy"]'),
      ('Periodontitis', '["Scaling", "Root Planing", "Flap Surgery"]'),
      ('Deep Caries', '["Filling", "RCT"]'),
      ('Dental Caries', '["Filling"]'),
      ('Impacted Tooth', '["Extraction", "Surgical Extraction"]'),
      ('Missing Tooth', '["Implant", "Bridge", "Denture"]'),
      ('Tooth Fracture', '["Crown", "Extraction", "RCT"]'),
      ('Cracked Tooth Syndrome', '["Crown", "RCT"]'),
      ('Pericoronitis', '["Extraction", "Operculectomy"]'),
      ('Chronic Periodontitis', '["Scaling", "Root Planing", "Flap Surgery"]'),
      ('Aggressive Periodontitis', '["Scaling", "Root Planing", "Antibiotics"]'),
      ('Bruxism', '["Night Guard", "Occlusal Splint"]'),
      ('TMJ Disorder', '["Splint Therapy", "Physiotherapy"]'),
      ('Malocclusion', '["Orthodontic Treatment", "Aligners"]'),
      ('Dental Fluorosis', '["Bleaching", "Veneers"]'),
      ('Tooth Erosion', '["Filling", "Crown"]'),
      ('Root Stump', '["Extraction"]'),
      ('Alveolar Abscess', '["Extraction", "Incision & Drainage"]');
  END IF;
END $$;

-- ─── 3. Per-tooth examination findings (patient-level) ───────────
CREATE TABLE IF NOT EXISTS tooth_examinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    tooth_number INTEGER NOT NULL,
    finding VARCHAR(200) NOT NULL,
    notes TEXT,
    recorded_by UUID,
    recorded_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_tooth_exam_patient ON tooth_examinations(patient_id, tooth_number) WHERE is_active;

-- ─── 4. Per-tooth diagnoses (patient-level) ──────────────────────
CREATE TABLE IF NOT EXISTS tooth_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    tooth_number INTEGER NOT NULL,
    diagnosis VARCHAR(200) NOT NULL,
    notes TEXT,
    recorded_by UUID,
    recorded_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_tooth_diag_patient ON tooth_diagnoses(patient_id, tooth_number) WHERE is_active;

-- ─── 5. Extend treatment_plan_items with examination + diagnosis ─
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS examination_summary TEXT;
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS diagnosis TEXT;

COMMIT;
