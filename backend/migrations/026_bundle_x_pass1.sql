-- ════════════════════════════════════════════════════════════════════════════
-- Migration 026 — Bundle X Pass 1
-- Schema additions + view fixes + idempotent seeds for testing
--
-- IDEMPOTENT: safe to run multiple times.
-- Applies cleanly on top of migration 025 (Bundle W).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Extend lab_work_types for inline-add catalog pattern ──────────────
ALTER TABLE lab_work_types
    ADD COLUMN IF NOT EXISTS clinic_id      UUID,
    ADD COLUMN IF NOT EXISTS usage_count    INT             DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_used_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS added_from     VARCHAR(30)     DEFAULT 'seed';

-- Unique (clinic_id, name) — NULLs allowed for global types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'lab_work_types_clinic_name_uniq') THEN
    CREATE UNIQUE INDEX lab_work_types_clinic_name_uniq
      ON lab_work_types (COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name));
  END IF;
END $$;

-- ─── 2. Extend specialist_rate_tiers for usage tracking + label ───────────
ALTER TABLE specialist_rate_tiers
    ADD COLUMN IF NOT EXISTS usage_count    INT             DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_used_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS label          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS added_from     VARCHAR(30)     DEFAULT 'seed';

-- ─── 3. Extend appointments for specialist-confirmation-by-nurse workflow ──
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS specialist_confirmation_status VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS specialist_called_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS specialist_called_by           UUID;

-- Allowed values: NULL (no specialist) | 'pending_call' | 'confirmed' | 'declined'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_spec_conf_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_spec_conf_check
      CHECK (specialist_confirmation_status IS NULL
             OR specialist_confirmation_status IN ('pending_call','confirmed','declined'));
  END IF;
END $$;

-- ─── 4. Extend specialist_earnings for verification flow ──────────────────
ALTER TABLE specialist_earnings
    ADD COLUMN IF NOT EXISTS verified_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by  UUID;

-- case_status values used by Bundle X workflow:
--   'pending'   — referred, specialist hasn't done work yet
--   'verified'  — doctor closed/verified specialist work → payable now due
--   'paid'      — settled (mirrors is_settled=TRUE)
-- Existing rows keep their current 'completed' default for back-compat.

