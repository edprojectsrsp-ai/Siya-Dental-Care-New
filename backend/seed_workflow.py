"""Idempotent workflow seed — varied patients across every workflow state.
Run:  python seed_workflow.py
Re-runnable: deletes its own fixed-UUID rows first, then re-inserts.
"""
import asyncio, asyncpg, json
from datetime import date, datetime, timedelta, time as time_type

def to_time(s): h, m = s.split(":"); return time_type(int(h), int(m))

DSN = "postgresql://postgres:abc123@localhost:5432/dentassist"
CLINIC = "a1111111-1111-1111-1111-111111111111"
DOCTOR = "d1111111-1111-1111-1111-111111111111"
NURSE  = "d2222222-2222-2222-2222-222222222222"

def pid(n): return f"a0a0a0a0-0000-0000-0000-{n:012d}"
def aid(n): return f"b0b0b0b0-0000-0000-0000-{n:012d}"
def sid(n): return f"c0c0c0c0-0000-0000-0000-{n:012d}"
def rid(n): return f"d0d0d0d0-0000-0000-0000-{n:012d}"
def eid(n): return f"e0e0e0e0-0000-0000-0000-{n:012d}"
def fid(n): return f"f0f0f0f0-0000-0000-0000-{n:012d}"

# name, phone, age, gender, visits, illnesses, is_new
PATIENTS = [
    (1,  "Aarav Sharma",  "9000000001", 28, "Male",   0, [],                 True),
    (2,  "Diya Patel",    "9000000002", 34, "Female", 3, ["Diabetes"],       False),
    (3,  "Vivaan Gupta",  "9000000003", 45, "Male",   1, [],                 False),
    (4,  "Ananya Singh",  "9000000004", 52, "Female", 2, ["Hypertension"],   False),
    (5,  "Aditya Rao",    "9000000005", 30, "Male",   1, [],                 False),
    (6,  "Ishaan Mehta",  "9000000006", 40, "Male",   4, [],                 False),
    (7,  "Kiara Nair",    "9000000007", 26, "Female", 2, [],                 False),
    (8,  "Rohan Verma",   "9000000008", 38, "Male",   2, ["Asthma"],         False),
    (9,  "Saanvi Joshi",  "9000000009", 22, "Female", 1, [],                 False),
    (10, "Reyansh Kumar", "9000000010", 60, "Male",   5, ["Heart Disease"],  False),
    (11, "Myra Reddy",    "9000000011", 19, "Female", 0, [],                 True),
]

# n_patient, n_appt, offset_days, time, source, workflow, reason
APPTS = [
    (1,  1,  0, "09:30", "walkin",   "scheduled",       "New patient — toothache"),
    (2,  2,  0, "10:00", "whatsapp", "confirmed",       "Routine cleaning"),
    (3,  3,  0, "10:30", "phone",    "arrived",         "RCT review"),
    (4,  4,  0, "11:00", "followup", "ready",           "Extraction 26"),
    (5,  5,  0, "11:30", "walkin",   "in_treatment",    "Composite filling 14"),
    (6,  6,  0, "12:00", "whatsapp", "payment_pending", "Crown preparation 16"),
    (7,  7,  0, "09:00", "followup", "completed",       "Scaling & polishing"),
    (8,  8,  0, "12:30", "followup", "ready",           "RCT sitting #2 — 36"),
    (9,  9,  1, "10:00", "whatsapp", "scheduled",       "Consultation"),
    (10, 10, 3, "11:00", "phone",    "scheduled",       "Denture fitting"),
    (11, 11, 7, "16:00", "whatsapp", "scheduled",       "Braces consultation"),
]

