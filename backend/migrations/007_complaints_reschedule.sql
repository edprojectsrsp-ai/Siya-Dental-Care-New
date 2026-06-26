-- Migration 007: Common complaints store (apply after 006)
BEGIN;
CREATE TABLE IF NOT EXISTS common_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO common_complaints (complaint_name) VALUES
    ('Toothache'), ('Sensitivity to hot/cold'), ('Bleeding gums'), ('Swelling'),
    ('Bad breath'), ('Broken tooth'), ('Loose tooth'), ('Pain while chewing'),
    ('Food lodgement'), ('Cavity'), ('Discoloured tooth'), ('Wisdom tooth pain'),
    ('Clicking jaw'), ('Dry socket'), ('Mouth ulcer')
ON CONFLICT (complaint_name) DO NOTHING;
COMMIT;
