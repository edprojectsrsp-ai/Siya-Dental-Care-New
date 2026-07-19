-- ════════════════════════════════════════════════════════════════════════════
-- 021_bundle_s_settings_expansion.sql — Siya Dental Care Bundle S
--
-- Adds:
--   • clinic_info_ext         — logo, GST, license, registration, branding
--   • business_hours          — per-day open/close times + breaks
--   • clinic_holidays         — closed dates with reason
--   • service_catalog         — procedures with default duration + price
--   • fee_schedule_overrides  — seasonal/category-based price changes
--   • kanban_columns          — configurable kanban board columns per clinic
--   • illness_library         — diagnosis vocabulary (extends Sprint 14)
--   • n8n_config              — frontend-selectable hosting config
--
-- IDEMPOTENT. Apply after migration 020.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Clinic info extensions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_info_ext (
    clinic_id            UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    logo_url             TEXT,
    letterhead_url       TEXT,
    gst_number           VARCHAR(40),
    license_number       VARCHAR(60),
    establishment_year   INT,
    tagline              VARCHAR(200),
    -- Doctor credentials (printed on Rx)
    primary_doctor_name  VARCHAR(120),
    primary_doctor_qual  VARCHAR(200),    -- "BDS, OD-28456"
    primary_doctor_reg   VARCHAR(60),
    -- Branding
    accent_color         VARCHAR(20) DEFAULT '#0E7C7B',
    secondary_color      VARCHAR(20) DEFAULT '#0A5C5B',
    -- Prescription preferences
    rx_language          VARCHAR(10) DEFAULT 'en',   -- 'en' | 'en+hi' | 'en+or'
    rx_format            VARCHAR(10) DEFAULT 'A4',   -- 'A4' | 'A5'
    rx_show_qr           BOOLEAN DEFAULT TRUE,
    rx_footer_text       TEXT,
    -- Public site
    public_about         TEXT,
    public_emergency_msg TEXT,
    -- Misc
    socials              JSONB DEFAULT '{}'::jsonb,   -- {instagram, facebook, ...}
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_by           UUID
);

-- Seed default row per clinic
INSERT INTO clinic_info_ext (clinic_id)
SELECT id FROM clinics
WHERE id NOT IN (SELECT clinic_id FROM clinic_info_ext);

-- ── Business hours (per-day per-clinic) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS business_hours (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    weekday       INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0=Mon, 6=Sun
    is_closed     BOOLEAN DEFAULT FALSE,
    open_time     TIME,
    close_time    TIME,
    break_start   TIME,
    break_end     TIME,
    UNIQUE (clinic_id, weekday)
);

-- Seed Mon-Sat 9-1 and 5-8, Sun closed
INSERT INTO business_hours (clinic_id, weekday, is_closed, open_time, close_time, break_start, break_end)
SELECT c.id, wd, FALSE, '09:00', '20:00', '13:00', '17:00'
FROM clinics c, generate_series(0, 5) wd
WHERE NOT EXISTS (
    SELECT 1 FROM business_hours bh WHERE bh.clinic_id = c.id AND bh.weekday = wd
);
INSERT INTO business_hours (clinic_id, weekday, is_closed)
SELECT c.id, 6, TRUE FROM clinics c
WHERE NOT EXISTS (
    SELECT 1 FROM business_hours bh WHERE bh.clinic_id = c.id AND bh.weekday = 6
);

-- ── Holidays ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_holidays (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    reason      VARCHAR(200),
    is_recurring BOOLEAN DEFAULT FALSE,
    UNIQUE (clinic_id, holiday_date)
);

