-- Migration 017: staff.whatsapp_number (specialist endpoints select/insert it; 015 missed it)
BEGIN;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
COMMIT;
