-- ════════════════════════════════════════════════════════════════════════════
-- 018_patient_database.sql
-- Sprint P1: Patient Database Module + Polish Patches
--
-- Adds:
--   • Performance indexes for fast patient search & list rendering
--   • patient_summary_v view — pre-joined lifetime stats for the directory list
--   • Tooth status enrichment column (treatment_kind) so visual chips can render
--     cavity / crown / RCT / implant / missing per tooth
--
-- This migration is IDEMPOTENT — safe to re-run.
-- Order: run AFTER 015_lab_and_specialist.sql + 017_staff_whatsapp.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Search performance ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
    ON public.patients USING gin (LOWER(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_phone_trgm
    ON public.patients USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_active
    ON public.patients (preferred_clinic_id, is_active, created_at DESC)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
    ON public.appointments (patient_id, COALESCE(confirmed_date, requested_date) DESC);

CREATE INDEX IF NOT EXISTS idx_payments_patient_date
    ON public.payment_transactions (patient_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date
    ON public.prescriptions (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient
    ON public.treatment_plans (patient_id, is_archived, status);

-- ── Tooth visual classifier ───────────────────────────────────────────────
-- Adds a coarse "kind" to each tooth_treatments row so the chart can colour
-- by status (cavity / RCT / crown / implant / missing / filling / extraction).
-- Stored, not derived, so the chart paint is a single read.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tooth_treatments' AND column_name = 'treatment_kind'
    ) THEN
        ALTER TABLE public.tooth_treatments
            ADD COLUMN treatment_kind VARCHAR(24);
    END IF;
END$$;

-- Best-effort backfill from existing treatment_type values
UPDATE public.tooth_treatments SET treatment_kind = CASE
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'extract'      THEN 'extraction'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'implant'      THEN 'implant'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'crown|cap'    THEN 'crown'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'rct|root canal' THEN 'rct'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'bridge'       THEN 'bridge'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'fill|composite|gic|restorat' THEN 'filling'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'scaling|clean' THEN 'scaling'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'veneer'       THEN 'veneer'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'cavity|carie' THEN 'cavity'
    WHEN LOWER(COALESCE(treatment_type,'')) ~ 'missing|miss' THEN 'missing'
    ELSE 'other'
END
WHERE treatment_kind IS NULL;

CREATE INDEX IF NOT EXISTS idx_tooth_treatments_kind
    ON public.tooth_treatments (patient_id, tooth_number, treatment_kind);

-- ── Lifetime stats view ───────────────────────────────────────────────────
-- One row per patient with everything the directory list needs.
-- Used by GET /api/patients-db/list. Refreshed implicitly by the database.
CREATE OR REPLACE VIEW patient_summary_v AS
SELECT
    p.id,
    p.name,
    p.phone,
    p.age,
    p.gender,
    p.preferred_clinic_id,
    p.is_active,
    p.total_visits,
    p.existing_illnesses,
    p.created_at,
    p.updated_at,
    -- Last visit anchored on appointment date (more reliable than total_visits)
    (
        SELECT MAX(COALESCE(a.completed_at::date, a.confirmed_date, a.requested_date))
        FROM appointments a
        WHERE a.patient_id = p.id
          AND COALESCE(a.workflow_status, a.status) IN ('completed','done','in_treatment','payment_pending')
    ) AS last_visit_date,
    -- Active treatment plans count
    (
        SELECT COUNT(*) FROM treatment_plans tp
        WHERE tp.patient_id = p.id
          AND COALESCE(tp.is_archived, FALSE) = FALSE
          AND COALESCE(tp.status, '') NOT IN ('closed','cancelled','completed')
    ) AS active_plans,
    -- Lifetime billed (sum of final_payable across all non-cancelled plans)
    COALESCE((
        SELECT SUM(COALESCE(tp.final_payable, tp.estimated_cost, 0))
        FROM treatment_plans tp
        WHERE tp.patient_id = p.id
          AND COALESCE(tp.status, '') != 'cancelled'
    ), 0) AS lifetime_billed,
    -- Lifetime paid (sum of payment transactions)
    COALESCE((
        SELECT SUM(pt.amount) FROM payment_transactions pt
        WHERE pt.patient_id = p.id
    ), 0) AS lifetime_paid,
    -- Outstanding balance (positive only)
    GREATEST(
        COALESCE((
            SELECT SUM(COALESCE(tp.final_payable, tp.estimated_cost, 0))
            FROM treatment_plans tp
            WHERE tp.patient_id = p.id
              AND COALESCE(tp.status, '') != 'cancelled'
        ), 0)
        - COALESCE((
            SELECT SUM(pt.amount) FROM payment_transactions pt
            WHERE pt.patient_id = p.id
        ), 0),
        0
    ) AS outstanding,
    -- Prescription count
    (SELECT COUNT(*) FROM prescriptions rx WHERE rx.patient_id = p.id) AS rx_count,
    -- Image / media count
    (SELECT COUNT(*) FROM patient_images im WHERE im.patient_id = p.id AND im.is_active = TRUE) AS media_count,
    -- Health alert (any critical illness flag)
    (
        jsonb_array_length(COALESCE(p.existing_illnesses, '[]'::jsonb)) > 0
        OR EXISTS (
            SELECT 1 FROM patient_health h
            WHERE h.patient_id = p.id
              AND (h.diabetes OR h.hypertension OR h.heart_disease OR h.blood_thinner OR h.pregnant)
        )
    ) AS has_alerts
FROM patients p;

-- ── Lab order count per patient (helper for patient detail page) ──────────
-- Lightweight, indexed lookup.
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient
    ON public.lab_orders (patient_id, status);

-- ── Notice ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Migration 018 complete: patient_summary_v + indexes + tooth treatment_kind backfilled';
END$$;