-- ── Service catalog (procedures with default duration + price) ────────────
CREATE TABLE IF NOT EXISTS service_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    category        VARCHAR(60) NOT NULL,
    -- 'consultation' | 'restorative' | 'endodontic' | 'periodontal' |
    -- 'oral_surgery' | 'orthodontic' | 'prosthodontic' | 'pediatric' |
    -- 'cosmetic' | 'preventive' | 'diagnostic'
    name            VARCHAR(120) NOT NULL,
    code            VARCHAR(40),       -- optional ADA/internal code
    default_duration_min INT DEFAULT 30,
    default_price   NUMERIC(10,2),
    description     TEXT,
    requires_lab    BOOLEAN DEFAULT FALSE,
    requires_specialist BOOLEAN DEFAULT FALSE,
    typical_sittings INT DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (clinic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_cat_clinic ON service_catalog (clinic_id, category, is_active);

-- Seed common services
INSERT INTO service_catalog (clinic_id, category, name, default_duration_min, default_price, typical_sittings, requires_lab)
SELECT c.id, s.cat, s.name, s.dur, s.price, s.sittings, s.lab FROM clinics c, (VALUES
    ('consultation',   'New consultation',       30, 500,    1, FALSE),
    ('consultation',   'Follow-up consultation', 15, 200,    1, FALSE),
    ('diagnostic',     'IOPA X-ray',              5, 200,    1, FALSE),
    ('diagnostic',     'OPG',                    10, 600,    1, FALSE),
    ('diagnostic',     'CBCT scan',              15, 3500,   1, FALSE),
    ('preventive',     'Scaling & polishing',    30, 1500,   1, FALSE),
    ('preventive',     'Fluoride application',   15, 800,    1, FALSE),
    ('restorative',    'Composite filling — small',  30, 1200,  1, FALSE),
    ('restorative',    'Composite filling — large',  45, 2000,  1, FALSE),
    ('restorative',    'GIC filling',                30, 800,   1, FALSE),
    ('endodontic',     'RCT — Anterior',         60, 4500,   2, FALSE),
    ('endodontic',     'RCT — Premolar',         75, 5500,   2, FALSE),
    ('endodontic',     'RCT — Molar',            90, 6500,   2, FALSE),
    ('endodontic',     'RCT re-treatment',      120, 8500,   3, FALSE),
    ('oral_surgery',   'Extraction — simple',    20, 1500,   1, FALSE),
    ('oral_surgery',   'Extraction — surgical',  60, 4500,   1, FALSE),
    ('oral_surgery',   'Wisdom tooth extraction',90, 7500,   1, FALSE),
    ('prosthodontic',  'PFM Crown',              60, 6500,   3, TRUE),
    ('prosthodontic',  'Zirconia Crown',         60, 12000,  3, TRUE),
    ('prosthodontic',  'Complete Denture',      120, 18000,  4, TRUE),
    ('prosthodontic',  'Partial Denture',        90, 9500,   3, TRUE),
    ('prosthodontic',  'Implant — single',      120, 35000,  4, TRUE),
    ('cosmetic',       'Veneer (per tooth)',     60, 8500,   2, TRUE),
    ('cosmetic',       'Teeth whitening',        90, 6500,   1, FALSE),
    ('orthodontic',    'Ortho consult + records',60, 2500,   1, FALSE),
    ('orthodontic',    'Metal braces (full course)', 30, 35000, 18, FALSE),
    ('orthodontic',    'Clear aligners',         30, 75000,  12, TRUE),
    ('pediatric',      'Pediatric exam',         20, 500,    1, FALSE),
    ('pediatric',      'Pulpectomy (milk tooth)',45, 2500,   1, FALSE),
    ('periodontal',    'Curettage (per quadrant)', 30, 2500, 4, FALSE),
    ('periodontal',    'Flap surgery (per quadrant)', 60, 6500, 4, FALSE)
) AS s(cat, name, dur, price, sittings, lab)
ON CONFLICT (clinic_id, name) DO NOTHING;

-- ── Fee schedule overrides (seasonal/promo prices) ────────────────────────
CREATE TABLE IF NOT EXISTS fee_schedule_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    service_id      UUID REFERENCES service_catalog(id) ON DELETE CASCADE,
    category        VARCHAR(60),    -- override at category level
    label           VARCHAR(120) NOT NULL,
    override_price  NUMERIC(10,2),
    discount_percent NUMERIC(5,2),
    valid_from      DATE,
    valid_until     DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_override_active
    ON fee_schedule_overrides (clinic_id, is_active, valid_from, valid_until);

-- ── Kanban columns (configurable per clinic) ──────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_columns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    label           VARCHAR(60) NOT NULL,
    plan_status     VARCHAR(40) NOT NULL,
    -- maps to treatment_plans.status
    column_order    INT NOT NULL,
    color           VARCHAR(20) DEFAULT '#3B82F6',
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (clinic_id, plan_status)
);

