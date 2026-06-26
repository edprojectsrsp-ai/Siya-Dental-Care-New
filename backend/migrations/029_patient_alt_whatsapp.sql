ALTER TABLE patients
ADD COLUMN IF NOT EXISTS alternate_whatsapp_number VARCHAR(30);
