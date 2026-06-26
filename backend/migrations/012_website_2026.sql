-- Migration 012: Website 2026 redesign + admin manageable content
-- Adds per-clinic Google Maps embed, 3D Street View, logo, theme color, video URLs,
-- and a dedicated site_videos table for video gallery management.
-- Run AFTER 011. Fully idempotent.
BEGIN;

-- ─── 1. Extend clinics table with public-website fields ──────────
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_maps_embed_url TEXT;       -- the <iframe src="..."> URL from Google Maps Embed
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS street_view_embed_url TEXT;       -- Street View 3D iframe URL
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS directions_url TEXT;              -- "Get Directions" deep link
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS hero_image_url TEXT;              -- big image for this clinic section
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20);          -- "#0E7C7B" — distinct accent per clinic
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS public_phone VARCHAR(20);         -- the number to display publicly (may differ from billing)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;               -- pre-built wa.me link
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS show_on_public_site BOOLEAN DEFAULT TRUE;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ─── 2. site_videos table — admin-managed videos (hero, treatment, testimonial) ──
CREATE TABLE IF NOT EXISTS site_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    category VARCHAR(40) DEFAULT 'general',        -- hero | clinic_tour | treatment | testimonial | doctor_intro
    title VARCHAR(200),
    caption TEXT,
    video_url TEXT NOT NULL,                       -- youtube/vimeo URL OR uploaded /uploads/videos/...
    thumbnail_url TEXT,
    is_youtube BOOLEAN DEFAULT FALSE,
    youtube_id VARCHAR(40),                        -- extracted for embed
    autoplay BOOLEAN DEFAULT FALSE,
    loop_video BOOLEAN DEFAULT FALSE,
    order_idx INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_videos_active ON site_videos(category, order_idx) WHERE is_active;

-- ─── 3. site_testimonials table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS site_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name VARCHAR(100) NOT NULL,
    patient_photo_url TEXT,
    rating INTEGER DEFAULT 5,                      -- 1-5
    text TEXT NOT NULL,
    treatment_type VARCHAR(100),                   -- "RCT", "Implant", "Whitening"
    source VARCHAR(30) DEFAULT 'manual',           -- manual | google | facebook
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    order_idx INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 4. site_doctors table (already have staff, but for public bios) ──
CREATE TABLE IF NOT EXISTS site_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    display_name VARCHAR(100) NOT NULL,
    qualification VARCHAR(200),                    -- "BDS, MDS (Endodontics)"
    designation VARCHAR(100),                      -- "Chief Dentist", "Endodontist"
    bio TEXT,
    photo_url TEXT,
    years_experience INTEGER,
    specializations JSONB DEFAULT '[]',            -- ["RCT", "Implants", "Aesthetics"]
    show_on_public_site BOOLEAN DEFAULT TRUE,
    order_idx INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── 5. site_services table — admin-managed services with icons & images ──
CREATE TABLE IF NOT EXISTS site_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    short_description TEXT,
    full_description TEXT,
    icon_emoji VARCHAR(10) DEFAULT '🦷',
    icon_image_url TEXT,                           -- if admin wants a custom icon image
    hero_image_url TEXT,                           -- background image for the card
    cta_text VARCHAR(60),
    cta_link VARCHAR(200),
    price_starting_from NUMERIC(10,2),
    duration_minutes INTEGER,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    order_idx INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 6. site_theme — single-row theme config table ───────────────
CREATE TABLE IF NOT EXISTS site_theme (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    primary_color VARCHAR(20) DEFAULT '#0E7C7B',
    secondary_color VARCHAR(20) DEFAULT '#06B6D4',
    accent_color VARCHAR(20) DEFAULT '#22D3EE',
    dark_bg VARCHAR(20) DEFAULT '#0F172A',
    logo_url TEXT,
    favicon_url TEXT,
    site_title VARCHAR(120) DEFAULT 'Siya Dental Care',
    site_tagline VARCHAR(200) DEFAULT 'Modern dentistry. Compassionate care.',
    meta_description TEXT,
    google_analytics_id VARCHAR(40),
    instagram_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    twitter_url TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed single theme row if none exists
INSERT INTO site_theme (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─── 7. Default seed data — placeholder services for first deploy ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM site_services LIMIT 1) THEN
    INSERT INTO site_services (name, short_description, icon_emoji, order_idx, is_featured) VALUES
      ('Smile Makeover', 'Veneers, whitening & cosmetic dentistry', '✨', 1, TRUE),
      ('Root Canal Treatment', 'Pain-free RCT with rotary endodontics', '🦷', 2, TRUE),
      ('Dental Implants', 'Replace missing teeth permanently', '💎', 3, TRUE),
      ('Orthodontics & Aligners', 'Braces and invisible aligners', '🪥', 4, FALSE),
      ('Pediatric Dentistry', 'Gentle care for children', '👶', 5, FALSE),
      ('Oral Surgery', 'Wisdom teeth, extractions & more', '🔬', 6, FALSE);
  END IF;
END $$;

-- Done. To verify:
--   \d+ clinics
--   SELECT COUNT(*) FROM site_services;
--   SELECT * FROM site_theme;
COMMIT;
