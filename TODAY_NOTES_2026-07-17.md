July 17, 2026 handoff notes for rebuilding safely on home computer.

Goal:
- Keep production/home setup working.
- Do not overwrite the whole remote database from this laptop.
- Rebuild only the useful ideas from today selectively.

Repository state:
- I reset the 4 repo file changes from today instead of committing them.
- No code from today is being kept in git right now.
- This note is the handoff for rebuilding later.

What happened today:
- Public site looked broken because the backend content endpoint was returning HTTP 500 locally.
- Google reviews sync had partial data and the local database was missing some newer Google-related schema.
- Clinic labels and addresses in the local DB were outdated.
- Vercel frontend was initially not pointing correctly to the Render backend.
- Render deploy initially failed because the database connection string was wrong, then later because the Supabase direct host was used instead of the pooler URL.

What was fixed locally during debugging:
- Local backend endpoint was restored by ensuring the missing `public_site_visitor_days` table existed.
- Google Places API key was added to local `backend/.env` and a manual sync was run.
- Clinic `google_place_id` values were filled locally.
- Written backup testimonials were imported into the local DB so the slideshow had more cards.
- Local clinic display names were updated from generic names to:
  - `Daily Market`
  - `Jhirpani`
- Local clinic addresses were updated to the exact provided addresses.
- Local directions URLs were stored.
- Review slideshow speed was increased locally.

Important warning:
- These local DB edits are not automatically in git.
- The home/production database may already have better data for:
  - `site_videos`
  - `public_phone`
  - `google_maps_embed_url`
  - `street_view_embed_url`
  - other website manager content
- Do not full-restore this laptop DB over home/production.

Local DB state observed after debugging:
- Clinics:
  - `Daily Market` / `Siya Dental Care - Daily Market`
  - `Jhirpani` / `Siya Dental Care - Jhirpani`
- Exact addresses were stored locally.
- Directions links were stored locally.
- `google_place_id` values were stored locally for both clinics.
- `site_theme` had:
  - `google_rating = 4.9`
  - `google_review_count = 53`
  - `google_reviews_url` set
- Active testimonials locally:
  - `google`: 8
  - `google_backup`: 22
- Total usable written 4-star-plus testimonials locally: about 30.
- `site_videos` was empty on this laptop DB when checked.

Production/deployment fixes discovered:
- Render must use the Supabase pooler connection string, not the direct `db.<project-ref>.supabase.co` host.
- Working pattern for Render DB URL:
  - host from Supabase session pooler
  - user like `postgres.<project-ref>`
  - password URL-encoded
- Vercel frontend must point to the Render backend via:
  - `NEXT_PUBLIC_BACKEND_URL`
  - `INTERNAL_BACKEND_URL`
- Login issue on Vercel was from frontend/backend routing, not from Supabase client keys.

Code ideas worth rebuilding later at home:
- Startup schema bootstrap improvement:
  - keep Google review columns present automatically
  - also ensure `public_site_visitor_days` exists
- Optional retry wrapper around schema bootstrap for hosted deploys.
- Review fallback idea:
  - keep backup testimonials in DB so Google sync failure does not empty the carousel.
- Import helper idea:
  - import pasted written reviews into `site_testimonials` with a separate source such as `google_backup`.
- Review filter:
  - only show reviews with non-empty written text.
- Slightly faster review marquee speed.

Selective DB changes to consider reapplying later on home computer:
- Update clinic labels:
  - `short_name = Daily Market`
  - `name = Siya Dental Care - Daily Market`
  - `short_name = Jhirpani`
  - `name = Siya Dental Care - Jhirpani`
- Update clinic addresses:
  - `PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001`
  - `1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042`
- Update `directions_url` only if home DB does not already have better values.
- Add `google_place_id` only if absent.
- Add backup testimonials only if you still want the longer carousel.

Things to inspect first on home computer before changing DB:
- `site_videos`
- `clinics.public_phone`
- `clinics.google_maps_embed_url`
- `clinics.street_view_embed_url`
- `site_theme`
- `site_testimonials`

Suggested safe order at home:
1. Back up the home/production database first.
2. Compare current home DB content for videos/maps/phones with this note.
3. Rebuild only the code changes you still want.
4. Apply only selective SQL/data updates.
5. Do not import a full DB dump from this laptop.

Why no commit was made today:
- The production stack is already running again.
- The local laptop DB was useful for debugging but is not trustworthy enough to replace home/production wholesale.
- A selective rebuild at home is lower risk than committing half-debugged state.
