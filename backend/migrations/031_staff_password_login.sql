-- Optional stronger password login alongside the 4-digit PIN.
-- Staff keep logging in with PIN by default; doctor/admin can set a longer
-- password from Settings for accounts that need stronger protection.
BEGIN;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

COMMIT;
