# Siya Dental Care — Deployment Guide

**Version:** Bundles Q+ through T (all integrated)
**Doctor:** Dr. Madhu Edward · BDS · OD-28456 · Rourkela, Odisha
**Stack:** FastAPI :8000 + Next.js :3000 + PostgreSQL `siya_dental`

---

## Quick Start (Fresh Deploy)

### 1. Database Setup

```bash
# Create database
createdb -U postgres siya_dental

# Restore base schema
psql -U postgres -d siya_dental -f database/dentassist.sql

# Apply ALL bundle migrations (019-022) in one shot
psql -U postgres -d siya_dental -f database/bundle_migrations_combined.sql
```

This creates 20+ tables including:
- Bundle Q+: `clinic_settings`, `message_templates`, `message_log`, `patient_ratings`, `patient_credits`, `phone_consultations`
- Bundle R: `specialist_rate_tiers`, `tooth_observations`, `follow_ups` + 3 views
- Bundle S: `clinic_info_ext`, `business_hours`, `clinic_holidays`, `service_catalog`, `fee_schedule_overrides`, `kanban_columns`, `illness_library`
- Bundle T: `ar_preview_settings` + treatment_plan_items columns

### 2. Backend

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set environment (or use .env file)
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/siya_dental

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend

```bash
# Install Node dependencies
npm install

# Run dev
npm run dev
```

### 4. Access

- **Doctor dashboard:** http://localhost:3000
- **Public smile preview:** http://localhost:3000/public/smile
- **Public booking:** http://localhost:3000/public/consult
- **Public rating:** http://localhost:3000/public/rating?token=...
- **Specialist panel:** http://localhost:3000/specialist
- **API docs:** http://localhost:8000/docs

---

## If You Already Have the Database Running

If migrations 019-021 are already applied, just run:

```bash
psql -U postgres -d siya_dental -f backend/migrations/022_bundle_t_ar_cards.sql
```

---

## Bundle T Additions (New in This Package)

### T.1: Treatment Panel Card Redesign
- **File:** `components/TreatmentPlanCards.tsx` (~480 LOC)
- Multi-sitting progress bars, payment badges, lab status indicators
- 3 view modes (List / Grouped by Diagnosis / Compact)
- Sort + filter controls
- Expandable sitting timeline
- Integrated into TreatmentWorkspace.tsx automatically

### T.2: AR Smile Upgrade
- **File:** `app/public/smile/page.tsx` (857 LOC) — rewritten
- 4 AR effects: Whitening, Braces, Veneers, Alignment Guide
- BanubaSDK integration (configure token in Settings → AR Preview)
- Falls back to face-api.js if no Banuba token
- **File:** `backend/app/api/v1/endpoints/ar_settings.py` — new endpoint
- **File:** `backend/migrations/022_bundle_t_ar_cards.sql` — new migration
- AR Settings tab added to Settings Hub

### Branding Fixes
- All "DentAssist" references → "Siya Dental Care"
- Database URL → `siya_dental`

---

## AR Configuration (Optional)

To enable enhanced AR effects (braces, veneers):

1. Sign up at [Banuba Developer Portal](https://docs.banuba.com/face-ar-sdk/web/web_overview)
2. Get a Web SDK client token (~$100-500/mo depending on usage)
3. In the app: Settings → AR Preview → paste token
4. Enable desired effects → Save

Without a Banuba token, the smile preview page still works with basic whitening (free, using face-api.js).

---

## File Structure Summary

```
├── app/                    # Next.js pages
│   ├── page.tsx           # Main doctor dashboard (1098 LOC)
│   ├── specialist/        # Specialist panel
│   ├── phone/             # Mobile phone view
│   └── public/            # Public-facing pages
│       ├── consult/       # Phone consultation booking
│       ├── rating/        # Patient rating submission
│       └── smile/         # AR smile preview (T.2)
├── components/            # React components (32 files)
│   ├── TreatmentPlanCards.tsx    # NEW (T.1)
│   ├── TreatmentWorkspace.tsx   # Patched for T.1
│   ├── SettingsHub.tsx          # Patched for T.2 (AR tab)
│   └── ...
├── lib/
│   └── api.ts             # All API functions (1100+ LOC)
├── backend/
│   ├── app/main.py        # FastAPI app with all routes
│   ├── app/api/v1/endpoints/   # 26 endpoint files
│   ├── app/services/           # 4 service files
│   └── migrations/             # 019-022
├── database/
│   ├── dentassist.sql                  # Base schema
│   └── bundle_migrations_combined.sql  # All bundle migrations (019-022)
└── DEPLOY.md              # This file
```
