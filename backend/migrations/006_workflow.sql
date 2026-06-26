-- Migration 006: Workflow Enhancements (apply after 005)
BEGIN;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) DEFAULT 'scheduled';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS chief_complaints JSONB DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_apt_workflow ON appointments(workflow_status);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS existing_illnesses JSONB DEFAULT '[]';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_new_no_treatment BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS manually_flagged_to_keep BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS common_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO common_conditions (condition_name, category, is_default) VALUES
    ('Diabetes', 'systemic', TRUE), ('Hypertension', 'systemic', TRUE),
    ('Thyroid Disorder', 'systemic', TRUE), ('Asthma', 'systemic', TRUE),
    ('Heart Disease', 'systemic', TRUE), ('Pregnancy', 'systemic', TRUE),
    ('Epilepsy', 'systemic', TRUE), ('Hepatitis B', 'systemic', TRUE),
    ('HIV', 'systemic', TRUE), ('Bleeding Disorder', 'systemic', TRUE),
    ('Drug Allergy', 'allergy', TRUE), ('Latex Allergy', 'allergy', TRUE),
    ('Penicillin Allergy', 'allergy', TRUE), ('Anesthesia Allergy', 'allergy', TRUE),
    ('Bruxism', 'dental', TRUE), ('TMJ Disorder', 'dental', TRUE),
    ('Dry Mouth', 'dental', TRUE), ('Periodontal Disease', 'dental', TRUE)
ON CONFLICT (condition_name) DO NOTHING;

ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE treatment_sessions ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE treatment_sessions ADD COLUMN IF NOT EXISTS discount_reason TEXT;
COMMIT;