-- ─── 5. NEW appointment_history table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_history (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      UUID            NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    action_type         VARCHAR(40)     NOT NULL,
    old_value           JSONB           DEFAULT NULL,
    new_value           JSONB           DEFAULT NULL,
    changed_by_staff_id UUID,
    changed_at          TIMESTAMPTZ     DEFAULT NOW(),
    notes               TEXT
);
CREATE INDEX IF NOT EXISTS appointment_history_apt_idx ON appointment_history(appointment_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS appointment_history_action_idx ON appointment_history(action_type);

-- ─── 6. NEW v_lab_payables view ────────────────────────────────────────────
DROP VIEW IF EXISTS v_lab_payables;
CREATE VIEW v_lab_payables AS
SELECT
    lo.id                                AS lab_order_id,
    lo.serial_no,
    lo.clinic_id,
    lo.vendor_id,
    lv.name                              AS vendor_name,
    lv.phone                             AS vendor_phone,
    lv.whatsapp_number                   AS vendor_whatsapp,
    lo.patient_id,
    p.name                               AS patient_name,
    lo.work_type,
    lo.status,
    lo.sent_date,
    lo.received_date,
    lo.cost                              AS order_cost,
    COALESCE(pay.paid_amount, 0)         AS paid_amount,
    (lo.cost - COALESCE(pay.paid_amount, 0)) AS outstanding,
    GREATEST(CURRENT_DATE - lo.received_date, 0) AS days_since_received,
    GREATEST(CURRENT_DATE - lo.sent_date, 0)     AS days_since_sent
FROM lab_orders lo
LEFT JOIN lab_vendors lv ON lv.id = lo.vendor_id
LEFT JOIN patients    p  ON p.id  = lo.patient_id
LEFT JOIN (
    SELECT lab_order_id, SUM(amount) AS paid_amount
    FROM lab_order_payments GROUP BY lab_order_id
) pay ON pay.lab_order_id = lo.id
WHERE lo.status NOT IN ('cancelled')
  AND lo.cost > 0
  AND (lo.cost - COALESCE(pay.paid_amount, 0)) > 0;

COMMENT ON VIEW v_lab_payables IS
    'Outstanding lab vendor payables: cost minus payments. Excludes cancelled and fully-paid orders.';

-- ─── 7. Fix stale patient_booking_constraints_v ────────────────────────────
-- Old view referenced lab statuses 'placed', 'in_progress', 'sent_to_lab' which
-- don't exist in the current lab_orders_status_check constraint
-- (pending | sent | received | fitted | completed | rejected | redo | cancelled).
-- Rebuilt to use the correct statuses and to include specialist gating.
DROP VIEW IF EXISTS patient_booking_constraints_v;
CREATE VIEW patient_booking_constraints_v AS
SELECT
    p.id                                AS patient_id,
    p.preferred_clinic_id               AS clinic_id,
    -- Lab gates
    (SELECT COUNT(*) FROM lab_orders lo
       WHERE lo.patient_id = p.id
         AND lo.status IN ('pending','sent'))                  AS pending_lab_orders,
    (SELECT COUNT(*) FROM lab_orders lo
       WHERE lo.patient_id = p.id
         AND lo.status = 'received')                           AS lab_ready_for_fitting,
    (SELECT COUNT(*) FROM lab_orders lo
       WHERE lo.patient_id = p.id
         AND lo.status IN ('pending','sent')
         AND lo.expected_date < CURRENT_DATE)                  AS lab_overdue,
    -- Specialist gates: appointments with specialist_id set and confirmation pending
    (SELECT COUNT(*) FROM appointments a
       WHERE a.patient_id = p.id
         AND a.specialist_id IS NOT NULL
         AND COALESCE(a.specialist_confirmation_status,'pending_call') = 'pending_call'
         AND a.status NOT IN ('completed','cancelled','no_show','rejected')) AS specialist_pending_confirmation,
    -- Financial
    (SELECT COALESCE(SUM(tp.final_payable),0) - COALESCE(SUM(tp.total_paid),0)
       FROM treatment_plans tp WHERE tp.patient_id = p.id)     AS outstanding_balance,
    -- Urgent clinical observations
    (SELECT COUNT(*) FROM tooth_observations o
       WHERE o.patient_id = p.id
         AND o.status = 'open'
         AND o.severity IN ('moderate','severe','urgent'))     AS urgent_observations
FROM patients p;

COMMENT ON VIEW patient_booking_constraints_v IS
    'Per-patient booking blockers. Statuses corrected for current schema. Used by appointment hub to warn before finalising.';

-- ════════════════════════════════════════════════════════════════════════════
-- SEEDS — idempotent
-- ════════════════════════════════════════════════════════════════════════════

-- 8a. Lab vendors per clinic (2 sample vendors each)
INSERT INTO lab_vendors (name, contact_person, phone, whatsapp_number, address,
                         specialities, is_preferred, is_active, notes, clinic_id)
SELECT v.name, v.contact_person, v.phone, v.whatsapp_number, v.address,
       v.specialities::jsonb, v.is_preferred, TRUE, v.notes, c.id
FROM clinics c
CROSS JOIN (VALUES
    ('Bharat Dental Lab',   'Ramesh Kumar',  '+919439123456', '+919439123456',
     'Bisra Road, Rourkela', '["Crown","Bridge","RPD"]', TRUE,
     'Default sample vendor — edit/delete in Settings → Labs'),
    ('Pearl Ceramic Works', 'Anita Patnaik', '+919437998877', '+919437998877',
     'Civil Township, Rourkela', '["Crown","Veneer","Implant"]', FALSE,
     'Default sample vendor — edit/delete in Settings → Labs')
) AS v(name, contact_person, phone, whatsapp_number, address,
       specialities, is_preferred, notes)
WHERE NOT EXISTS (
    SELECT 1 FROM lab_vendors lv WHERE lv.clinic_id = c.id AND lv.name = v.name
);

-- 8b. Lab work types — common dental lab work, attached as global (clinic_id NULL)
INSERT INTO lab_work_types (name, category, typical_days, typical_cost,
                            is_active, sort_order, added_from)
SELECT w.name, w.category, w.typical_days, w.typical_cost, TRUE, w.sort_order, 'seed'
FROM (VALUES
    ('PFM Crown',           'crown',    5,  2500.00, 10),
    ('Zirconia Crown',      'crown',    7,  6000.00, 20),
    ('Bridge (3-unit PFM)', 'bridge',   7,  7500.00, 30),
    ('Bridge (3-unit Zr)',  'bridge',   8, 16000.00, 40),
    ('RPD (acrylic)',       'denture',  10, 5000.00, 50),
    ('CPD',                 'denture',  10, 7000.00, 60),
    ('Veneer (porcelain)',  'veneer',   7,  5500.00, 70),
    ('Inlay/Onlay',         'inlay',    7,  3500.00, 80),
    ('Implant abutment',    'implant',  14, 8000.00, 90),
    ('Night guard',         'splint',   5,  2500.00, 100),
    ('Bleaching tray',      'tray',     3,   800.00, 110)
) AS w(name, category, typical_days, typical_cost, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM lab_work_types lwt
     WHERE LOWER(lwt.name) = LOWER(w.name)
       AND lwt.clinic_id IS NULL
);

-- 8c. Specialist rate tiers — seed for endodontist if one exists
DO $$
DECLARE
    endo_specialist_id UUID;
    endo_clinic_id     UUID;
BEGIN
    SELECT s.id, s.clinic_id INTO endo_specialist_id, endo_clinic_id
      FROM staff s
     WHERE s.role = 'specialist'
       AND s.is_active = TRUE
       AND (LOWER(COALESCE(s.specialization,'')) LIKE '%endo%'
            OR LOWER(s.name) LIKE '%endo%')
     LIMIT 1;

    IF endo_specialist_id IS NOT NULL THEN
        INSERT INTO specialist_rate_tiers
            (clinic_id, specialist_id, tier_name, treatment_key, rate_amount, label, is_active, added_from)
        SELECT endo_clinic_id, endo_specialist_id, r.tier_name, r.treatment_key,
               r.rate_amount, r.label, TRUE, 'seed'
        FROM (VALUES
            ('standard', 'rct_anterior',   3000.00, 'RCT — Anterior'),
            ('standard', 'rct_premolar',   4000.00, 'RCT — Premolar'),
            ('standard', 'rct_molar',      5000.00, 'RCT — Molar'),
            ('complex',  'rct_retreat',    6500.00, 'RCT — Retreatment'),
            ('complex',  'rct_molar_curve',7500.00, 'RCT — Curved molar canals')
        ) AS r(tier_name, treatment_key, rate_amount, label)
        WHERE NOT EXISTS (
            SELECT 1 FROM specialist_rate_tiers t
             WHERE t.specialist_id = endo_specialist_id
               AND t.tier_name     = r.tier_name
               AND t.treatment_key = r.treatment_key
        );
    END IF;
END $$;

-- 8d. ONE test patient with crown + RCT treatment plan items
DO $$
DECLARE
    seed_clinic_id   UUID;
    seed_patient_id  UUID;
    seed_plan_id     UUID;
    crown_proc_id    UUID;
    rct_proc_id      UUID;
BEGIN
    SELECT id INTO seed_clinic_id FROM clinics ORDER BY created_at LIMIT 1;
    IF seed_clinic_id IS NULL THEN RETURN; END IF;

    SELECT id INTO seed_patient_id FROM patients
     WHERE phone = '+919999100001' LIMIT 1;

    IF seed_patient_id IS NULL THEN
        INSERT INTO patients (name, phone, gender, age, preferred_clinic_id, created_at)
        VALUES ('Test — Bundle X (Crown+RCT)', '+919999100001', 'female', 34,
                seed_clinic_id, NOW())
        RETURNING id INTO seed_patient_id;
    END IF;

    SELECT id INTO seed_plan_id FROM treatment_plans
     WHERE patient_id = seed_patient_id AND status NOT IN ('closed','cancelled')
     LIMIT 1;

    IF seed_plan_id IS NULL THEN
        INSERT INTO treatment_plans (patient_id, clinic_id, name, plan_name, status, estimated_cost,
                                      final_payable, total_paid, balance, created_at, updated_at)
        VALUES (seed_patient_id, seed_clinic_id, 'Bundle X test plan', 'Bundle X test plan', 'treatment_advised',
                12500, 12500, 0, 12500, NOW(), NOW())
        RETURNING id INTO seed_plan_id;
    END IF;

    SELECT id INTO crown_proc_id FROM procedure_catalog
     WHERE LOWER(name) LIKE '%crown%' LIMIT 1;
    SELECT id INTO rct_proc_id FROM procedure_catalog
     WHERE LOWER(name) LIKE '%rct%' OR LOWER(name) LIKE '%root canal%' LIMIT 1;

    IF NOT EXISTS (
        SELECT 1 FROM treatment_plan_items
         WHERE plan_id = seed_plan_id AND tooth_number = '16'
    ) THEN
        INSERT INTO treatment_plan_items
            (plan_id, procedure_catalog_id, procedure_id, procedure_name,
             tooth_number, teeth, estimated_cost, final_amount, status,
             requires_lab, lab_status, priority, created_at, updated_at)
        VALUES (seed_plan_id, crown_proc_id, crown_proc_id, 'PFM Crown',
                '16', '["16"]'::jsonb, 6500, 6500, 'advised',
                TRUE, 'pending', 'routine', NOW(), NOW());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM treatment_plan_items
         WHERE plan_id = seed_plan_id AND tooth_number = '36'
    ) THEN
        INSERT INTO treatment_plan_items
            (plan_id, procedure_catalog_id, procedure_id, procedure_name,
             tooth_number, teeth, estimated_cost, final_amount, status,
             requires_lab, priority, created_at, updated_at)
        VALUES (seed_plan_id, rct_proc_id, rct_proc_id, 'RCT — Molar',
                '36', '["36"]'::jsonb, 6000, 6000, 'advised',
                FALSE, 'urgent', NOW(), NOW());
    END IF;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- Verification queries (read-only — run separately to validate seed)
-- ════════════════════════════════════════════════════════════════════════════
-- SELECT 'lab_vendors_per_clinic' AS check, c.name AS clinic, COUNT(lv.id) AS vendors
--   FROM clinics c LEFT JOIN lab_vendors lv ON lv.clinic_id = c.id GROUP BY c.id, c.name;
-- SELECT 'lab_work_types' AS check, COUNT(*) FROM lab_work_types;
-- SELECT 'endo_rate_tiers' AS check, COUNT(*) FROM specialist_rate_tiers WHERE added_from='seed';
-- SELECT 'test_patient_plan_items' AS check, COUNT(*) FROM treatment_plan_items tpi
--    JOIN treatment_plans tp ON tp.id=tpi.plan_id
--    JOIN patients p ON p.id=tp.patient_id WHERE p.phone='+919999100001';
-- SELECT 'view_lab_payables' AS check, COUNT(*) FROM v_lab_payables;
-- SELECT 'view_booking_constraints' AS check, COUNT(*) FROM patient_booking_constraints_v;