async def main():
    c = await asyncpg.connect(DSN)
    today = date.today()
    now = datetime.now()

    # ---- migration 007 (idempotent): common_complaints ----
    await c.execute("""CREATE TABLE IF NOT EXISTS common_complaints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_name VARCHAR(150) NOT NULL UNIQUE,
        category VARCHAR(50) DEFAULT 'general', created_at TIMESTAMP DEFAULT NOW())""")
    for cm in ["Toothache","Sensitivity to hot/cold","Bleeding gums","Swelling","Bad breath",
               "Broken tooth","Loose tooth","Pain while chewing","Food lodgement","Cavity",
               "Discoloured tooth","Wisdom tooth pain","Clicking jaw","Dry socket","Mouth ulcer"]:
        await c.execute("INSERT INTO common_complaints (complaint_name) VALUES($1) ON CONFLICT (complaint_name) DO NOTHING", cm)

    # ---- cleanup previous seed (FK-safe order; by patient so runtime-created rows are caught too) ----
    P = "a0a0a0a0%"
    await c.execute("DELETE FROM appointment_call_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id::text LIKE $1)", P)
    await c.execute("DELETE FROM payment_transactions WHERE patient_id::text LIKE $1", P)
    await c.execute("DELETE FROM treatment_sessions WHERE patient_id::text LIKE $1", P)
    await c.execute("DELETE FROM prescriptions WHERE patient_id::text LIKE $1", P)
    await c.execute("DELETE FROM appointments WHERE patient_id::text LIKE $1", P)
    await c.execute("DELETE FROM patients WHERE id::text LIKE $1", P)

    # ---- patients ----
    for n, name, phone, age, gender, visits, ills, isnew in PATIENTS:
        await c.execute("""INSERT INTO patients (id,name,phone,age,gender,preferred_clinic_id,
            total_visits,is_new_no_treatment,existing_illnesses,created_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW())""",
            pid(n), name, phone, age, gender, CLINIC, visits, isnew, json.dumps(ills))

    # ---- appointments ----
    # Legacy `status` column has a CHECK constraint; the new states live in workflow_status.
    STATUS_MAP = {"scheduled":"pending","confirmed":"confirmed","arrived":"arrived",
                  "ready":"arrived","in_treatment":"in_progress","payment_pending":"in_progress",
                  "completed":"done"}
    for np, na, off, tm, src, wf, reason in APPTS:
        d = today + timedelta(days=off)
        status = STATUS_MAP.get(wf, "pending")
        await c.execute("""INSERT INTO appointments (id,patient_id,clinic_id,doctor_id,
            requested_date,requested_time,confirmed_date,confirmed_time,source,reason,
            status,workflow_status,created_at)
            VALUES($1,$2,$3,$4,$5,$6,$5,$6,$7,$8,$9,$10,NOW())""",
            aid(na), pid(np), CLINIC, DOCTOR, d, to_time(tm), src, reason, status, wf)

    # ---- call log: patient 2 confirmed (green in Calls); patient 1 left uncalled (yellow) ----
    await c.execute("""INSERT INTO appointment_call_logs (id,appointment_id,called_by_staff_id,call_status,call_time)
        VALUES($1,$2,$3,'confirmed',NOW())""", fid(2), aid(2), NURSE)

    # ---- treatment sessions ----
    # #5 in-treatment (open)
    await c.execute("""INSERT INTO treatment_sessions (id,patient_id,doctor_id,clinic_id,appointment_id,
        started_at,status,amount_payable) VALUES($1,$2,$3,$4,$5,NOW(),'in_progress',0)""",
        sid(5), pid(5), DOCTOR, CLINIC, aid(5))
    # #6 awaiting payment (₹4500)
    await c.execute("""INSERT INTO treatment_sessions (id,patient_id,doctor_id,clinic_id,appointment_id,
        started_at,finalized_at,status,procedures_done,treatment_notes,amount_payable,discount_amount)
        VALUES($1,$2,$3,$4,$5,NOW(),NOW(),'awaiting_payment',$6::jsonb,$7,4500,0)""",
        sid(6), pid(6), DOCTOR, CLINIC, aid(6),
        json.dumps([{"procedure_name":"Crown preparation","price":4500}]), "Tooth #16 prepped, temp crown placed")
    # #7 completed + collected (₹800 → 500 cash + 300 upi)
    await c.execute("""INSERT INTO treatment_sessions (id,patient_id,doctor_id,clinic_id,appointment_id,
        started_at,finalized_at,status,procedures_done,amount_payable,amount_collected,balance_remaining,
        payment_collected_at,payment_collected_by)
        VALUES($1,$2,$3,$4,$5,NOW(),NOW(),'completed',$6::jsonb,800,800,0,NOW(),$7)""",
        sid(7), pid(7), DOCTOR, CLINIC, aid(7),
        json.dumps([{"procedure_name":"Scaling & polishing","price":800}]), NURSE)

    # ---- payment transactions today (for Billing) ----
    await c.execute("""INSERT INTO payment_transactions (id,patient_id,clinic_id,amount,payment_mode,date)
        VALUES($1,$2,$3,500,'cash',CURRENT_DATE)""", eid(1), pid(7), CLINIC)
    await c.execute("""INSERT INTO payment_transactions (id,patient_id,clinic_id,amount,payment_mode,date)
        VALUES($1,$2,$3,300,'upi',CURRENT_DATE)""", eid(2), pid(7), CLINIC)

    # ---- prescriptions (session-wise history for Rohan Verma, patient 8) ----
    meds = [
        {"name":"Amoxicillin","strength":"500mg","dose":"1 tab","frequency":"Three times daily","duration":"5 days","instructions":"After food"},
        {"name":"Ibuprofen","strength":"400mg","dose":"1 tab","frequency":"Twice daily","duration":"3 days","instructions":"After food"},
    ]
    # older page (40 days ago)
    await c.execute("""INSERT INTO prescriptions (id,patient_id,doctor_id,clinic_id,serial_number,
        complaint,diagnosis,doctor_raw_notes,medicines,visible_advice,followup_date,created_at)
        VALUES($1,$2,$3,$4,100,$5,$6,$7,$8::jsonb,$9,$10,$11)""",
        rid(1), pid(8), DOCTOR, CLINIC, "Routine checkup", "Calculus deposits", "Scaling advised",
        json.dumps([]), "Maintain oral hygiene, brush twice daily.", today - timedelta(days=10), now - timedelta(days=40))
    # recent page (8 days ago) — RCT sitting #1
    await c.execute("""INSERT INTO prescriptions (id,patient_id,doctor_id,clinic_id,serial_number,
        complaint,diagnosis,doctor_raw_notes,medicines,visible_advice,followup_date,created_at)
        VALUES($1,$2,$3,$4,101,$5,$6,$7,$8::jsonb,$9,$10,$11)""",
        rid(2), pid(8), DOCTOR, CLINIC, "Severe pain lower left molar", "Irreversible pulpitis 36",
        "RCT access opening, biomechanical prep", json.dumps(meds),
        "Avoid chewing on left side. Warm saline rinse twice daily.", today, now - timedelta(days=8))
    # one older page for Diya Patel (patient 2)
    await c.execute("""INSERT INTO prescriptions (id,patient_id,doctor_id,clinic_id,serial_number,
        complaint,diagnosis,doctor_raw_notes,medicines,visible_advice,created_at)
        VALUES($1,$2,$3,$4,102,$5,$6,$7,$8::jsonb,$9,$10)""",
        rid(3), pid(2), DOCTOR, CLINIC, "Bleeding gums", "Gingivitis", "Scaling done",
        json.dumps([{"name":"Chlorhexidine mouthwash","strength":"0.2%","dose":"10ml","frequency":"Twice daily","duration":"7 days","instructions":"Rinse, do not swallow"}]),
        "Use mouthwash after brushing.", now - timedelta(days=30))

    # ---- summary ----
    print("Seed complete. Workflow states present today:")
    rows = await c.fetch("""SELECT workflow_status, COUNT(*) FROM appointments
        WHERE id::text LIKE 'b0b0b0b0%' AND confirmed_date=CURRENT_DATE GROUP BY workflow_status ORDER BY workflow_status""")
    for r in rows: print(f"  {r['workflow_status']:16} {r['count']}")
    fut = await c.fetchval("SELECT COUNT(*) FROM appointments WHERE id::text LIKE 'b0b0b0b0%' AND confirmed_date>CURRENT_DATE")
    print(f"  follow-up (future) {fut}")
    n_rx = await c.fetchval("SELECT COUNT(*) FROM prescriptions WHERE id::text LIKE $1", 'd0d0d0d0%')
    rev = await c.fetchval("SELECT COALESCE(SUM(amount),0) FROM payment_transactions WHERE id::text LIKE $1", 'e0e0e0e0%')
    print(f"  prescriptions seeded: {n_rx}")
    print(f"  today revenue: Rs {rev}")
    await c.close()

asyncio.run(main())
