-- ============================================================
-- DentAssist v2 — Complete Database Schema
-- Treatment-centric clinic management
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── CLINICS ─────────────────────────────────────────
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    google_maps_link TEXT,
    phone VARCHAR(15) NOT NULL,
    whatsapp_number VARCHAR(15) NOT NULL,
    timings JSONB NOT NULL DEFAULT '{}',
    logo_url TEXT,
    doctor_name VARCHAR(100),
    doctor_degree VARCHAR(200),
    doctor_reg_no VARCHAR(50),
    signature_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STAFF ───────────────────────────────────────────
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('doctor','nurse','receptionist','admin')),
    phone VARCHAR(15) NOT NULL,
    telegram_chat_id VARCHAR(50),
    pin_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PATIENTS ────────────────────────────────────────
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    age INTEGER,
    gender VARCHAR(10),
    date_of_birth DATE,
    address TEXT,
    preferred_clinic_id UUID REFERENCES clinics(id),
    total_visits INTEGER DEFAULT 0,
    wa_session_state JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PATIENT HEALTH HISTORY ─────────────────────────
CREATE TABLE patient_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    diabetes BOOLEAN DEFAULT FALSE,
    hypertension BOOLEAN DEFAULT FALSE,
    heart_disease BOOLEAN DEFAULT FALSE,
    thyroid BOOLEAN DEFAULT FALSE,
    asthma BOOLEAN DEFAULT FALSE,
    kidney_disease BOOLEAN DEFAULT FALSE,
    liver_disease BOOLEAN DEFAULT FALSE,
    pregnant BOOLEAN DEFAULT FALSE,
    blood_thinner BOOLEAN DEFAULT FALSE,
    allergies TEXT DEFAULT '',
    previous_surgeries TEXT DEFAULT '',
    current_medicines TEXT DEFAULT '',
    smoking BOOLEAN DEFAULT FALSE,
    tobacco BOOLEAN DEFAULT FALSE,
    other_conditions TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEDICINE CATALOG ────────────────────────────────
CREATE TABLE medicine_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    strengths JSONB DEFAULT '[]',
    default_strength VARCHAR(50),
    default_dose VARCHAR(50),
    frequencies JSONB DEFAULT '[]',
    default_frequency VARCHAR(50),
    default_duration VARCHAR(30),
    instructions TEXT,
    contraindications TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROCEDURE CATALOG ───────────────────────────────
CREATE TABLE procedure_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    cost_min DECIMAL(10,2) DEFAULT 0,
    cost_max DECIMAL(10,2) DEFAULT 0,
    default_cost DECIMAL(10,2) DEFAULT 0,
    followup_days INTEGER,
    common_advice JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROCEDURE → MEDICINE MAPPING ───────────────────
CREATE TABLE procedure_medicine_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedure_catalog(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicine_catalog(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT TRUE,
    UNIQUE(procedure_id, medicine_id)
);

-- ─── APPOINTMENTS ────────────────────────────────────
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    doctor_id UUID REFERENCES staff(id),
    treatment_plan_id UUID,
    sitting_number INTEGER,
    requested_date DATE NOT NULL,
    requested_time TIME NOT NULL,
    confirmed_date DATE,
    confirmed_time TIME,
    source VARCHAR(20) DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','walkin','followup','emergency','phone')),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','arrived','in_progress','done','rescheduled','rejected','no_show','cancelled')),
    queue_position INTEGER,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    staff_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TREATMENT PLANS ─────────────────────────────────
CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    doctor_id UUID REFERENCES staff(id),
    name VARCHAR(200) NOT NULL,
    complaint TEXT,
    diagnosis TEXT,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    extra_charges DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    final_payable DECIMAL(10,2) DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    total_sittings_planned INTEGER DEFAULT 1,
    sittings_completed INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new','consultation_done','treatment_advised','treatment_started','in_progress','procedure_completed','payment_pending','followup_pending','closure_pending','closed','cancelled')),
    followup_date DATE,
    followup_notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ADD CONSTRAINT fk_apt_plan FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id);

