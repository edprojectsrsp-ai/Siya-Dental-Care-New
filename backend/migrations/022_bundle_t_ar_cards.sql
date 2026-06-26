-- ============================================================================
-- Migration 022: Bundle T — AR Preview Settings + Treatment Card Enhancements
-- ============================================================================
-- Safe to re-run: all CREATE TABLE use IF NOT EXISTS

-- AR Smile Preview configuration
CREATE TABLE IF NOT EXISTS ar_preview_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banuba_token TEXT,
    enabled_effects TEXT[] DEFAULT ARRAY['whitening'],
    default_whitening_intensity INTEGER DEFAULT 60,
    braces_style VARCHAR(20) DEFAULT 'metal',      -- metal, ceramic, lingual
    veneer_shade VARCHAR(20) DEFAULT 'natural',     -- natural, hollywood, bright
    show_alignment_guide BOOLEAN DEFAULT TRUE,
    custom_branding_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add priority column to treatment_plan_items if not exists
DO $$ BEGIN
    ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'routine';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add lab_order_id linkage to treatment_plan_items if not exists
DO $$ BEGIN
    ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS lab_order_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Insert default AR settings row
INSERT INTO ar_preview_settings (id, enabled_effects, default_whitening_intensity)
VALUES (gen_random_uuid(), ARRAY['whitening'], 60)
ON CONFLICT DO NOTHING;
