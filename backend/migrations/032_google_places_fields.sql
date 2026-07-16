-- Google Places sync fields for public website
ALTER TABLE site_theme ADD COLUMN IF NOT EXISTS google_rating varchar(10);
ALTER TABLE site_theme ADD COLUMN IF NOT EXISTS google_review_count varchar(20);
ALTER TABLE site_theme ADD COLUMN IF NOT EXISTS google_reviews_url text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_place_id text;
