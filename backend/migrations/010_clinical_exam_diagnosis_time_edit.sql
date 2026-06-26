-- Migration 010: Clinical Examination + Diagnosis layer and appointment time edit support
BEGIN;

-- Treatment plan rows carry clinical context when created from tooth chart/exam.
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS examination JSONB DEFAULT '[]';
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS diagnosis VARCHAR(120);

-- Reusable examination and diagnosis masters. Custom values are auto-saved.
CREATE TABLE IF NOT EXISTS examination_finding_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(40) DEFAULT 'general',
    is_default BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnosis_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_name VARCHAR(120) NOT NULL UNIQUE,
    suggested_treatments JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO examination_finding_catalog (finding_name, category, is_default) VALUES
 ('TOP Positive','percussion',TRUE), ('TOP Negative','percussion',TRUE),
 ('Air Blow Sensitive','sensitivity',TRUE), ('Air Blow Negative','sensitivity',TRUE),
 ('Cold Test Positive','pulp_test',TRUE), ('Cold Test Negative','pulp_test',TRUE),
 ('Heat Test Positive','pulp_test',TRUE), ('Heat Test Negative','pulp_test',TRUE),
 ('Tenderness Present','clinical',TRUE), ('Swelling Present','clinical',TRUE),
 ('Mobility Grade 1','periodontal',TRUE), ('Mobility Grade 2','periodontal',TRUE), ('Mobility Grade 3','periodontal',TRUE),
 ('Caries','clinical',TRUE), ('Deep Caries','clinical',TRUE), ('Fracture','clinical',TRUE), ('Missing Tooth','clinical',TRUE)
ON CONFLICT (finding_name) DO NOTHING;

INSERT INTO diagnosis_catalog (diagnosis_name, suggested_treatments, is_default) VALUES
 ('Gingivitis','["Scaling","Oral Hygiene Review"]',TRUE),
 ('Periodontitis','["Scaling","Root Planing","Periodontal Review"]',TRUE),
 ('Reversible Pulpitis','["Filling","Observation"]',TRUE),
 ('Irreversible Pulpitis','["RCT","Extraction"]',TRUE),
 ('Necrotic Pulp','["RCT","Extraction"]',TRUE),
 ('Periapical Abscess','["RCT","Extraction","Drainage"]',TRUE),
 ('Deep Caries','["Filling","RCT"]',TRUE),
 ('Impacted Tooth','["Extraction"]',TRUE),
 ('Missing Tooth','["Implant","Bridge","Denture"]',TRUE),
 ('Calculus','["Scaling"]',TRUE)
ON CONFLICT (diagnosis_name) DO NOTHING;

-- Tooth-wise clinical record independent of treatment/billing.
CREATE TABLE IF NOT EXISTS tooth_clinical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number INTEGER NOT NULL,
    examination JSONB DEFAULT '[]',
    diagnosis VARCHAR(120),
    notes TEXT,
    recorded_by UUID,
    recorded_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT tooth_clinical_tooth_check CHECK (tooth_number BETWEEN 11 AND 85),
    CONSTRAINT uq_tooth_clinical_patient_tooth UNIQUE (patient_id, tooth_number)
);
CREATE INDEX IF NOT EXISTS idx_tooth_clinical_patient ON tooth_clinical_records(patient_id, tooth_number);

COMMIT;
