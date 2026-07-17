"""Siya Dental Care — Main Application (Sprint 16: Clinic Hub)"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.core.schema_bootstrap import ensure_google_places_schema
from app.api.v1.router import router
from app.api.uploads import router as uploads_router, public_router, public_site_router

# Sprint 9-15 endpoint routers
from app.api.v1.endpoints.diary import router as diary_router
from app.api.v1.endpoints.walkins import tba_router, walkin_router, cleanup_router
from app.api.v1.endpoints.coordination import notif_router, session_router
from app.api.v1.endpoints.sprint13_15 import reports_router, tooth_router, image_router
# Sprint 16: Unified Clinic Hub
from app.api.v1.endpoints.workflow import router as hub_router
from app.api.v1.endpoints.workspace import router as ws_router
from app.api.v1.endpoints.admin import router as admin_router, public_router as site_public_router
from app.api.v1.endpoints.website import router as website_router, public_router as website_public_router
from app.api.v1.endpoints.lab import router as lab_router
from app.api.v1.endpoints.specialist import router as specialist_router
from app.api.v1.endpoints.patients_db import router as patients_db_router
from app.api.v1.endpoints.settings import router as settings_router, msg_router
from app.api.v1.endpoints.consult_rating import (
    router as consult_router,
    rating_router,
    public_consult_router,
    trigger_router,
)
from app.api.v1.endpoints.bundle_r import (
    constraints_router,
    observations_router,
    counters_router,
    followups_router,
    tiers_router,
)
from app.api.v1.endpoints.digests import digests_router
from app.api.v1.endpoints.bundle_s import (
    clinic_info_router,
    hours_router,
    catalog_router,
    fee_router,
    kanban_router,
    illness_router,
)
from app.api.v1.endpoints.prescription_v2_route import rx_v2_router
from app.api.v1.endpoints.ar_settings import ar_public_router, ar_admin_router
from app.api.v1.endpoints.bundle_u import router as bundle_u_router
from app.api.v1.endpoints.bundle_v import router as bundle_v_router
from app.api.v1.endpoints.bundle_w import router as bundle_w_router, public_router as bundle_w_public_router
from app.api.v1.endpoints.dashboard_v2 import router as dashboard_v2_router
from app.api.v1.endpoints.bundle_x import (
    modvis_router,
    verify_router,
    callconfirm_router,
    workshop_router,
    revenue_router,
    archived_router,
)
from app.jobs.reminders_scheduler import start_reminder_scheduler, scheduler_router as reminders_scheduler_router
from app.jobs.google_reviews_scheduler import (
    router as google_reviews_router,
    start_google_reviews_scheduler,
    stop_google_reviews_scheduler,
)

settings = get_settings()
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, docs_url="/docs")
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing v1 router (appointments, patients, treatment_plans, prescriptions, payments, catalog, dashboard, auth)
app.include_router(router)
app.include_router(uploads_router, prefix="/api")
app.include_router(public_router, prefix="/api")
app.include_router(public_site_router, prefix="/api")

# Sprint 9-15 routers
app.include_router(diary_router, prefix="/api")
app.include_router(tba_router, prefix="/api")
app.include_router(walkin_router, prefix="/api")
app.include_router(cleanup_router, prefix="/api")
app.include_router(notif_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(tooth_router, prefix="/api")
app.include_router(image_router, prefix="/api")

# Sprint 16: Clinic Hub
app.include_router(hub_router, prefix="/api")
app.include_router(ws_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(site_public_router, prefix="/api")
app.include_router(website_router, prefix="/api")
app.include_router(website_public_router, prefix="/api")
app.include_router(lab_router, prefix="/api")
app.include_router(specialist_router, prefix="/api")
app.include_router(patients_db_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(msg_router, prefix="/api")
app.include_router(consult_router, prefix="/api")
app.include_router(rating_router, prefix="/api")
app.include_router(public_consult_router, prefix="/api")
app.include_router(trigger_router, prefix="/api")
app.include_router(constraints_router, prefix="/api")
app.include_router(observations_router, prefix="/api")
app.include_router(counters_router, prefix="/api")
app.include_router(followups_router, prefix="/api")
app.include_router(tiers_router, prefix="/api")
app.include_router(digests_router, prefix="/api")
app.include_router(clinic_info_router, prefix="/api")
app.include_router(hours_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(fee_router, prefix="/api")
app.include_router(kanban_router, prefix="/api")
app.include_router(illness_router, prefix="/api")
app.include_router(rx_v2_router, prefix="/api")
app.include_router(ar_public_router)  # no prefix — has /api in route
app.include_router(ar_admin_router, prefix="/api")
app.include_router(bundle_u_router, prefix="/api")
app.include_router(reminders_scheduler_router, prefix="/api")
app.include_router(google_reviews_router, prefix="/api")
app.include_router(bundle_v_router, prefix="/api")
app.include_router(bundle_w_router, prefix="/api")
app.include_router(bundle_w_public_router, prefix="/api")
app.include_router(dashboard_v2_router, prefix="/api")
app.include_router(modvis_router, prefix="/api")
app.include_router(verify_router, prefix="/api/specialist")
app.include_router(callconfirm_router, prefix="/api/hub")
app.include_router(workshop_router, prefix="/api/workshop")
app.include_router(revenue_router, prefix="/api/revenue")
app.include_router(archived_router, prefix="/api/patients")

os.makedirs("uploads/patient_media", exist_ok=True)
os.makedirs("uploads/qr", exist_ok=True)
os.makedirs("uploads/media", exist_ok=True)
os.makedirs("uploads/site", exist_ok=True)
os.makedirs("uploads/lab", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup():
    await ensure_google_places_schema()
    await start_reminder_scheduler()
    await start_google_reviews_scheduler()

@app.on_event("shutdown")
async def shutdown():
    await stop_google_reviews_scheduler()

@app.get("/")
async def root(): return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}

@app.get("/health")
async def health(): return {"status": "healthy"}
