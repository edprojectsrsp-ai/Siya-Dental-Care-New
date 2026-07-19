-- Align public clinic hours for both Siya Dental Care branches.
-- Clinic session: 09:00-13:00 and 17:00-20:00, Sunday closed.

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_maps_embed_url text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS street_view_embed_url text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS directions_url text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS public_phone varchar(20);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS whatsapp_link text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS show_on_public_site boolean DEFAULT true;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

UPDATE clinics
SET name = 'Siya Dental Care - Daily Market',
    short_name = 'Daily Market',
    address = 'PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001',
    google_place_id = 'ChIJx0zGMVkZIDoRuRljAWIG7nI',
    google_maps_link = 'https://www.google.com/maps/dir//Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+PETROL+PUMP,+MADU+MAHARAJ+GALI,+near+DAILY+MARKET,+DAILY+MARKET,+Udit+Nagar,+Rourkela,+Odisha+769001/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a20195931c64cc7:0x72ee0662016319b9!2m2!1d84.8546404!2d22.2265668!3e0?entry=ttu',
    directions_url = 'https://www.google.com/maps/dir//Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+PETROL+PUMP,+MADU+MAHARAJ+GALI,+near+DAILY+MARKET,+DAILY+MARKET,+Udit+Nagar,+Rourkela,+Odisha+769001/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a20195931c64cc7:0x72ee0662016319b9!2m2!1d84.8546404!2d22.2265668!3e0?entry=ttu',
    google_maps_embed_url = 'https://www.google.com/maps?q=Siya%20Dental%20Care%20Daily%20Market%20Rourkela&ftid=0x3a20195931c64cc7:0x72ee0662016319b9&z=17&output=embed',
    latitude = 22.2265668,
    longitude = 84.8546404,
    updated_at = NOW()
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE clinics
SET name = 'Siya Dental Care - Jhirpani',
    short_name = 'Jhirpani',
    address = '1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042',
    google_place_id = 'ChIJe-cBgb0dIDoRG0WeOrP1jt4',
    google_maps_link = 'https://www.google.com/maps/dir//1st+floor,+Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+wonder+medicine+complex,+near+RC+Church,+Jhirpani,+Rourkela,+Odisha+769042/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a201dbd81c1e77b:0xde8ef5b33a9e451b!2m2!1d84.900952!2d22.2652459!3e0?entry=ttu',
    directions_url = 'https://www.google.com/maps/dir//1st+floor,+Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+wonder+medicine+complex,+near+RC+Church,+Jhirpani,+Rourkela,+Odisha+769042/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a201dbd81c1e77b:0xde8ef5b33a9e451b!2m2!1d84.900952!2d22.2652459!3e0?entry=ttu',
    google_maps_embed_url = 'https://www.google.com/maps?q=Siya%20Dental%20Care%20Jhirpani%20Rourkela&ftid=0x3a201dbd81c1e77b:0xde8ef5b33a9e451b&z=17&output=embed',
    latitude = 22.2652459,
    longitude = 84.900952,
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
