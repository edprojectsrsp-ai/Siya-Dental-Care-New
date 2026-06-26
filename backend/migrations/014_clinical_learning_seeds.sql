-- Migration 014: Extend clinical learning seeds (Polish Sprint, 12 Jun 2026)
-- Adds bootstrap data for treat_med (treatment → medicine) and diag_medicine
-- (diagnosis → medicine) link types so day-1 suggestions are useful before
-- the doctor's actual co-selections accumulate.
-- Idempotent — uses ON CONFLICT DO NOTHING.
BEGIN;

-- Sanity: ensure the table exists (run 013 first if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinical_link_scores') THEN
    RAISE EXCEPTION 'Run migration 013_clinical_learning.sql first';
  END IF;
END $$;

-- ─── diag → medicine seeds ──────────────────────────────────────
INSERT INTO clinical_link_scores (link_type, source_key, target_key, clinic_id, score) VALUES
  ('diag_medicine', 'Reversible Pulpitis', 'Ibuprofen 400mg', NULL, 5),
  ('diag_medicine', 'Reversible Pulpitis', 'Paracetamol 500mg', NULL, 4),
  ('diag_medicine', 'Irreversible Pulpitis', 'Amoxicillin 500mg', NULL, 6),
  ('diag_medicine', 'Irreversible Pulpitis', 'Ibuprofen 400mg', NULL, 5),
  ('diag_medicine', 'Necrotic Pulp', 'Amoxicillin 500mg', NULL, 5),
  ('diag_medicine', 'Necrotic Pulp', 'Metronidazole 400mg', NULL, 4),
  ('diag_medicine', 'Periapical Abscess', 'Amoxicillin 500mg', NULL, 7),
  ('diag_medicine', 'Periapical Abscess', 'Metronidazole 400mg', NULL, 6),
  ('diag_medicine', 'Periapical Abscess', 'Ibuprofen 400mg', NULL, 5),
  ('diag_medicine', 'Gingivitis', 'Chlorhexidine Mouthwash 0.2%', NULL, 6),
  ('diag_medicine', 'Periodontitis', 'Amoxicillin 500mg', NULL, 4),
  ('diag_medicine', 'Periodontitis', 'Metronidazole 400mg', NULL, 4),
  ('diag_medicine', 'Periodontitis', 'Chlorhexidine Mouthwash 0.2%', NULL, 5)
ON CONFLICT (link_type, source_key, target_key, clinic_id) DO NOTHING;

-- ─── treatment → medicine seeds ────────────────────────────────
INSERT INTO clinical_link_scores (link_type, source_key, target_key, clinic_id, score) VALUES
  ('treat_med', 'Root Canal Treatment', 'Amoxicillin 500mg', NULL, 5),
  ('treat_med', 'Root Canal Treatment', 'Ibuprofen 400mg', NULL, 5),
  ('treat_med', 'Extraction', 'Amoxicillin 500mg', NULL, 6),
  ('treat_med', 'Extraction', 'Ibuprofen 400mg', NULL, 5),
  ('treat_med', 'Extraction', 'Paracetamol 500mg', NULL, 4),
  ('treat_med', 'Surgical Extraction', 'Amoxicillin 500mg', NULL, 6),
  ('treat_med', 'Surgical Extraction', 'Metronidazole 400mg', NULL, 4),
  ('treat_med', 'Surgical Extraction', 'Ibuprofen 400mg', NULL, 5),
  ('treat_med', 'Incision and Drainage', 'Amoxicillin 500mg', NULL, 5),
  ('treat_med', 'Incision and Drainage', 'Metronidazole 400mg', NULL, 5),
  ('treat_med', 'Scaling', 'Chlorhexidine Mouthwash 0.2%', NULL, 6),
  ('treat_med', 'Crown Cementation', 'Ibuprofen 400mg', NULL, 3),
  ('treat_med', 'Impaction Surgery', 'Amoxicillin 500mg', NULL, 6),
  ('treat_med', 'Impaction Surgery', 'Metronidazole 400mg', NULL, 5),
  ('treat_med', 'Impaction Surgery', 'Ibuprofen 400mg', NULL, 5),
  ('treat_med', 'Impaction Surgery', 'Chlorhexidine Mouthwash 0.2%', NULL, 4)
ON CONFLICT (link_type, source_key, target_key, clinic_id) DO NOTHING;

COMMIT;