-- ─── TREATMENT PLAN ITEMS (procedures in a plan) ────
CREATE TABLE treatment_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    procedure_catalog_id UUID REFERENCES procedure_catalog(id),
    procedure_name VARCHAR(100) NOT NULL,
    tooth_number VARCHAR(10),
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    actual_cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'advised' CHECK (status IN ('advised','in_progress','completed','cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TREATMENT SITTINGS ─────────────────────────────
CREATE TABLE treatment_sittings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    sitting_number INTEGER NOT NULL,
    date DATE,
    procedures_done TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned','completed','missed','cancelled')),
    amount_collected DECIMAL(10,2) DEFAULT 0,
    payment_mode VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRESCRIPTIONS ───────────────────────────────────
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    plan_id UUID REFERENCES treatment_plans(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES staff(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    serial_number INTEGER,
    diagnosis TEXT,
    doctor_raw_notes TEXT,
    medicines JSONB NOT NULL DEFAULT '[]',
    visible_advice TEXT,
    internal_notes TEXT,
    followup_date DATE,
    pdf_url TEXT,
    sent_via_whatsapp BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENT TRANSACTIONS ────────────────────────────
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    plan_id UUID REFERENCES treatment_plans(id),
    appointment_id UUID REFERENCES appointments(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash','upi','card','razorpay','bank_transfer','other')),
    razorpay_payment_id VARCHAR(100),
    razorpay_link_url TEXT,
    remarks TEXT,
    receipt_sent BOOLEAN DEFAULT FALSE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEDICINE REMINDERS ──────────────────────────────
CREATE TABLE medicine_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    medicine_name VARCHAR(100) NOT NULL,
    dose VARCHAR(50),
    frequency VARCHAR(30),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reminder_times JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEDIA GALLERY ───────────────────────────────────
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    patient_id UUID REFERENCES patients(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('photo','video','xray','before_after','document')),
    title VARCHAR(100),
    url TEXT NOT NULL,
    category VARCHAR(50),
    show_on_public BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── QR CODES ────────────────────────────────────────
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    source VARCHAR(50) NOT NULL,
    whatsapp_url TEXT NOT NULL,
    scan_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMMUNICATION LOG ───────────────────────────────
CREATE TABLE communication_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    direction VARCHAR(10) NOT NULL,
    channel VARCHAR(20) DEFAULT 'whatsapp',
    content TEXT,
    status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────
CREATE INDEX idx_apt_clinic_date ON appointments(clinic_id, confirmed_date);
CREATE INDEX idx_apt_status ON appointments(status, clinic_id);
CREATE INDEX idx_apt_patient ON appointments(patient_id);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_plans_patient ON treatment_plans(patient_id);
CREATE INDEX idx_plans_status ON treatment_plans(status, clinic_id);
CREATE INDEX idx_plan_items ON treatment_plan_items(plan_id);
CREATE INDEX idx_sittings_plan ON treatment_sittings(plan_id);
CREATE INDEX idx_pay_txn_patient ON payment_transactions(patient_id);
CREATE INDEX idx_pay_txn_plan ON payment_transactions(plan_id);
CREATE INDEX idx_pay_txn_date ON payment_transactions(date, clinic_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_med_catalog_active ON medicine_catalog(is_active, category);
CREATE INDEX idx_proc_catalog_active ON procedure_catalog(is_active, category);
CREATE INDEX idx_health_patient ON patient_health(patient_id);

-- ─── SEED: CLINICS ───────────────────────────────────
INSERT INTO clinics (id, name, short_name, address, phone, whatsapp_number, doctor_name, doctor_degree, doctor_reg_no, timings) VALUES
('a1111111-1111-1111-1111-111111111111', 'SmileCare Dental — Main Branch', 'Main', 'Civil Township, Rourkela, Odisha', '+919876500001', '+919876500001', 'Dr. Meera Sharma', 'BDS, MDS (Conservative Dentistry)', 'OD-12345', '{"mon_sat": "09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM", "sun": "Closed"}'),
('b2222222-2222-2222-2222-222222222222', 'SmileCare Dental — Sector 2', 'Sector 2', 'Sector 2, Near SBI, Rourkela, Odisha', '+919876500002', '+919876500001', 'Dr. Meera Sharma', 'BDS, MDS', 'OD-12345', '{"mon_sat": "09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM", "sun": "Closed"}');

INSERT INTO staff (id, clinic_id, name, role, phone, pin_hash) VALUES
('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Dr. Meera Sharma', 'doctor', '+919876500001', '$2b$12$LJ3m9X9Z8V8K4Y5W6Q7R8OzX1A2B3C4D5E6F7G8H9I0J1K2L3M4'),
('d2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Nurse Asha', 'nurse', '+919876500003', '$2b$12$LJ3m9X9Z8V8K4Y5W6Q7R8OzX1A2B3C4D5E6F7G8H9I0J1K2L3M4');

-- ─── SEED: MEDICINE CATALOG ──────────────────────────
INSERT INTO medicine_catalog (id, name, category, default_strength, default_dose, default_frequency, default_duration, instructions, strengths, frequencies) VALUES
('m001', 'Amoxicillin', 'Antibiotic', '500mg', '1 capsule', 'Three times daily', '5 days', 'After meals. Complete full course.', '["250mg","500mg"]', '["Three times daily","Twice daily"]'),
('m002', 'Augmentin (Amox+Clav)', 'Antibiotic', '625mg', '1 tablet', 'Twice daily', '5 days', 'After meals. Complete full course.', '["375mg","625mg","1g"]', '["Twice daily","Three times daily"]'),
('m003', 'Azithromycin', 'Antibiotic', '500mg', '1 tablet', 'Once daily', '3 days', '1 hour before meals.', '["250mg","500mg"]', '["Once daily"]'),
('m004', 'Metronidazole', 'Antibiotic', '400mg', '1 tablet', 'Three times daily', '5 days', 'After meals. Avoid alcohol.', '["200mg","400mg"]', '["Three times daily","Twice daily"]'),
('m005', 'Clindamycin', 'Antibiotic', '300mg', '1 capsule', 'Three times daily', '7 days', 'After meals with water.', '["150mg","300mg"]', '["Three times daily","Four times daily"]'),
('m006', 'Doxycycline', 'Antibiotic', '100mg', '1 capsule', 'Twice daily', '5 days', 'After meals. No lying down 30 min.', '["100mg"]', '["Twice daily","Once daily"]'),
('m007', 'Ibuprofen', 'Painkiller', '400mg', '1 tablet', 'Three times daily', '3 days', 'After meals. Not on empty stomach.', '["200mg","400mg","600mg"]', '["Three times daily","Twice daily","As needed (SOS)"]'),
('m008', 'Aceclofenac+Paracetamol', 'Painkiller', '100+325mg', '1 tablet', 'Twice daily', '3 days', 'After meals.', '["100+325mg","100+500mg"]', '["Twice daily","Three times daily"]'),
('m009', 'Paracetamol', 'Painkiller', '650mg', '1 tablet', 'As needed (SOS)', '3 days', 'Max 4 tablets/day.', '["500mg","650mg"]', '["Three times daily","As needed (SOS)"]'),
('m010', 'Ketorolac', 'Painkiller', '10mg', '1 tablet', 'As needed (SOS)', '2 days', 'After meals. Short-term only.', '["10mg"]', '["Three times daily","As needed (SOS)"]'),
('m011', 'Diclofenac', 'Painkiller', '50mg', '1 tablet', 'Twice daily', '3 days', 'After meals.', '["50mg"]', '["Twice daily","Three times daily"]'),
('m012', 'Pantoprazole', 'Antacid', '40mg', '1 tablet', 'Before breakfast', '5 days', 'Empty stomach, 30 min before food.', '["40mg"]', '["Once daily before breakfast","Twice daily"]'),
('m013', 'Ranitidine', 'Antacid', '150mg', '1 tablet', 'Twice daily', '5 days', 'Before meals.', '["150mg"]', '["Twice daily"]'),
('m014', 'Chlorhexidine Mouthwash', 'Mouthwash', '0.2%', '15ml', 'Twice daily', '7 days', 'Swish 30 sec and spit. No food 30 min.', '["0.2%"]', '["Twice daily","Three times daily"]'),
('m015', 'Benzydamine Mouthwash', 'Mouthwash', '0.15%', '15ml', 'Three times daily', '5 days', 'Swish and spit. Do not dilute.', '["0.15%"]', '["Three times daily"]'),
('m016', 'Lignocaine Gel 2%', 'Topical', '2%', 'Apply small amount', 'Three times daily', '3 days', 'On affected area. No food 30 min.', '["2%"]', '["Three times daily","As needed"]'),
('m017', 'Triamcinolone Paste', 'Topical Steroid', '0.1%', 'Apply small amount', 'Three times daily', '5 days', 'On ulcer after meals & bedtime.', '["0.1%"]', '["Three times daily"]'),
('m018', 'Clotrimazole Paint', 'Antifungal', '1%', 'Apply with cotton', 'Three times daily', '7 days', 'On affected area after meals.', '["1%"]', '["Three times daily"]'),
('m019', 'Desensitizing Toothpaste', 'Oral Care', '5% KNO3', 'Pea-sized', 'Twice daily', 'Ongoing', 'Brush gently 2 min. Apply on sensitive teeth.', '["5% KNO3"]', '["Twice daily"]'),
('m020', 'Warm Saline Gargle', 'Home Remedy', '1 tsp salt', '1 glass', '3-4 times daily', '5 days', 'Lukewarm water. Gargle 30 seconds.', '["1 tsp salt"]', '["3-4 times daily"]'),
('m021', 'Prednisolone', 'Steroid', '10mg', '1 tablet', 'Once daily morning', '5 days (tapering)', 'After breakfast. Do not stop abruptly.', '["5mg","10mg","20mg"]', '["Once daily morning"]'),
('m022', 'Cetirizine', 'Anti-allergy', '10mg', '1 tablet', 'At bedtime', '5 days', 'May cause drowsiness.', '["10mg"]', '["Once daily at bedtime"]'),
('m023', 'Ice Pack', 'Home Remedy', 'External', '15-20 min', 'Every 2-3 hours', 'First 24 hours', 'On cheek. Towel between ice and skin.', '["External"]', '["Every 2-3 hours"]');

-- ─── SEED: PROCEDURE CATALOG ─────────────────────────
INSERT INTO procedure_catalog (id, name, category, cost_min, cost_max, default_cost, followup_days, common_advice) VALUES
('p001', 'Consultation', 'Diagnostic', 200, 500, 300, NULL, '[]'),
('p002', 'X-Ray (IOPA)', 'Diagnostic', 150, 300, 200, NULL, '[]'),
('p003', 'X-Ray (OPG)', 'Diagnostic', 400, 800, 500, NULL, '[]'),
('p004', 'Scaling & Polishing', 'Preventive', 500, 1500, 1000, 180, '["Avoid eating 1 hour after","Mild sensitivity normal 2-3 days","Use soft bristle brush"]'),
('p005', 'Fluoride Application', 'Preventive', 300, 600, 400, 180, '["No eating/drinking 30 min"]'),
('p006', 'Filling — GIC', 'Restorative', 500, 1000, 600, NULL, '["Avoid chewing on filled side 2 hrs","Mild sensitivity normal"]'),
('p007', 'Filling — Composite', 'Restorative', 800, 2000, 1200, NULL, '["Avoid eating 2 hours","Avoid hot/cold food 24 hrs"]'),
('p008', 'Root Canal (RCT)', 'Endodontics', 3000, 8000, 5000, 7, '["Dont chew treated side until crown","Discomfort 2-3 days normal","Complete antibiotic course","Crown within 2 weeks"]'),
('p009', 'RCT Re-treatment', 'Endodontics', 5000, 12000, 7000, 7, '["Multiple visits needed"]'),
('p010', 'Pulpotomy', 'Endodontics', 1000, 2500, 1500, 7, '["Avoid hard food on treated side"]'),
('p011', 'Crown — PFM', 'Prosthodontics', 3000, 6000, 4000, 7, '["Temporary crown — avoid sticky food"]'),
('p012', 'Crown — Zirconia', 'Prosthodontics', 6000, 15000, 10000, 7, '["Temporary crown — avoid sticky food"]'),
('p013', 'Bridge (per unit)', 'Prosthodontics', 3000, 10000, 5000, 7, '["Clean under bridge with floss threader"]'),
('p014', 'Complete Denture', 'Prosthodontics', 5000, 15000, 10000, 3, '["Practice speaking","Start soft food","Remove at night"]'),
('p015', 'Partial Denture', 'Prosthodontics', 3000, 10000, 6000, 3, '["Remove at night","Clean daily"]'),
('p016', 'Extraction — Simple', 'Surgery', 500, 1500, 800, 7, '["Bite gauze 30 min","No spitting/straw 24 hrs","Cold compress 24 hrs","Warm saline next day","Soft diet 2 days"]'),
('p017', 'Extraction — Surgical', 'Surgery', 2000, 5000, 3000, 7, '["Bite gauze 45 min","Ice pack 24 hrs","No spitting/straw","Soft diet 3-4 days","Swelling 2-3 days normal"]'),
('p018', 'Abscess Drainage', 'Surgery', 500, 1500, 800, 3, '["Continue warm saline","Complete antibiotic course"]'),
('p019', 'Dental Implant', 'Implantology', 25000, 50000, 35000, 14, '["No chewing implant side 2 weeks","Soft diet 1 week","Follow-ups critical"]'),
('p020', 'Implant Crown', 'Implantology', 10000, 25000, 15000, 7, '["Avoid hard food initially"]'),
('p021', 'Braces — Metal', 'Orthodontics', 25000, 50000, 35000, 30, '["Discomfort 3-5 days normal","Use ortho wax","Avoid hard/sticky food"]'),
('p022', 'Braces — Ceramic', 'Orthodontics', 35000, 70000, 50000, 30, '["Avoid staining food (tea, coffee, turmeric)"]'),
('p023', 'Teeth Whitening', 'Cosmetic', 5000, 15000, 8000, NULL, '["Avoid colored food/drinks 48 hrs","Sensitivity 1-2 days normal"]'),
('p024', 'Veneer (per tooth)', 'Cosmetic', 5000, 15000, 8000, 7, '["Avoid biting hard objects"]'),
('p025', 'Deep Cleaning / SRP', 'Periodontics', 1000, 3000, 1500, 14, '["Sensitivity normal 1 week"]'),
('p026', 'Flap Surgery', 'Periodontics', 3000, 8000, 5000, 7, '["No brushing surgical area 1 week","Soft diet 3 days"]'),
('p027', 'Space Maintainer', 'Pediatric', 1500, 3000, 2000, 30, '["Dont play with appliance"]'),
('p028', 'Sealant', 'Preventive', 500, 1000, 700, 180, '["Avoid sticky food 24 hrs"]');

-- ─── SEED: PROCEDURE → MEDICINE MAPPINGS ─────────────
INSERT INTO procedure_medicine_map (procedure_id, medicine_id) VALUES
('p004', 'm014'), -- Scaling → Chlorhexidine
('p006', 'm019'), -- Filling GIC → Desensitizing
('p007', 'm019'), -- Filling Composite → Desensitizing
('p008', 'm001'), ('p008', 'm007'), ('p008', 'm012'), ('p008', 'm014'), -- RCT → Amox, Ibu, Panto, Chlorhex
('p009', 'm002'), ('p009', 'm007'), ('p009', 'm012'), -- Re-RCT → Augmentin, Ibu, Panto
('p016', 'm001'), ('p016', 'm007'), ('p016', 'm012'), ('p016', 'm020'), -- Simple Ext → Amox, Ibu, Panto, Saline
('p017', 'm002'), ('p017', 'm004'), ('p017', 'm007'), ('p017', 'm012'), ('p017', 'm020'), -- Surgical Ext → Augmentin, Metro, Ibu, Panto, Saline
('p018', 'm002'), ('p018', 'm004'), ('p018', 'm007'), ('p018', 'm012'), ('p018', 'm020'), -- Abscess → same
('p019', 'm002'), ('p019', 'm007'), ('p019', 'm012'), ('p019', 'm014'), -- Implant → Augmentin, Ibu, Panto, Chlorhex
('p021', 'm016'), -- Braces → Lignocaine gel
('p022', 'm016'),
('p023', 'm019'), -- Whitening → Desensitizing
('p025', 'm014'), ('p025', 'm004'), -- Deep Cleaning → Chlorhex, Metro
('p026', 'm002'), ('p026', 'm004'), ('p026', 'm007'), ('p026', 'm012'), ('p026', 'm014'); -- Flap → full combo
