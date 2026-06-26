-- Migration 016: Add phone_number field to appointments
-- Allows capturing contact phone at time of booking (useful for walk-ins, new patients, or when different from patient master record).
-- Safe additive change.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone_number VARCHAR(15);

-- Optional one-time backfill (uncomment and run if you want existing appointments to inherit from patient):
-- UPDATE appointments a
-- SET phone_number = p.phone
-- FROM patients p
-- WHERE a.patient_id = p.id AND a.phone_number IS NULL;

-- You may also want to index it if you plan to search by appointment phone often:
-- CREATE INDEX IF NOT EXISTS idx_apt_phone_number ON appointments(phone_number);
