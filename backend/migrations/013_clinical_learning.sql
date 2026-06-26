-- Clinical learning: co-occurrence scores for exam→diagnosis→treatment→medicine
CREATE TABLE IF NOT EXISTS clinical_link_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_type VARCHAR(40) NOT NULL,
    source_key VARCHAR(300) NOT NULL,
    target_key VARCHAR(300) NOT NULL,
    clinic_id UUID,
    score INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (link_type, source_key, target_key, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_clinical_link_source ON clinical_link_scores (link_type, source_key);
CREATE INDEX IF NOT EXISTS idx_clinical_link_clinic ON clinical_link_scores (clinic_id);

-- Seed exam→diagnosis hints (bootstrap before learning kicks in)
INSERT INTO clinical_link_scores (link_type, source_key, target_key, clinic_id, score) VALUES
  ('exam_diag', 'Pain on palpation positive', 'Reversible pulpitis', NULL, 5),
  ('exam_diag', 'TOP positive', 'Irreversible pulpitis', NULL, 5),
  ('exam_diag', 'TOP Negative', 'Reversible pulpitis', NULL, 3),
  ('exam_diag', 'Sensitivity on airblow positive', 'Reversible pulpitis', NULL, 4),
  ('exam_diag', 'Bleeding on probing', 'Gingivitis', NULL, 6)
ON CONFLICT DO NOTHING;
