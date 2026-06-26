-- ═══════════════════════════════════════════════════════
-- DentAssist — Seed Test Patients for End-to-End Testing
-- Run after 001_complete_schema.sql
-- ═══════════════════════════════════════════════════════

-- Update clinic to Siya Dental Care
UPDATE clinics SET 
    name = 'Siya Dental Care — Main Branch',
    short_name = 'Main',
    doctor_name = 'Dr. Madhu Edward',
    doctor_degree = 'BDS',
    doctor_reg_no = 'OD-28456',
    address = 'Udit Nagar, Rourkela, Odisha - 769012'
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE clinics SET 
    name = 'Siya Dental Care — Sector 2',
    short_name = 'Sector 2',
    doctor_name = 'Dr. Madhu Edward',
    doctor_degree = 'BDS',
    doctor_reg_no = 'OD-28456',
    address = 'Sector 2, Near SBI Main Branch, Rourkela, Odisha'
WHERE id = 'b2222222-2222-2222-2222-222222222222';

UPDATE staff SET name = 'Dr. Madhu Edward' WHERE id = 'd1111111-1111-1111-1111-111111111111';
UPDATE staff SET name = 'Nurse Priya' WHERE id = 'd2222222-2222-2222-2222-222222222222';

-- ── TEST PATIENTS ────────────────────────────────────
INSERT INTO patients (id, name, phone, age, gender, preferred_clinic_id, total_visits) VALUES
('e1111111-1111-1111-1111-111111111111', 'Ananya Sahoo', '+919876501001', 28, 'Female', 'a1111111-1111-1111-1111-111111111111', 3),
('e2222222-2222-2222-2222-222222222222', 'Rajesh Panda', '+919876501002', 52, 'Male', 'a1111111-1111-1111-1111-111111111111', 5),
('e3333333-3333-3333-3333-333333333333', 'Priya Nayak', '+919876501003', 35, 'Female', 'a1111111-1111-1111-1111-111111111111', 1),
('e4444444-4444-4444-4444-444444444444', 'Suresh Mohanty', '+919876501004', 45, 'Male', 'b2222222-2222-2222-2222-222222222222', 2),
('e5555555-5555-5555-5555-555555555555', 'Meera Singh', '+919876501005', 22, 'Female', 'a1111111-1111-1111-1111-111111111111', 0),
('e6666666-6666-6666-6666-666666666666', 'Arun Das', '+919876501006', 60, 'Male', 'a1111111-1111-1111-1111-111111111111', 4)
ON CONFLICT (phone) DO NOTHING;

-- ── HEALTH HISTORIES ─────────────────────────────────
INSERT INTO patient_health (patient_id, diabetes, hypertension, blood_thinner, allergies, smoking) VALUES
('e1111111-1111-1111-1111-111111111111', false, false, false, 'Penicillin', false),
('e2222222-2222-2222-2222-222222222222', true, true, true, '', true),
('e3333333-3333-3333-3333-333333333333', false, false, false, '', false),
('e4444444-4444-4444-4444-444444444444', true, false, false, 'Sulfa drugs', false),
('e6666666-6666-6666-6666-666666666666', false, true, false, '', true)
ON CONFLICT (patient_id) DO NOTHING;

