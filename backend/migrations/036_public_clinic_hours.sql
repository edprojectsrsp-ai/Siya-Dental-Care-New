-- Align public clinic hours for both Siya Dental Care branches.
-- Clinic session: 09:00-13:00 and 17:00-20:00, Sunday closed.

UPDATE clinics
SET name = 'Siya Dental Care - Daily Market',
    short_name = 'Daily Market',
    address = 'PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001',
    updated_at = NOW()
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE clinics
SET name = 'Siya Dental Care - Jhirpani',
    short_name = 'Jhirpani',
    address = '1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042',
    updated_at = NOW()
WHERE id = 'b2222222-2222-2222-2222-222222222222';

UPDATE clinics
SET timings = '{"mon_sat": "09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM", "sun": "Closed"}'::jsonb,
    updated_at = NOW()
WHERE COALESCE(short_name, '') ILIKE ANY (ARRAY['%Daily Market%', '%Jhirpani%'])
   OR COALESCE(name, '') ILIKE '%Siya Dental Care%';

UPDATE clinic_info
SET value = CASE key
  WHEN 'branch1_name' THEN 'Daily Market'
  WHEN 'branch1_address' THEN 'PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001'
  WHEN 'branch1_hours' THEN 'Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM'
  WHEN 'branch2_name' THEN 'Jhirpani'
  WHEN 'branch2_address' THEN '1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042'
  WHEN 'branch2_hours' THEN 'Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM'
  ELSE value
END
WHERE key IN (
  'branch1_name',
  'branch1_address',
  'branch1_hours',
  'branch2_name',
  'branch2_address',
  'branch2_hours'
);

UPDATE business_hours
SET open_time = '09:00',
    close_time = '20:00',
    break_start = '13:00',
    break_end = '17:00',
    is_closed = FALSE
WHERE weekday BETWEEN 0 AND 5
  AND clinic_id IN (
    SELECT id
    FROM clinics
    WHERE COALESCE(short_name, '') ILIKE ANY (ARRAY['%Daily Market%', '%Jhirpani%'])
       OR COALESCE(name, '') ILIKE '%Siya Dental Care%'
  );

UPDATE business_hours
SET is_closed = TRUE,
    open_time = NULL,
    close_time = NULL,
    break_start = NULL,
    break_end = NULL
WHERE weekday = 6
  AND clinic_id IN (
    SELECT id
    FROM clinics
    WHERE COALESCE(short_name, '') ILIKE ANY (ARRAY['%Daily Market%', '%Jhirpani%'])
       OR COALESCE(name, '') ILIKE '%Siya Dental Care%'
  );
