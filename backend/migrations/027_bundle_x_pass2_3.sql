-- ════════════════════════════════════════════════════════════════════════════
-- Migration 027 — Bundle X Pass 2 + 3
-- Module visibility, specialist verification workflow, call-confirm actions
-- IDEMPOTENT: safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Module visibility (role-based sidebar control) ────────────────────
CREATE TABLE IF NOT EXISTS module_visibility (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     UUID            NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    module_key    VARCHAR(60)     NOT NULL,
    role          VARCHAR(30)     NOT NULL,
    is_visible    BOOLEAN         NOT NULL DEFAULT TRUE,
    updated_at    TIMESTAMPTZ     DEFAULT NOW(),
    updated_by    UUID,
    UNIQUE(clinic_id, module_key, role)
);
CREATE INDEX IF NOT EXISTS module_vis_clinic_idx ON module_visibility(clinic_id);

-- Seed defaults: all modules visible to doctor+admin; nurse sees subset
DO $$
DECLARE
    cid UUID;
    mods TEXT[] := ARRAY[
        'dashboard','appointments','patients','queue','kanban','billing',
        'medicines','procedures','lab','counters','specialists','staff',
        'gallery','website','consult','messages','bulkwa','settings'
    ];
    m TEXT;
BEGIN
    FOR cid IN SELECT id FROM clinics LOOP
        FOREACH m IN ARRAY mods LOOP
            -- Doctor sees everything
            INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
            VALUES (cid, m, 'doctor', TRUE)
            ON CONFLICT (clinic_id, module_key, role) DO NOTHING;
            -- Admin sees everything
            INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
            VALUES (cid, m, 'admin', TRUE)
            ON CONFLICT (clinic_id, module_key, role) DO NOTHING;
            -- Receptionist: limited
            INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
            VALUES (cid, m, 'receptionist',
                    m IN ('dashboard','appointments','patients','queue','billing',
                          'lab','messages'))
            ON CONFLICT (clinic_id, module_key, role) DO NOTHING;
            -- Specialist: very limited
            INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
            VALUES (cid, m, 'specialist',
                    m IN ('dashboard','queue'))
            ON CONFLICT (clinic_id, module_key, role) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ─── 2. Call-confirm workflow — extend appointment_history action types ────
-- action_types used: 'call_confirm', 'call_refused', 'date_changed',
--   'time_changed', 'specialist_called', 'specialist_confirmed',
--   'specialist_declined', 'converted_from_request', 'booking_gate_override'
-- No schema change needed — appointment_history.action_type is VARCHAR(40).

-- ─── 3. Extend appointments for call-confirm blinking logic ───────────────
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS pending_action       VARCHAR(30) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS pending_action_since  TIMESTAMPTZ DEFAULT NULL;

-- pending_action: NULL | 'change_date' | 'change_time' | 'specialist_call'
-- When set, the appointment card blinks in the hub until the nurse completes the action.

-- ─── 4. Specialist verification (doctor-only) ─────────────────────────────
-- Already have specialist_earnings.verified_at/verified_by from migration 026.
-- Add specialist_session_status value 'verified' support:
-- Existing values: 'pending', 'closed'
-- New flow: 'pending' → specialist works → 'done' → doctor verifies → 'verified'

-- ─── 5. v_specialist_payables view ────────────────────────────────────────
DROP VIEW IF EXISTS v_specialist_payables;
CREATE VIEW v_specialist_payables AS
SELECT
    se.id                    AS earning_id,
    se.specialist_id,
    s.name                   AS specialist_name,
    s.phone                  AS specialist_phone,
    s.whatsapp_number        AS specialist_whatsapp,
    se.clinic_id,
    se.patient_id,
    p.name                   AS patient_name,
    se.appointment_id,
    se.amount                AS earning_amount,
    se.is_settled,
    se.settled_amount,
    se.settled_on            AS settled_at,
    se.settled_payment_mode  AS payment_mode,
    (se.amount - COALESCE(se.settled_amount, 0)) AS outstanding,
    se.verified_at,
    se.verified_by,
    se.case_status,
    se.created_at            AS earned_at
FROM specialist_earnings se
LEFT JOIN staff s     ON s.id  = se.specialist_id
LEFT JOIN patients p  ON p.id  = se.patient_id
WHERE (se.is_settled IS NOT TRUE OR (se.amount - COALESCE(se.settled_amount, 0)) > 0);

COMMENT ON VIEW v_specialist_payables IS
    'Outstanding specialist payables. Includes unsettled or partially-settled earnings.';

-- ─── 6. v_workshop_specialist_work view ───────────────────────────────────
DROP VIEW IF EXISTS v_workshop_specialist_work;
CREATE VIEW v_workshop_specialist_work AS
SELECT
    a.id                     AS appointment_id,
    a.patient_id,
    p.name                   AS patient_name,
    a.specialist_id,
    sp.name                  AS specialist_name,
    a.specialist_session_status,
    a.specialist_confirmation_status,
    a.specialist_assigned_at,
    a.specialist_closed_at,
    a.specialist_notes,
    a.scheduled_date,
    a.clinic_id
FROM appointments a
LEFT JOIN patients p  ON p.id  = a.patient_id
LEFT JOIN staff sp    ON sp.id = a.specialist_id
WHERE a.specialist_id IS NOT NULL
  AND a.status NOT IN ('cancelled')
ORDER BY
    CASE a.specialist_session_status
        WHEN 'pending' THEN 1 WHEN 'done' THEN 2 WHEN 'closed' THEN 3 WHEN 'verified' THEN 4
        ELSE 5
    END,
    a.specialist_assigned_at DESC;

COMMENT ON VIEW v_workshop_specialist_work IS
    'Specialist work tracker: pending → done → verified. Used by Workshop sidebar group.';

COMMIT;
