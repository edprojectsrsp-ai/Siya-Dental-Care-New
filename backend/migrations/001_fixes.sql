-- ============================================================
-- Siya Dental Care — Sprint 8.5 Fixes Migration
-- Run: psql -U postgres -d siya_dental -f 001_fixes.sql
-- ============================================================

-- F1: Add complaint field to prescriptions (was missing from schema)
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS complaint TEXT;

-- F4: Patient media uploads table
CREATE TABLE IF NOT EXISTS patient_uploads (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_type       TEXT NOT NULL,          -- 'image' | 'video' | 'document'
    mime_type       TEXT,
    caption         TEXT,
    uploaded_by     INTEGER REFERENCES staff(id),
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_patient ON patient_uploads(patient_id);
CREATE INDEX IF NOT EXISTS idx_uploads_appointment ON patient_uploads(appointment_id);

-- F5: Clinic info table for public page (if not exists)
CREATE TABLE IF NOT EXISTS clinic_info (
    id          SERIAL PRIMARY KEY,
    key         TEXT UNIQUE NOT NULL,
    value       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed clinic info for public page
INSERT INTO clinic_info (key, value) VALUES
    ('clinic_name',         'Siya Dental Care'),
    ('tagline',             'Implant & Orthodontic Centre'),
    ('doctor_name',         'Dr. Madhu Edward'),
    ('doctor_qualification','BDS, Reg. No. OD-28456'),
    ('branch1_name',        'Daily Market'),
    ('branch1_address',     'PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001'),
    ('branch1_phone',       ''),
    ('branch1_hours',       'Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM'),
    ('branch2_name',        'Jhirpani'),
    ('branch2_address',     '1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042'),
    ('branch2_phone',       ''),
    ('branch2_hours',       'Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM'),
    ('about',               'Expert dental care with a gentle touch. Specializing in implants, orthodontics, and comprehensive family dentistry.')
ON CONFLICT (key) DO NOTHING;

-- Appointment request table (from public page, no login)
CREATE TABLE IF NOT EXISTS appointment_requests (
    id              SERIAL PRIMARY KEY,
    patient_name    TEXT NOT NULL,
    phone           TEXT NOT NULL,
    preferred_date  DATE,
    preferred_time  TEXT,
    branch          TEXT,
    message         TEXT,
    status          TEXT DEFAULT 'pending',   -- pending | confirmed | cancelled
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