-- ── TEST APPOINTMENTS (today) ────────────────────────
INSERT INTO appointments (id, patient_id, clinic_id, requested_date, requested_time, confirmed_date, confirmed_time, source, reason, status, arrived_at) VALUES
('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE, '10:00', CURRENT_DATE, '10:00', 'whatsapp', 'Tooth pain upper left since 3 days', 'confirmed', NULL),
('f2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30', 'followup', 'RCT Session 3 — Tooth #26', 'arrived', NOW()),
('f3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE, '11:00', CURRENT_DATE, '11:00', 'whatsapp', 'Cleaning and check-up', 'confirmed', NULL),
('f4444444-4444-4444-4444-444444444444', 'e5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE, '11:30', CURRENT_DATE, '11:30', 'walkin', 'Wisdom tooth pain — emergency', 'arrived', NOW()),
('f5555555-5555-5555-5555-555555555555', 'e6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE, '12:00', CURRENT_DATE, '12:00', 'phone', 'Crown fitting follow-up', 'confirmed', NULL),
('f6666666-6666-6666-6666-666666666666', 'e4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE + 1, '10:00', NULL, NULL, 'whatsapp', 'Implant consultation', 'pending', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── TREATMENT PLAN (Rajesh's ongoing RCT) ────────────
INSERT INTO treatment_plans (id, patient_id, clinic_id, doctor_id, name, complaint, diagnosis, estimated_cost, discount, extra_charges, final_payable, total_paid, balance, total_sittings_planned, sittings_completed, status, followup_date) VALUES
('g1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111',
 'RCT + Crown — Tooth #26', 'Severe pain in upper left molar, throbbing, worse at night', 'Irreversible pulpitis with periapical abscess — #26',
 11800, 800, 0, 11000, 5000, 6000, 4, 2, 'in_progress', CURRENT_DATE + 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO treatment_plan_items (plan_id, procedure_name, tooth_number, estimated_cost, status) VALUES
('g1111111-1111-1111-1111-111111111111', 'Root Canal (RCT)', '26', 5000, 'in_progress'),
('g1111111-1111-1111-1111-111111111111', 'Crown — Zirconia', '26', 6000, 'advised'),
('g1111111-1111-1111-1111-111111111111', 'X-Ray (IOPA)', '26', 200, 'completed'),
('g1111111-1111-1111-1111-111111111111', 'Consultation', NULL, 300, 'completed');

INSERT INTO treatment_sittings (plan_id, sitting_number, date, procedures_done, status, amount_collected, payment_mode) VALUES
('g1111111-1111-1111-1111-111111111111', 1, CURRENT_DATE - 14, 'Consultation, X-Ray, RCT access opening', 'completed', 3000, 'cash'),
('g1111111-1111-1111-1111-111111111111', 2, CURRENT_DATE - 7, 'RCT BMP + Working length', 'completed', 2000, 'upi'),
('g1111111-1111-1111-1111-111111111111', 3, CURRENT_DATE, 'RCT Obturation — today', 'planned', 0, NULL),
('g1111111-1111-1111-1111-111111111111', 4, CURRENT_DATE + 14, 'Crown fitting', 'planned', 0, NULL);

INSERT INTO payment_transactions (patient_id, plan_id, clinic_id, amount, payment_mode, remarks, date) VALUES
('e2222222-2222-2222-2222-222222222222', 'g1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 3000, 'cash', 'RCT Session 1', CURRENT_DATE - 14),
('e2222222-2222-2222-2222-222222222222', 'g1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 2000, 'upi', 'RCT Session 2', CURRENT_DATE - 7);

-- ── PREVIOUS PRESCRIPTION (Rajesh) ───────────────────
INSERT INTO prescriptions (patient_id, doctor_id, clinic_id, serial_number, diagnosis, doctor_raw_notes, medicines, visible_advice, followup_date) VALUES
('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1,
 'Irreversible pulpitis #26',
 'RCT access opening, X-Ray',
 '[{"name":"Amoxicillin","strength":"500mg","dose":"1 cap","frequency":"Three times daily","duration":"5 days","instructions":"After meals"},{"name":"Ibuprofen","strength":"400mg","dose":"1 tab","frequency":"Three times daily","duration":"3 days","instructions":"After meals"},{"name":"Pantoprazole","strength":"40mg","dose":"1 tab","frequency":"Before breakfast","duration":"5 days","instructions":"Empty stomach"}]',
 'Avoid chewing on left side\nComplete antibiotic course\nWarm saline gargle 3-4 times daily',
 CURRENT_DATE);

