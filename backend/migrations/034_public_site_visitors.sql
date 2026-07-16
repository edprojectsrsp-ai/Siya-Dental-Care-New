-- Privacy-friendly website visitor count. Only a salted browser identifier hash
-- is stored; no raw IP address, user agent, or personal information is retained.
CREATE TABLE IF NOT EXISTS public_site_visitor_days (
    visitor_hash char(64) NOT NULL,
    visit_date date NOT NULL DEFAULT CURRENT_DATE,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    page_views integer NOT NULL DEFAULT 1,
    PRIMARY KEY (visitor_hash, visit_date)
);

CREATE INDEX IF NOT EXISTS ix_public_site_visitor_days_date
    ON public_site_visitor_days (visit_date DESC);
