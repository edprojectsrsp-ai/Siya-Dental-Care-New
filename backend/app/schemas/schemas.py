"""DentAssist v2 — All Pydantic schemas"""
from datetime import date, time, datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field

# ─── AUTH ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    # staff_id lets the login screen avoid sending phone numbers over the wire
    # (the public staff dropdown no longer exposes them). phone is still accepted
    # for other callers (e.g. WhatsApp-bot login flows) that only have the number.
    phone: Optional[str] = None
    staff_id: Optional[UUID] = None
    pin: str
    clinic_id: UUID
class TokenResponse(BaseModel):
    access_token: str; token_type: str = "bearer"; staff_id: UUID; name: str; role: str; clinic_id: UUID; clinic_name: str; multi_clinic: bool = False

# ─── CLINIC ──────────────────────────────────────────
class ClinicOut(BaseModel):
    id: UUID; name: str; short_name: str; address: str; phone: str; whatsapp_number: str; timings: dict; google_maps_link: Optional[str]=None; doctor_name: Optional[str]=None; doctor_degree: Optional[str]=None; doctor_reg_no: Optional[str]=None
    model_config = {"from_attributes": True}
class ClinicUpdate(BaseModel):
    name: Optional[str]=None; address: Optional[str]=None; phone: Optional[str]=None; timings: Optional[dict]=None; doctor_name: Optional[str]=None; doctor_degree: Optional[str]=None; doctor_reg_no: Optional[str]=None; logo_url: Optional[str]=None; signature_url: Optional[str]=None

# ─── PATIENT ─────────────────────────────────────────
class PatientCreate(BaseModel):
    name: str; phone: str; age: Optional[int]=None; gender: Optional[str]=None; address: Optional[str]=None; preferred_clinic_id: Optional[UUID]=None
class PatientUpdate(BaseModel):
    name: Optional[str]=None; age: Optional[int]=None; gender: Optional[str]=None; address: Optional[str]=None
class PatientOut(BaseModel):
    id: UUID; name: str; phone: str; age: Optional[int]=None; gender: Optional[str]=None; total_visits: int=0; created_at: datetime
    model_config = {"from_attributes": True}

# ─── HEALTH HISTORY ──────────────────────────────────
class HealthHistoryUpdate(BaseModel):
    diabetes: bool=False; hypertension: bool=False; heart_disease: bool=False; thyroid: bool=False; asthma: bool=False; kidney_disease: bool=False; liver_disease: bool=False; pregnant: bool=False; blood_thinner: bool=False; allergies: str=""; previous_surgeries: str=""; current_medicines: str=""; smoking: bool=False; tobacco: bool=False; other_conditions: str=""
class HealthHistoryOut(HealthHistoryUpdate):
    patient_id: UUID; alerts: List[dict] = []
    model_config = {"from_attributes": True}

# ─── APPOINTMENT ─────────────────────────────────────
class AppointmentCreate(BaseModel):
    patient_id: UUID; clinic_id: UUID; requested_date: date; requested_time: time; source: str="whatsapp"; reason: Optional[str]=None
    phone_number: Optional[str] = None  # contact phone at booking time (new field)
class WalkinCreate(BaseModel):
    patient_name: str; patient_phone: str; patient_age: Optional[int]=None; clinic_id: UUID; reason: Optional[str]=None; source: str="walkin"
class AppointmentStatusUpdate(BaseModel):
    status: str; staff_notes: Optional[str]=None
class AppointmentConfirm(BaseModel):
    confirmed_date: date; confirmed_time: time; staff_notes: Optional[str]=None
class AppointmentOut(BaseModel):
    id: UUID; patient_id: UUID; clinic_id: UUID; requested_date: Optional[date]=None; requested_time: Optional[time]=None; confirmed_date: Optional[date]=None; confirmed_time: Optional[time]=None; source: str; reason: Optional[str]=None; status: str; treatment_plan_id: Optional[UUID]=None; sitting_number: Optional[int]=None; arrived_at: Optional[datetime]=None; started_at: Optional[datetime]=None; completed_at: Optional[datetime]=None; staff_notes: Optional[str]=None; created_at: datetime; patient_name: Optional[str]=None; patient_phone: Optional[str]=None; patient_age: Optional[int]=None
    phone_number: Optional[str] = None  # new field on appointment
    appointment_type: Optional[str] = None
    chief_complaints: Optional[list] = None
    workflow_status: Optional[str] = None
    contact_status: Optional[str] = None
    model_config = {"from_attributes": True}

# ─── TREATMENT PLAN ──────────────────────────────────
class PlanItemCreate(BaseModel):
    procedure_catalog_id: Optional[UUID]=None; procedure_name: str; tooth_number: Optional[str]=None; estimated_cost: float=0
class TreatmentPlanCreate(BaseModel):
    patient_id: UUID; clinic_id: UUID; doctor_id: Optional[UUID]=None; name: str; complaint: Optional[str]=None; diagnosis: Optional[str]=None; items: List[PlanItemCreate]=[]; total_sittings_planned: int=1; discount: float=0; extra_charges: float=0