-- Seed default columns
INSERT INTO kanban_columns (clinic_id, label, plan_status, column_order, color)
SELECT c.id, lbl, status, ord, color FROM clinics c, (VALUES
    ('💡 Proposed',     'proposed',     1, '#94A3B8'),
    ('📋 Planned',      'planned',      2, '#3B82F6'),
    ('🦷 In Progress',  'in_progress',  3, '#F59E0B'),
    ('✓ Completed',     'completed',    4, '#10B981')
) AS k(lbl, status, ord, color)
ON CONFLICT (clinic_id, plan_status) DO NOTHING;

-- ── Illness/diagnosis library ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS illness_library (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    icd_code        VARCHAR(20),
    category        VARCHAR(60),
    -- 'caries' | 'pulpal' | 'periodontal' | 'gingival' | 'occlusal' |
    -- 'developmental' | 'trauma' | 'oral_lesion' | 'systemic' | 'other'
    severity_default VARCHAR(20),  -- maps to tooth_observations.severity
    suggested_treatment_default VARCHAR(120),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (clinic_id, name)
);

-- Seed common diagnoses (clinic_id = NULL = global)
INSERT INTO illness_library (clinic_id, name, category, severity_default, suggested_treatment_default) VALUES
    (NULL, 'Dental caries (Class I)',        'caries',        'mild',     'Composite filling'),
    (NULL, 'Dental caries (Class II)',       'caries',        'moderate', 'Composite filling'),
    (NULL, 'Dental caries (Class III/IV)',   'caries',        'moderate', 'Aesthetic composite'),
    (NULL, 'Dental caries (Class V)',        'caries',        'mild',     'GIC filling'),
    (NULL, 'Pulpitis — reversible',          'pulpal',        'moderate', 'Sedative dressing'),
    (NULL, 'Pulpitis — irreversible',        'pulpal',        'severe',   'RCT'),
    (NULL, 'Periapical abscess',             'pulpal',        'urgent',   'RCT + drainage'),
    (NULL, 'Chronic apical periodontitis',   'pulpal',        'severe',   'RCT'),
    (NULL, 'Gingivitis',                     'gingival',      'mild',     'Scaling + OHI'),
    (NULL, 'Chronic periodontitis',          'periodontal',   'moderate', 'Scaling + root planing'),
    (NULL, 'Aggressive periodontitis',       'periodontal',   'severe',   'Flap surgery'),
    (NULL, 'Bruxism',                        'occlusal',      'watch',    'Night guard'),
    (NULL, 'Attrition',                      'occlusal',      'watch',    'Occlusal adjustment'),
    (NULL, 'Abrasion',                       'occlusal',      'mild',     'Restoration'),
    (NULL, 'Tooth fracture — enamel',        'trauma',        'mild',     'Composite repair'),
    (NULL, 'Tooth fracture — dentin',        'trauma',        'moderate', 'Composite + monitoring'),
    (NULL, 'Tooth fracture — pulpal',        'trauma',        'urgent',   'RCT or extraction'),
    (NULL, 'Impacted wisdom tooth',          'developmental', 'watch',    'Surgical extraction'),
    (NULL, 'Hypoplasia',                     'developmental', 'info',     'Aesthetic restoration'),
    (NULL, 'Aphthous ulcer',                 'oral_lesion',   'mild',     'Topical anaesthetic + reassurance'),
    (NULL, 'Oral candidiasis',               'oral_lesion',   'moderate', 'Antifungal'),
    (NULL, 'Leukoplakia',                    'oral_lesion',   'severe',   'Biopsy required')
ON CONFLICT (clinic_id, name) DO NOTHING;

-- ── n8n hosting config (frontend-selectable) ──────────────────────────────
-- Stored as JSONB in clinic_settings.extra_json — but we add a dedicated column too
DO $$ BEGIN
    BEGIN
        ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS n8n_hosting_kind VARCHAR(30) DEFAULT 'self_hosted';
        -- 'n8n_cloud' | 'render_hosted' | 'self_hosted' | 'inprocess'
        ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS n8n_webhook_base TEXT;
        ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS n8n_dashboard_url TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Ensure treatment_plans.status accepts the kanban statuses
DO $$ BEGIN
    BEGIN
        ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS kanban_position INT DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Migration 021 complete: clinic_info_ext, business_hours, holidays, service_catalog (31 seeded), fee overrides, kanban columns, illness library (22 seeded), n8n config';
END $$;
