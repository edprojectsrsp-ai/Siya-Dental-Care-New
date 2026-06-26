# DentAssist v2 — Final Clean Build

## Setup (Copy-paste these commands)

### Step 1: Backend
```bash
cd backend
cp .env.example .env
docker compose up -d
# Wait 15 seconds for database to initialize
pip install sqlalchemy asyncpg passlib bcrypt pydantic-settings python-jose --break-system-packages -q
python scripts/setup.py set-pin +919876500001 1234
# Verify: curl http://localhost:8000/health
```

### Step 2: Frontend
```bash
cd ../frontend
npm install
npm run dev
```

### Step 3: Open
- http://localhost:3000 — Login with +919876500001 / 1234
- http://localhost:8000/docs — API documentation

## What's Connected (Frontend ↔ Backend)

| Screen | API Call | Working |
|--------|---------|---------|
| Login | POST /auth/login | ✅ |
| Dashboard stats | GET /dashboard/stats | ✅ |
| Today's queue | GET /appointments/today | ✅ |
| Pending requests | GET /appointments/pending | ✅ |
| Confirm appointment | PATCH /appointments/{id}/confirm | ✅ |
| Reject appointment | PATCH /appointments/{id}/reject | ✅ |
| Status: arrived/start/done | PATCH /appointments/{id}/status | ✅ |
| Walk-in creation | POST /appointments/walkin | ✅ |
| Patient search | GET /patients/search | ✅ |
| Medicine catalog | GET /catalog/medicines | ✅ |
| Procedure catalog | GET /catalog/procedures | ✅ |
| Outstanding balances | GET /payments/outstanding | ✅ |
| Revenue today | Inside dashboard/stats | ✅ |
| Auto-refresh (30s) | All endpoints | ✅ |
| Clinics list (login) | GET /clinics | ✅ |
| Logout | Client-side token clear | ✅ |

## Database: 20 tables, 23 medicines, 28 procedures (all seeded)
## Backend: 50+ endpoints, 8 route groups
## Frontend: Phone PWA + Website, connected to all APIs above
