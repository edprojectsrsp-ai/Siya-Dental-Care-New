-- ╔══════════════════════════════════════════════════════════════╗
-- ║  COMPREHENSIVE TEST SEED — every workflow state covered       ║
-- ║  Run AFTER 009. Idempotent (keyed on phone numbers 99999*).   ║
-- ║  Patients seeded:                                              ║
-- ║   • 9999900001 New (just walked in, no history)                ║
-- ║   • 9999900002 Follow-up scheduled today (pending call)        ║
-- ║   • 9999900003 Follow-up CONFIRMED today                       ║
-- ║   • 9999900004 ARRIVED — in Doctor Queue right now             ║
-- ║   • 9999900005 IN TREATMENT (active session)                   ║
-- ║   • 9999900006 PAYMENT PENDING (visit closed, awaiting cash)   ║
-- ║   • 9999900007 COMPLETED today (paid)                          ║
-- ║   • 9999900008 Emergency walk-in arrived                       ║
-- ║   • 9999900009 OVERDUE follow-up (3 weeks ago, missed)         ║
-- ║   • 9999900010 Mid-RCT (active plan, 2 visits done)            ║
-- ║   • 9999900011 Multi-item plan (RCT + Crown + Scaling)         ║
-- ║   • 9999900012 NO-SHOW today (didn't answer call)              ║
-- ║   • 9999900013 Duplicate phone (family member)                 ║
-- ║   • 9999900014 Pediatric — child teeth FDI 51–85               ║
-- ║   • 9999900015 Closed treatment (archived, can re-open case)   ║
-- ╚══════════════════════════════════════════════════════════════╝
BEGIN;

DO $$
DECLARE
  v_cid UUID; v_did UUID;
  v_p1 UUID; v_p2 UUID; v_p3 UUID; v_p4 UUID; v_p5 UUID; v_p6 UUID;
  v_p7 UUID; v_p8 UUID; v_p9 UUID; v_p10 UUID; v_p11 UUID; v_p12 UUID;
  v_p13 UUID; v_p14 UUID; v_p15 UUID;
  v_plan UUID; v_item UUID; v_apt UUID; v_sess UUID;
  v_rct UUID; v_crown UUID; v_filling UUID; v_scaling UUID; v_extr UUID;
BEGIN
  SELECT id INTO v_cid FROM clinics ORDER BY created_at LIMIT 1;
  SELECT id INTO v_did FROM staff WHERE role IN ('doctor','admin') ORDER BY created_at LIMIT 1;
  SELECT id INTO v_rct FROM procedure_catalog WHERE is_tooth_based AND name ILIKE '%rct%' LIMIT 1;
  SELECT id INTO v_crown FROM procedure_catalog WHERE name ILIKE '%crown%' LIMIT 1;
  SELECT id INTO v_filling FROM procedure_catalog WHERE name ILIKE '%filling%' LIMIT 1;
  SELECT id INTO v_scaling FROM procedure_catalog WHERE name ILIKE '%scaling%' LIMIT 1;
  SELECT id INTO v_extr FROM procedure_catalog WHERE name ILIKE '%extraction%' LIMIT 1;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM patients WHERE phone='9999900001') THEN
    RAISE NOTICE 'Test seed already present — skipping.';
    RETURN;
  END IF;

  -- ━━━ P1: NEW patient (just walked in, no history) ━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Anita Sharma','9999900001',28,'Female',v_cid,0) RETURNING id INTO v_p1;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status)
  VALUES (v_p1,v_cid,v_did,CURRENT_DATE,'09:30','Consultation','Consultation','["Tooth Pain"]'::jsonb,
    'walkin','scheduled','scheduled','pending_call');

  -- ━━━ P2: FOLLOW-UP scheduled today, pending call ━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits,existing_illnesses)
  VALUES ('Rajesh Mohanty','9999900002',45,'Male',v_cid,3,'["Diabetes"]'::jsonb) RETURNING id INTO v_p2;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status)
  VALUES (v_p2,v_cid,v_did,CURRENT_DATE,'10:00','RCT','RCT','["RCT continuation"]'::jsonb,
    'followup','scheduled','scheduled','pending_call');

  -- ━━━ P3: CONFIRMED today (called and confirmed) ━━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Priya Patel','9999900003',32,'Female',v_cid,2) RETURNING id INTO v_p3;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status)
  VALUES (v_p3,v_cid,v_did,CURRENT_DATE,'10:30','Scaling','Scaling','["Cleaning"]'::jsonb,
    'followup','confirmed','confirmed','confirmed');

  -- ━━━ P4: ARRIVED — in Doctor Queue right now ━━━━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits,existing_illnesses,chairside_notes)
  VALUES ('Sanjay Das','9999900004',38,'Male',v_cid,1,'["Hypertension"]'::jsonb,
    'Crown shade A2 selected last visit') RETURNING id INTO v_p4;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status,arrived_at)
  VALUES (v_p4,v_cid,v_did,CURRENT_DATE,'09:00','Crown Cementation','Crown Cementation',
    '["Crown ready for cementation"]'::jsonb,'followup','arrived','arrived','confirmed',NOW()-INTERVAL '12 minutes');

  -- ━━━ P5: IN TREATMENT (active session) ━━━━━━━━━━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Meera Singh','9999900005',29,'Female',v_cid,2) RETURNING id INTO v_p5;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status,arrived_at,started_at)
  VALUES (v_p5,v_cid,v_did,CURRENT_DATE,'08:30','Filling','Filling','["Caries on 26"]'::jsonb,
    'followup','in_treatment','in_treatment','confirmed',NOW()-INTERVAL '45 minutes',NOW()-INTERVAL '18 minutes')
  RETURNING id INTO v_apt;
  INSERT INTO treatment_sessions (patient_id,clinic_id,doctor_id,appointment_id,started_at,status)
  VALUES (v_p5,v_cid,v_did,v_apt,NOW()-INTERVAL '18 minutes','in_progress') RETURNING id INTO v_sess;

  -- ━━━ P6: PAYMENT PENDING (visit closed, awaiting nurse collect) ━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Vikram Reddy','9999900006',52,'Male',v_cid,5) RETURNING id INTO v_p6;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status,arrived_at,started_at)
  VALUES (v_p6,v_cid,v_did,CURRENT_DATE,'08:00','Extraction','Extraction','["Tooth 48 extraction"]'::jsonb,
    'followup','payment_pending','payment_pending','confirmed',NOW()-INTERVAL '90 minutes',NOW()-INTERVAL '60 minutes')
  RETURNING id INTO v_apt;
  INSERT INTO treatment_sessions (patient_id,clinic_id,doctor_id,appointment_id,procedures_done,treatment_notes,
    amount_payable,started_at,finalized_at,status)
  VALUES (v_p6,v_cid,v_did,v_apt,'[{"treatment":"Extraction","teeth":[48],"step":"Extraction Completed"}]'::jsonb,
    'Clean extraction',1000,NOW()-INTERVAL '60 minutes',NOW()-INTERVAL '15 minutes','awaiting_payment') RETURNING id INTO v_sess;
  INSERT INTO clinic_notifications (clinic_id,notification_type,recipient_role,sender_staff_id,title,message,priority,related_patient_id,related_session_id)
  VALUES (v_cid,'payment_to_collect','nurse',v_did,'💰 Collect ₹1,000 — Vikram Reddy',
    'Extraction tooth 48','high',v_p6,v_sess);

  -- ━━━ P7: COMPLETED today (paid in full) ━━━━━━━━━━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Kavita Joshi','9999900007',41,'Female',v_cid,4) RETURNING id INTO v_p7;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status,arrived_at,started_at)
  VALUES (v_p7,v_cid,v_did,CURRENT_DATE,'07:30','Cleaning','Scaling','["Cleaning"]'::jsonb,
    'followup','completed','completed','confirmed',NOW()-INTERVAL '120 minutes',NOW()-INTERVAL '90 minutes')
  RETURNING id INTO v_apt;
  INSERT INTO treatment_sessions (patient_id,clinic_id,doctor_id,appointment_id,procedures_done,treatment_notes,
    amount_payable,amount_collected,started_at,finalized_at,status)
  VALUES (v_p7,v_cid,v_did,v_apt,'[{"treatment":"Scaling","step":"Scaling Completed"},{"treatment":"Scaling","step":"Polishing"}]'::jsonb,
    'Routine cleaning',1200,1200,NOW()-INTERVAL '90 minutes',NOW()-INTERVAL '50 minutes','closed');
  INSERT INTO payment_transactions (patient_id,clinic_id,appointment_id,amount,payment_mode,date)
  VALUES (v_p7,v_cid,v_apt,1200,'upi',CURRENT_DATE);

  -- ━━━ P8: EMERGENCY walk-in arrived ━━━━━━━━━━━━━━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Arjun Nair','9999900008',24,'Male',v_cid,0) RETURNING id INTO v_p8;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status,arrived_at)
  VALUES (v_p8,v_cid,v_did,CURRENT_DATE,CAST(TO_CHAR(NOW(),'HH24:MI') AS TIME),'Tooth Pain','Tooth Pain',
    '["Severe pain","Swelling"]'::jsonb,'emergency','arrived','arrived','confirmed',NOW()-INTERVAL '5 minutes');

  -- ━━━ P9: OVERDUE follow-up (was due 21 days ago) ━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Sunita Mohapatra','9999900009',58,'Female',v_cid,3) RETURNING id INTO v_p9;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status)
  VALUES (v_p9,v_cid,v_did,CURRENT_DATE-21,'10:00','Follow-up','Follow-up','["RCT review"]'::jsonb,
    'followup','scheduled','scheduled','no_answer');

  -- ━━━ P10: MID-RCT patient — active plan, 2 visits done ━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits,existing_illnesses)
  VALUES ('Ramesh Kumar','9999900010',42,'Male',v_cid,2,'["Diabetes"]'::jsonb) RETURNING id INTO v_p10;
  INSERT INTO treatment_plans (patient_id,clinic_id,doctor_id,name,status,sittings_completed,estimated_cost,final_payable)
  VALUES (v_p10,v_cid,v_did,'RCT 36','treatment_started',2,4500,4500) RETURNING id INTO v_plan;
  INSERT INTO treatment_plan_items (plan_id,procedure_catalog_id,procedure_name,teeth,suggested_rate,doctor_rate,
    discount,final_amount,status,completed_steps,tooth_number)
  VALUES (v_plan,v_rct,'RCT','[36]'::jsonb,4500,4500,0,4500,'in_progress',
    '["Access Opening","BMP"]'::jsonb,'36') RETURNING id INTO v_item;
  INSERT INTO tooth_treatments (patient_id,tooth_number,treatment_plan_id,plan_item_id,treatment_type,status)
  VALUES (v_p10,36,v_plan,v_item,'RCT','in_progress');
  INSERT INTO plan_revisions (plan_id,revision_number,change_summary,created_by) VALUES
    (v_plan,1,'Added RCT 36 — ₹4,500',v_did),
    (v_plan,2,'Visit: Access Opening (RCT 36)',v_did),
    (v_plan,3,'Visit: BMP (RCT 36)',v_did);
  INSERT INTO prescriptions (patient_id,doctor_id,clinic_id,plan_id,serial_number,complaint,medicines,visible_advice,created_at) VALUES
    (v_p10,v_did,v_cid,v_plan,1,'Tooth Pain',
      '[{"name":"Amoxicillin","strength":"500mg","frequency":"1-1-1","duration":"5 days"},
        {"name":"Ibuprofen","strength":"400mg","frequency":"1-0-1","duration":"3 days"}]'::jsonb,
      'Warm saline rinse',NOW()-INTERVAL '14 days'),
    (v_p10,v_did,v_cid,v_plan,2,'Sensitivity post-BMP',
      '[{"name":"Paracetamol","strength":"650mg","frequency":"1-0-1","duration":"3 days"}]'::jsonb,
      'Avoid chewing on left side',NOW()-INTERVAL '7 days');
  INSERT INTO payment_transactions (patient_id,clinic_id,plan_id,amount,payment_mode,date) VALUES
    (v_p10,v_cid,v_plan,1500,'cash',CURRENT_DATE-14),
    (v_p10,v_cid,v_plan,1500,'upi',CURRENT_DATE-7);
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status,arrived_at)
  VALUES (v_p10,v_cid,v_did,CURRENT_DATE,'11:00','RCT','RCT','["Obturation sitting"]'::jsonb,
    'followup','arrived','arrived','confirmed',NOW()-INTERVAL '8 minutes');

  -- ━━━ P11: MULTI-ITEM plan (RCT + Crown + Scaling) ━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Deepa Iyer','9999900011',35,'Female',v_cid,1) RETURNING id INTO v_p11;
  INSERT INTO treatment_plans (patient_id,clinic_id,doctor_id,name,status,estimated_cost,final_payable)
  VALUES (v_p11,v_cid,v_did,'Full Treatment','treatment_advised',9700,9700) RETURNING id INTO v_plan;
  INSERT INTO treatment_plan_items (plan_id,procedure_catalog_id,procedure_name,teeth,suggested_rate,doctor_rate,discount,final_amount,status,tooth_number) VALUES
    (v_plan,v_rct,'RCT','[46]'::jsonb,4500,4500,500,4000,'advised','46'),
    (v_plan,v_crown,'Crown','[46]'::jsonb,3500,3500,0,3500,'advised','46'),
    (v_plan,v_scaling,'Scaling','[]'::jsonb,1200,1200,0,1200,'advised',NULL),
    (v_plan,v_filling,'Filling','[15]'::jsonb,800,1000,0,1000,'advised','15');
  UPDATE treatment_plan_items SET area_label='Full Mouth' WHERE plan_id=v_plan AND procedure_name='Scaling';
  INSERT INTO tooth_treatments (patient_id,tooth_number,treatment_plan_id,treatment_type,status)
  SELECT v_p11,(teeth->>0)::int,v_plan,procedure_name,'planned' FROM treatment_plan_items
  WHERE plan_id=v_plan AND jsonb_array_length(teeth)>0;
  INSERT INTO plan_revisions (plan_id,revision_number,change_summary,created_by) VALUES
    (v_plan,1,'Added RCT 46 — ₹4,000',v_did),
    (v_plan,2,'Added Crown 46 — ₹3,500',v_did),
    (v_plan,3,'Added Scaling Full Mouth — ₹1,200',v_did),
    (v_plan,4,'Added Filling 15 — ₹1,000',v_did);
  -- mark some tooth issues
  INSERT INTO tooth_conditions (patient_id,tooth_number,condition,recorded_by) VALUES
    (v_p11,46,'Deep Caries',v_did),(v_p11,15,'Caries',v_did);

  -- ━━━ P12: NO-SHOW today (didn't answer call diary) ━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Mohan Lal','9999900012',47,'Male',v_cid,2) RETURNING id INTO v_p12;
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    source,status,workflow_status,contact_status)
  VALUES (v_p12,v_cid,v_did,CURRENT_DATE,'09:45','Follow-up','Follow-up',
    'followup','scheduled','scheduled','call_back_later');

  -- ━━━ P13: DUPLICATE phone (family member sharing number) ━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Geeta Sharma','9999900001',55,'Female',v_cid,1) RETURNING id INTO v_p13;
  -- Same phone as P1 (Anita) — tests duplicate detection popup

  -- ━━━ P14: PEDIATRIC patient — child teeth ━━━━━━━━━━━━━━━━━━━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Aarav Mishra','9999900014',8,'Male',v_cid,1) RETURNING id INTO v_p14;
  INSERT INTO treatment_plans (patient_id,clinic_id,doctor_id,name,status,estimated_cost,final_payable)
  VALUES (v_p14,v_cid,v_did,'Pediatric Filling','treatment_advised',1600,1600) RETURNING id INTO v_plan;
  INSERT INTO treatment_plan_items (plan_id,procedure_catalog_id,procedure_name,teeth,suggested_rate,doctor_rate,discount,final_amount,status,tooth_number)
  VALUES (v_plan,v_filling,'Filling','[75,85]'::jsonb,1600,1600,0,1600,'advised','75') RETURNING id INTO v_item;
  INSERT INTO tooth_treatments (patient_id,tooth_number,treatment_plan_id,plan_item_id,treatment_type,status) VALUES
    (v_p14,75,v_plan,v_item,'Filling','planned'),(v_p14,85,v_plan,v_item,'Filling','planned');
  INSERT INTO plan_revisions (plan_id,revision_number,change_summary,created_by) VALUES
    (v_plan,1,'Added Filling 75,85 — ₹1,600',v_did);
  INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
    chief_complaints,source,status,workflow_status,contact_status)
  VALUES (v_p14,v_cid,v_did,CURRENT_DATE+1,'15:00','Filling','Filling','["Cavity on milk tooth"]'::jsonb,
    'followup','scheduled','scheduled','confirmed');

  -- ━━━ P15: CLOSED treatment (archived case, with full history) ━
  INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,total_visits)
  VALUES ('Lakshmi Devi','9999900015',62,'Female',v_cid,6) RETURNING id INTO v_p15;
  INSERT INTO treatment_plans (patient_id,clinic_id,doctor_id,name,status,is_archived,archived_at,sittings_completed,estimated_cost,final_payable,created_at)
  VALUES (v_p15,v_cid,v_did,'Implant Treatment','closed',TRUE,NOW()-INTERVAL '30 days',6,30000,30000,NOW()-INTERVAL '120 days') RETURNING id INTO v_plan;
  INSERT INTO treatment_plan_items (plan_id,procedure_catalog_id,procedure_name,teeth,suggested_rate,doctor_rate,discount,final_amount,status,tooth_number,completed_steps)
  VALUES (v_plan,(SELECT id FROM procedure_catalog WHERE name ILIKE '%implant%' LIMIT 1),'Implant','[36]'::jsonb,30000,30000,0,30000,'completed','36',
    '["Implant Placement","Healing Cap","Impression","Crown Placement"]'::jsonb);
  INSERT INTO tooth_treatments (patient_id,tooth_number,treatment_plan_id,treatment_type,status,completed_at)
  VALUES (v_p15,36,v_plan,'Implant','completed',NOW()-INTERVAL '30 days');
  INSERT INTO plan_revisions (plan_id,revision_number,change_summary,created_by,created_at) VALUES
    (v_plan,1,'Added Implant 36 — ₹30,000',v_did,NOW()-INTERVAL '120 days'),
    (v_plan,2,'Visit: Implant Placement',v_did,NOW()-INTERVAL '120 days'),
    (v_plan,3,'Visit: Healing review',v_did,NOW()-INTERVAL '90 days'),
    (v_plan,4,'Visit: Impression',v_did,NOW()-INTERVAL '60 days'),
    (v_plan,5,'Visit: Crown Placement',v_did,NOW()-INTERVAL '30 days'),
    (v_plan,6,'Treatment closed & archived',v_did,NOW()-INTERVAL '30 days');
  INSERT INTO payment_transactions (patient_id,clinic_id,plan_id,amount,payment_mode,date) VALUES
    (v_p15,v_cid,v_plan,10000,'cash',CURRENT_DATE-120),
    (v_p15,v_cid,v_plan,10000,'upi',CURRENT_DATE-60),
    (v_p15,v_cid,v_plan,10000,'card',CURRENT_DATE-30);

  RAISE NOTICE '✓ 15 test patients seeded covering every workflow state';
END $$;

COMMIT;