class TreatmentPlanUpdate(BaseModel):
    name: Optional[str]=None; complaint: Optional[str]=None; diagnosis: Optional[str]=None; discount: Optional[float]=None; extra_charges: Optional[float]=None; total_sittings_planned: Optional[int]=None; followup_date: Optional[date]=None; followup_notes: Optional[str]=None; internal_notes: Optional[str]=None; status: Optional[str]=None
class SittingCreate(BaseModel):
    sitting_number: int; date: Optional[date]=None; procedures_done: Optional[str]=None; notes: Optional[str]=None; amount_collected: float=0; payment_mode: Optional[str]=None
class TreatmentPlanOut(BaseModel):
    id: UUID; patient_id: UUID; clinic_id: UUID; name: str; complaint: Optional[str]=None; diagnosis: Optional[str]=None; estimated_cost: float; extra_charges: float; discount: float; final_payable: float; total_paid: float; balance: float; total_sittings_planned: int; sittings_completed: int; status: str; followup_date: Optional[date]=None; followup_notes: Optional[str]=None; internal_notes: Optional[str]=None; items: List[dict]=[]; sittings: List[dict]=[]; payments: List[dict]=[]; created_at: datetime
    model_config = {"from_attributes": True}

# ─── PRESCRIPTION ────────────────────────────────────
class MedicineItem(BaseModel):
    name: str; strength: str=""; dose: str=""; frequency: str=""; duration: str=""; instructions: str=""
class PrescriptionCreate(BaseModel):
    appointment_id: Optional[UUID]=None; plan_id: Optional[UUID]=None; patient_id: UUID; doctor_id: UUID; clinic_id: UUID; complaint: Optional[str]=None; diagnosis: Optional[str]=None; doctor_raw_notes: Optional[str]=None; medicines: List[MedicineItem]=[]; visible_advice: Optional[str]=None; internal_notes: Optional[str]=None; followup_date: Optional[date]=None
class PrescriptionAIRequest(BaseModel):
    raw_notes: str; patient_name: Optional[str]=None; patient_age: Optional[int]=None
class PrescriptionOut(BaseModel):
    id: UUID; patient_id: UUID; complaint: Optional[str]=None; diagnosis: Optional[str]=None; medicines: Any; visible_advice: Optional[str]=None; followup_date: Optional[date]=None; pdf_url: Optional[str]=None; sent_via_whatsapp: bool=False; created_at: datetime
    model_config = {"from_attributes": True}

# ─── PAYMENT ─────────────────────────────────────────
class PaymentCollect(BaseModel):
    patient_id: UUID; plan_id: Optional[UUID]=None; appointment_id: Optional[UUID]=None; clinic_id: UUID; amount: float; payment_mode: str; remarks: Optional[str]=None; date: Optional[date]=None

# Bundle X — restored multi-mode payment (regression fix)
class PaymentSplit(BaseModel):
    mode: str       # cash | upi | card | razorpay | bank_transfer | other
    amount: float
    reference: Optional[str] = None   # UPI ref, cheque#, etc.

class PaymentCollectMulti(BaseModel):
    patient_id: UUID
    plan_id: Optional[UUID] = None
    appointment_id: Optional[UUID] = None
    clinic_id: UUID
    splits: List[PaymentSplit]
    remarks: Optional[str] = None
    date: Optional[date] = None

class PaymentOut(BaseModel):
    id: UUID; patient_id: UUID; plan_id: Optional[UUID]=None; amount: float; payment_mode: str; remarks: Optional[str]=None; date: date; created_at: datetime
    model_config = {"from_attributes": True}

# ─── CATALOG (Admin) ─────────────────────────────────
class MedicineCatalogCreate(BaseModel):
    name: str; category: str; default_strength: str=""; default_dose: str=""; default_frequency: str=""; default_duration: str=""; instructions: str=""; strengths: List[str]=[]; frequencies: List[str]=[]; contraindications: Optional[str]=None
class MedicineCatalogUpdate(BaseModel):
    name: Optional[str]=None; category: Optional[str]=None; default_strength: Optional[str]=None; default_dose: Optional[str]=None; default_frequency: Optional[str]=None; default_duration: Optional[str]=None; instructions: Optional[str]=None; is_active: Optional[bool]=None
class ProcedureCatalogCreate(BaseModel):
    name: str; category: str; cost_min: float=0; cost_max: float=0; default_cost: float=0; followup_days: Optional[int]=None; common_advice: List[str]=[]; medicine_ids: List[str]=[]
class ProcedureCatalogUpdate(BaseModel):
    name: Optional[str]=None; category: Optional[str]=None; cost_min: Optional[float]=None; cost_max: Optional[float]=None; default_cost: Optional[float]=None; followup_days: Optional[int]=None; is_active: Optional[bool]=None

# ─── DASHBOARD ───────────────────────────────────────
class DashboardStats(BaseModel):
    pending: int; confirmed: int; arrived: int; in_progress: int; done: int; no_show: int; total_today: int; revenue_today: float; outstanding_total: float; pending_requests: int

# ─── CATALOG SUGGESTION ─────────────────────────────
class ProcedureSuggestion(BaseModel):
    procedure: dict; suggested_medicines: List[dict]; suggested_advice: List[str]; followup_days: Optional[int]=None
