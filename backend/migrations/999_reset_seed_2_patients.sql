TRUNCATE TABLE patients CASCADE;

INSERT INTO patients (
  id, name, phone, alternate_whatsapp_number, age, gender,
  preferred_clinic_id, total_visits, existing_illnesses, created_at, updated_at
) VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'Asha Verma',
    '9876500001',
    '9876501001',
    29,
    'Female',
    'a1111111-1111-1111-1111-111111111111',
    1,
    '["Sensitive teeth"]'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Rohan Gupta',
    '9876500002',
    NULL,
    35,
    'Male',
    'a1111111-1111-1111-1111-111111111111',
    0,
    '["Diabetes"]'::jsonb,
    NOW(),
    NOW()
  );

INSERT INTO patient_health (
  id, patient_id, diabetes, hypertension, heart_disease, thyroid, asthma,
  kidney_disease, liver_disease, pregnant, blood_thinner, allergies,
  previous_surgeries, current_medicines, smoking, tobacco, other_conditions, updated_at
) VALUES
  (
    gen_random_uuid(),
    '10000000-0000-4000-8000-000000000001',
    FALSE, FALSE, FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE, FALSE, '',
    '', '', FALSE, FALSE, '', NOW()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-4000-8000-000000000002',
    TRUE, FALSE, FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE, FALSE, '',
    '', 'Metformin', FALSE, FALSE, '', NOW()
  );

INSERT INTO treatment_plans (
  id, patient_id, clinic_id, doctor_id, name, complaint, diagnosis,
  estimated_cost, final_payable, balance, total_sittings_planned, sittings_completed,
  status, plan_name, is_archived, created_at, updated_at
) VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'a1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'RCT Upper Molar',
    'Pain in upper right molar',
    'Deep caries requiring RCT',
    4500,
    4500,
    4500,
    2,
    0,
    'treatment_started',
    'RCT Upper Molar',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'a1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'Scaling Consultation',
    'Bleeding gums',
    'Generalized gingivitis',
    1500,
    1500,
    1500,
    1,
    0,
    'treatment_advised',
    'Scaling Consultation',
    FALSE,
    NOW(),
    NOW()
  );

INSERT INTO appointments (
  id, patient_id, clinic_id, doctor_id, treatment_plan_id,
  requested_date, requested_time, confirmed_date, confirmed_time,
  scheduled_date, scheduled_time, source, reason, status, workflow_status,
  contact_status, appointment_type, chief_complaints, specialist_id,
  specialist_assigned_at, specialist_confirmation_status, phone_number,
  created_at, updated_at
) VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'a1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    '20000000-0000-4000-8000-000000000001',
    CURRENT_DATE,
    '10:00',
    CURRENT_DATE,
    '10:00',
    CURRENT_DATE,
    '10:00',
    'phone',
    'RCT consultation',
    'confirmed',
    'confirmed',
    'confirmed',
    'RCT',
    '["Tooth pain"]'::jsonb,
    '07e07975-94d7-4c30-8a71-7e75f420092f',
    NOW(),
    'confirmed',
    '9876500001',
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'a1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    '20000000-0000-4000-8000-000000000002',
    CURRENT_DATE + INTERVAL '1 day',
    '12:30',
    CURRENT_DATE + INTERVAL '1 day',
    '12:30',
    CURRENT_DATE + INTERVAL '1 day',
    '12:30',
    'walkin',
    'Scaling consult',
    'scheduled',
    'scheduled',
    'pending_call',
    'Consultation',
    '["Bleeding gums"]'::jsonb,
    NULL,
    NULL,
    NULL,
    '9876500002',
    NOW(),
    NOW()
  );
