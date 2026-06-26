-- Migration 009: Treatment Workspace (Master Spec) — apply after 008
-- Treatment Plan = master tab · multi-tooth · revision history · tooth-chart
-- auto-sync · work-step intelligence · drafts · chairside notes · child teeth.

BEGIN;

-- ── 1. Treatment Plan items: multi-tooth + rate model ────────────
-- Final Amount = Doctor Rate − Discount (suggested = catalog rate × teeth)
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS teeth JSONB DEFAULT '[]';
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS area_label VARCHAR(60);      -- e.g. 'Full Mouth'
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS suggested_rate NUMERIC(10,2) DEFAULT 0;
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS doctor_rate NUMERIC(10,2) DEFAULT 0;
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]';
ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ── 2. Catalog intelligence ──────────────────────────────────────
ALTER TABLE procedure_catalog ADD COLUMN IF NOT EXISTS is_tooth_based BOOLEAN DEFAULT FALSE;
ALTER TABLE procedure_catalog ADD COLUMN IF NOT EXISTS work_steps JSONB DEFAULT '[]';
ALTER TABLE procedure_catalog ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE procedure_catalog ADD COLUMN IF NOT EXISTS added_from VARCHAR(30) DEFAULT 'manual';
ALTER TABLE medicine_catalog  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- ── 3. Child teeth support (FDI 51–85) + plan-item linkage ───────
ALTER TABLE tooth_treatments DROP CONSTRAINT IF EXISTS tooth_treatments_tooth_number_check;
ALTER TABLE tooth_treatments ADD CONSTRAINT tooth_treatments_tooth_number_check CHECK (tooth_number BETWEEN 11 AND 85);
ALTER TABLE tooth_treatments ADD COLUMN IF NOT EXISTS plan_item_id UUID;
ALTER TABLE tooth_conditions DROP CONSTRAINT IF EXISTS tooth_conditions_tooth_number_check;
ALTER TABLE tooth_conditions ADD CONSTRAINT tooth_conditions_tooth_number_check CHECK (tooth_number BETWEEN 11 AND 85);
CREATE INDEX IF NOT EXISTS idx_tooth_tx_item ON tooth_treatments(plan_item_id);
CREATE INDEX IF NOT EXISTS idx_tooth_tx_patient ON tooth_treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_cond_patient ON tooth_conditions(patient_id);

-- ── 4. Chair-side notes (persist across visits) ──────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chairside_notes TEXT;

-- ── 5. Treatment Plan revision history (auto-maintained) ─────────
CREATE TABLE IF NOT EXISTS plan_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    revision_number INTEGER NOT NULL,
    change_summary TEXT NOT NULL,
    item_snapshot JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_rev ON plan_revisions(plan_id, revision_number);

-- ── 6. Save Draft (per patient, survives navigation) ─────────────
CREATE TABLE IF NOT EXISTS workspace_drafts (
    patient_id UUID PRIMARY KEY,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── 7. Files: tooth + visit linkage ──────────────────────────────
ALTER TABLE patient_uploads ADD COLUMN IF NOT EXISTS tooth_number INTEGER;
ALTER TABLE patient_uploads ADD COLUMN IF NOT EXISTS session_id UUID;

-- ── 8. Tooth issue catalog (spec list + custom auto-save) ────────
CREATE TABLE IF NOT EXISTS tooth_issue_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_name VARCHAR(80) NOT NULL UNIQUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO tooth_issue_catalog (issue_name, is_default) VALUES
    ('Caries', TRUE), ('Deep Caries', TRUE), ('Fracture', TRUE), ('Missing Tooth', TRUE),
    ('Pain', TRUE), ('Sensitivity', TRUE), ('Swelling', TRUE), ('Mobility', TRUE),
    ('Bleeding Gums', TRUE), ('Other', TRUE)
ON CONFLICT (issue_name) DO NOTHING;

-- ── 9. Seed spec treatments + work steps + tooth flags ───────────
-- Existing rows matched by name pattern; missing ones inserted.
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT * FROM (VALUES
        -- name,                 pattern,               tooth, rate,  steps
        ('RCT',                  '%root canal%|%rct%',  TRUE,  4500, '["Access Opening","BMP","Obturation","Post & Core","Crown Preparation","Crown Cementation"]'),
        ('Crown',                '%crown%',             TRUE,  3500, '["Tooth Preparation","Impression","Crown Trial","Crown Cementation"]'),
        ('Filling',              '%filling%|%restorat%',TRUE,  800,  '["Filling Completed"]'),
        ('Extraction',           '%extraction%',        TRUE,  1000, '["Extraction Completed","Suturing","Suture Removal"]'),
        ('Implant',              '%implant%',           TRUE,  25000,'["Implant Placement","Healing Cap","Impression","Crown Placement"]'),
        ('Bridge',               '%bridge%',            TRUE,  9000, '["Tooth Preparation","Impression","Bridge Trial","Bridge Cementation"]'),
        ('Veneer',               '%veneer%',            TRUE,  6000, '["Tooth Preparation","Impression","Veneer Trial","Veneer Cementation"]'),
        ('Dressing',             '%dressing%',          TRUE,  300,  '["Dressing Done"]'),
        ('Scaling',              '%scaling%|%cleaning%',FALSE, 1200, '["Scaling Completed","Polishing"]'),
        ('Consultation',         '%consultation%',      FALSE, 300,  '["Consultation Done"]'),
        ('Whitening',            '%whitening%|%bleach%',FALSE, 6000, '["Whitening Session"]'),
        ('Denture',              '%denture%',           FALSE, 12000,'["Impression","Bite Registration","Try-in","Denture Delivery"]'),
        ('Orthodontic Review',   '%orthodontic%|%braces%',FALSE,500, '["Adjustment Done","Wire Change"]'),
        ('Implant Consultation', '%implant consult%',   FALSE, 500,  '["Consultation Done"]'),
        ('Oral Hygiene Review',  '%hygiene%',           FALSE, 200,  '["Review Done"]')
    ) AS v(tname, pattern, tooth, rate, steps)
    LOOP
        UPDATE procedure_catalog
           SET is_tooth_based = t.tooth,
               work_steps = CASE WHEN work_steps = '[]'::jsonb OR work_steps IS NULL
                                 THEN t.steps::jsonb ELSE work_steps END
         WHERE name ILIKE ANY (string_to_array(t.pattern, '|'));
        IF NOT FOUND THEN
            INSERT INTO procedure_catalog (name, category, default_cost, cost_min, cost_max, is_tooth_based, work_steps, added_from, is_active)
            VALUES (t.tname, CASE WHEN t.tooth THEN 'Tooth-Based' ELSE 'General' END,
                    t.rate, t.rate * 0.7, t.rate * 1.5, t.tooth, t.steps::jsonb, 'spec_seed', TRUE);
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ── 10. File kinds (RVG / X-Ray / OPG / Photo / Report / Consent) ─
ALTER TABLE patient_uploads ADD COLUMN IF NOT EXISTS file_kind VARCHAR(30);

-- ── 11. Allow shared phone numbers (family members) ──────────────
-- Spec: "Family members can share one number" → duplicate detection popup
-- lets the receptionist choose Continue Existing vs Create New.
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_phone_key;
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
