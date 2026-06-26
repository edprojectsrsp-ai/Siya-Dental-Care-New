from fastapi import APIRouter
from app.api.v1.endpoints import auth, appointments, patients, treatment_plans, prescriptions, payments, catalog, dashboard
router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(appointments.router)
router.include_router(patients.router)
router.include_router(treatment_plans.router)
router.include_router(prescriptions.router)
router.include_router(payments.router)
router.include_router(catalog.router)
router.include_router(dashboard.router)
