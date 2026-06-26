-- OPTIONAL seed: test patient "Demo Ramesh" mid-RCT — lets you open the
-- Treatment Workspace fully populated. Safe to skip in production.
-- Run AFTER 009. Idempotent (keyed on phone 9999988888).
BEGIN;
DO $$
DECLARE
    v_pid UUID; v_cid UUID; v_did UUID; v_plan UUID; v_item UUID; v_rct UUID; v_apt UUID;
BEGIN
    SELECT id INTO v_cid FROM clinics ORDER BY created_at LIMIT 1;
    SELECT id INTO v_did FROM staff WHERE role IN ('doctor','admin') ORDER BY created_at LIMIT 1;
    SELECT id INTO v_pid FROM patients WHERE phone='9999988888';
    IF v_pid IS NOT NULL THEN RETURN; END IF;

    INSERT INTO patients (name,phone,age,gender,preferred_clinic_id,existing_illnesses,total_visits,chairside_notes)
    VALUES ('Demo Ramesh','9999988888',42,'Male',v_cid,'["Diabetes","Hypertension"]'::jsonb,1,
            'Crown shade A2 selected. Prefers evening slots.') RETURNING id INTO v_pid;

    INSERT INTO treatment_plans (patient_id,clinic_id,doctor_id,name,status,sittings_completed)
    VALUES (v_pid,v_cid,v_did,'Treatment Plan — Demo','treatment_started',1) RETURNING id INTO v_plan;

    SELECT id INTO v_rct FROM procedure_catalog WHERE is_tooth_based AND work_steps!='[]'::jsonb ORDER BY name ILIKE '%root%' DESC, name LIMIT 1;

    INSERT INTO treatment_plan_items (plan_id,procedure_catalog_id,procedure_name,teeth,suggested_rate,doctor_rate,discount,final_amount,status,completed_steps,tooth_number)
    VALUES (v_plan,v_rct,'RCT','[36]'::jsonb,4500,4500,500,4000,'in_progress','["Access Opening","BMP"]'::jsonb,'36') RETURNING id INTO v_item;
    INSERT INTO tooth_treatments (patient_id,tooth_number,treatment_plan_id,plan_item_id,treatment_type,status)
    VALUES (v_pid,36,v_plan,v_item,'RCT','in_progress');

    INSERT INTO treatment_plan_items (plan_id,procedure_name,teeth,area_label,suggested_rate,doctor_rate,discount,final_amount,status,tooth_number)
    VALUES (v_plan,'Scaling','[]'::jsonb,'Full Mouth',1200,1200,0,1200,'advised',NULL);

    INSERT INTO tooth_conditions (patient_id,tooth_number,condition,recorded_by)
    VALUES (v_pid,46,'Deep Caries',v_did);

    INSERT INTO plan_revisions (plan_id,revision_number,change_summary,created_by) VALUES
        (v_plan,1,'Added RCT 36 — ₹4,000',v_did),
        (v_plan,2,'Added Scaling Full Mouth — ₹1,200',v_did),
        (v_plan,3,'Visit: Access Opening (RCT 36); BMP (RCT 36)',v_did);

    UPDATE treatment_plans SET estimated_cost=5200, final_payable=5200 WHERE id=v_plan;

    INSERT INTO prescriptions (patient_id,doctor_id,clinic_id,plan_id,serial_number,complaint,medicines,visible_advice,created_at)
    VALUES (v_pid,v_did,v_cid,v_plan,1,'Tooth Pain',
            '[{"name":"Amoxicillin","strength":"500mg","dose":"1 cap","frequency":"1-1-1","duration":"5 days","instructions":"After food"},
              {"name":"Paracetamol","strength":"650mg","dose":"1 tab","frequency":"1-0-1","duration":"3 days","instructions":"If pain"}]'::jsonb,
            'Avoid chewing on left side'||chr(10)||'Warm saline rinse twice daily', NOW()-INTERVAL '7 days');

    INSERT INTO treatment_sessions (patient_id,clinic_id,doctor_id,procedures_done,treatment_notes,next_step,amount_payable,amount_collected,started_at,finalized_at,status)
    VALUES (v_pid,v_cid,v_did,'[{"treatment":"RCT","teeth":[36],"step":"Access Opening"},{"treatment":"RCT","teeth":[36],"step":"BMP"}]'::jsonb,
            'Working length established','Obturation next sitting',2000,2000,NOW()-INTERVAL '7 days',NOW()-INTERVAL '7 days','closed');

    INSERT INTO payment_transactions (patient_id,clinic_id,amount,payment_mode,date)
    VALUES (v_pid,v_cid,2000,'cash',CURRENT_DATE-7);

    -- today's arrived appointment → shows in Doctor Queue ready to start
    INSERT INTO appointments (patient_id,clinic_id,doctor_id,requested_date,requested_time,reason,appointment_type,
        chief_complaints,source,status,workflow_status,contact_status,arrived_at)
    VALUES (v_pid,v_cid,v_did,CURRENT_DATE,'10:30','RCT','RCT','["Tooth Pain"]'::jsonb,'followup',
        'arrived','arrived','confirmed',NOW()) RETURNING id INTO v_apt;
END $$;
COMMIT;
