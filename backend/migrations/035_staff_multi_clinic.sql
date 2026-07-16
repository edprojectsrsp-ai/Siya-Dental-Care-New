-- Allow selected staff (doctor / specialist / admin) to log in and operate across
-- ALL clinics, not just the one their row belongs to. Login becomes clinic-agnostic
-- for these accounts; the in-app clinic switcher then toggles between branches.
BEGIN;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS multi_clinic BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
