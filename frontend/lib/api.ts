/**
 * DentAssist — API Client
 * All backend calls in one place. Uses /api proxy to FastAPI.
 */

import { sanitizeDeep } from "./text";

const BASE = "/api/v1";

// ─── Token management ────────────────────────────────
let _token: string | null = null;
function getStorage(): Storage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dentassist:session-expired"));
  }
}

export function setToken(token: string) {
  _token = token;
  const storage = getStorage();
  if (storage) {
    storage.setItem("da_token", token);
  }
}

export function getToken(): string | null {
  if (_token) return _token;
  const storage = getStorage();
  if (storage) {
    _token = storage.getItem("da_token");
  }
  return _token;
}

export function clearToken() {
  _token = null;
  const storage = getStorage();
  if (storage) {
    storage.removeItem("da_token");
    storage.removeItem("da_staff");
  }
}

export function getStaffInfo() {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem("da_staff");
    if (!saved) return null;
    try {
      return sanitizeDeep(JSON.parse(saved));
    } catch {
      storage.removeItem("da_staff");
    }
  }
  return null;
}

export function setStaffInfo(info: any) {
  const storage = getStorage();
  if (storage) {
    storage.setItem("da_staff", JSON.stringify(sanitizeDeep(info)));
  }
}

// ─── Fetch wrapper ───────────────────────────────────
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("/api/") ? path : `${BASE}${path}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (res.status === 401) {
    clearToken();
    notifySessionExpired();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    const detail = err.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join("; ")
          : detail
            ? JSON.stringify(detail)
            : `Error ${res.status}`;
    throw new Error(message || `Error ${res.status}`);
  }

  return sanitizeDeep(await res.json());
}

// ─── AUTH ─────────────────────────────────────────────
export async function login(phone: string, pin: string, clinic_id: string) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, pin, clinic_id }),
  });
  setToken(data.access_token);
  setStaffInfo({
    staff_id: data.staff_id,
    name: data.name,
    role: data.role,
    clinic_id: data.clinic_id,
    clinic_name: data.clinic_name,
  });
  return data;
}

export function logout() {
  clearToken();
}

export async function getStaffForLogin(): Promise<any[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${BASE}/staff/public`, { signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Staff list request timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  if (!res.ok) throw new Error("Cannot load staff list");
  return res.json();
}

// ─── CLINICS ──────────────────────────────────────────
export async function getClinics() {
  return apiFetch("/clinics");
}

// ─── AUTH ─────────────────────────────────────────────
export async function authMe() {
  return apiFetch("/auth/me");
}

// ─── DASHBOARD ────────────────────────────────────────
/** @deprecated Prefer dashboardSummary / getSidebarStats */
export async function getDashboardStats(clinic_id: string) {
  return apiFetch(`/dashboard/stats?clinic_id=${clinic_id}`);
}

/** Sidebar + billing tiles — dashboard v2 summary, v1 fallback for specialist role */
export async function getSidebarStats(clinic_id: string) {
  try {
    const s = await dashboardSummary(clinic_id);
    return {
      revenue_today: Number(s.revenue_today || 0),
      outstanding_total: Number(s.outstanding_total || 0),
      pending_requests: Number(s.pending_site_requests ?? s.reschedule_pending_count ?? 0),
      total_today: Number(s.appts_today_total || 0),
      confirmed: Number(s.appts_today_confirmed || 0),
      in_progress: Number(s.appts_today_in_clinic || 0),
      done: Number(s.appts_today_completed || 0),
    };
  } catch {
    return getDashboardStats(clinic_id);
  }
}

// ─── APPOINTMENTS ─────────────────────────────────────
export async function getTodayQueue(clinic_id: string) {
  return apiFetch(`/appointments/today?clinic_id=${clinic_id}`);
}

export async function getPendingAppointments(clinic_id?: string) {
  const q = clinic_id ? `?clinic_id=${clinic_id}` : "";
  return apiFetch(`/appointments/pending${q}`);
}

export async function confirmAppointment(id: string, data: any) {
  return apiFetch(`/appointments/${id}/confirm`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function rejectAppointment(id: string, reason?: string) {
  return apiFetch(`/appointments/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejection_reason: reason }),
  });
}

export async function updateAppointmentStatus(id: string, status: string, notes?: string) {
  return apiFetch(`/appointments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, staff_notes: notes }),
  });
}

// ─── PATIENTS ─────────────────────────────────────────
export async function searchPatients(query: string) {
  return apiFetch(`/patients/search?q=${encodeURIComponent(query)}`);
}

export async function getPatient(id: string) {
  return apiFetch(`/patients/${id}`);
}

// ─── TREATMENTS ───────────────────────────────────────
// ─── PRESCRIPTIONS ────────────────────────────────────
export async function createPrescription(data: any) {
  return apiFetch("/prescriptions/", { method: "POST", body: JSON.stringify(data) });
}

export async function sendPrescription(id: string) {
  return apiFetch(`/prescriptions/${id}/send`, { method: "POST" });
}

// ─── PAYMENTS ─────────────────────────────────────────
export async function getOutstandingBalances(clinic_id?: string) {
  const q = clinic_id ? `?clinic_id=${clinic_id}` : "";
  return apiFetch(`/payments/outstanding${q}`);
}

// ─── TREATMENT PLANS (v2) ─────────────────────────────
export async function createTreatmentPlan(data: any) {
  return apiFetch("/treatment-plans/", { method: "POST", body: JSON.stringify(data) });
}
// ─── HEALTH HISTORY (v2) ──────────────────────────────
export async function saveHealthHistory(patientId: string, data: any) {
  return apiFetch(`/patients/${patientId}/health`, { method: "POST", body: JSON.stringify(data) });
}

// ─── CATALOG (v2) ─────────────────────────────────────
export async function getMedicines(category?: string, search?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  return apiFetch(`/catalog/medicines?${params}`);
}
export async function addMedicine(data: any) {
  return apiFetch("/catalog/medicines", { method: "POST", body: JSON.stringify(data) });
}
export async function updateMedicine(id: string, data: any) {
  return apiFetch(`/catalog/medicines/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function getProcedures(category?: string) {
  const q = category ? `?category=${category}` : "";
  return apiFetch(`/catalog/procedures${q}`);
}
export async function addProcedure(data: any) {
  return apiFetch("/catalog/procedures", { method: "POST", body: JSON.stringify(data) });
}
export async function updateProcedure(id: string, data: any) {
  return apiFetch(`/catalog/procedures/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function getSuggestions(procedureIds: string[]) {
  return apiFetch(`/catalog/suggestions?procedure_ids=${procedureIds.join(",")}`);
}
// ─── PAYMENTS (v2) ─────────────────────────────────────
export async function collectPayment(data: any) {
  return apiFetch("/payments/collect", { method: "POST", body: JSON.stringify(data) });
}
export async function getDailyRevenue(date?: string, clinicId?: string) {
  const params = new URLSearchParams();
  if (date) params.set("d", date);
  if (clinicId) params.set("clinic_id", clinicId);
  return apiFetch(`/payments/revenue/daily?${params}`);
}
// ─── CLINIC SETTINGS (v2) ──────────────────────────────
// ─── STAFF MANAGEMENT ─────────────────────────────────
export async function getStaffList(clinicId?: string) {
  const q = clinicId ? `?clinic_id=${clinicId}` : "";
  return apiFetch(`/staff${q}`);
}
export async function addStaff(data: any) {
  return apiFetch("/staff", { method: "POST", body: JSON.stringify(data) });
}
export async function updateStaff(id: string, data: any) {
  return apiFetch(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
// ─── PRESCRIPTION PDF ─────────────────────────────────
export function getPrescriptionPdfUrl(rxId: string, accessToken?: string) {
  const qs = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : "";
  return `${BASE}/prescriptions/${rxId}/pdf${qs}`;
}

// ─── PATIENT FILE UPLOADS ─────────────────────────────
function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function listPatientUploads(patientId: string) {
  const res = await fetch(`/api/uploads/patient/${patientId}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadPatientFile(patientId: string, form: FormData) {
  const res = await fetch(`/api/uploads/patient/${patientId}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deletePatientUpload(uploadId: string) {
  const res = await fetch(`/api/uploads/${uploadId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.ok;
}

export async function uploadAdminGallery(form: FormData) {
  const res = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════
// SPRINT 16: CLINIC HUB API FUNCTIONS
// ═══════════════════════════════════════════════════════
const HUB = "/api/hub";

export async function hubToday(clinicId: string, date?: string) {
  const q = date ? `&date=${date}` : "";
  return apiFetch(`${HUB}/today?clinic_id=${clinicId}${q}`);
}
export async function hubAppointmentsRange(clinicId: string, from: string, to: string) {
  return apiFetch(`${HUB}/appointments-range?clinic_id=${clinicId}&from=${from}&to=${to}`);
}
export async function hubMarkStatus(aptId: string, newStatus: string, cancelReason?: string) {
  return apiFetch(`${HUB}/mark/${aptId}`, { method: "POST", body: JSON.stringify({ new_status: newStatus, cancel_reason: cancelReason }) });
}
// ── Notifications (clinic activity feed / bell) ──
export async function notifList(clinicId: string, onlyUnread = false, limit = 50) {
  return apiFetch(`/api/notifications/me?clinic_id=${clinicId}&only_unread=${onlyUnread}&limit=${limit}`);
}
export async function notifUnreadCount(clinicId: string) {
  return apiFetch(`/api/notifications/unread-count?clinic_id=${clinicId}`);
}
export async function notifMarkRead(id: string) {
  return apiFetch(`/api/notifications/${id}/mark-read`, { method: "POST" });
}
export async function notifMarkAllRead(clinicId: string) {
  return apiFetch(`/api/notifications/mark-all-read?clinic_id=${clinicId}`, { method: "POST" });
}

// ── Admin Case Manager (status rescue for stuck appointments) ──
export async function hubAdminAllAppointments(clinicId: string, status?: string) {
  const q = status ? `&status=${encodeURIComponent(status)}` : "";
  return apiFetch(`${HUB}/admin/all-appointments?clinic_id=${clinicId}${q}`);
}
export async function hubAdminForceStatus(aptId: string, newStatus: string, reason?: string, clearSchedule = false) {
  return apiFetch(`${HUB}/admin/force-status/${aptId}`, { method: "POST", body: JSON.stringify({ new_status: newStatus, reason, clear_schedule: clearSchedule }) });
}
export async function hubQueue(clinicId: string) {
  return apiFetch(`${HUB}/queue?clinic_id=${clinicId}`);
}
export async function hubReturnToToday(aptId: string) {
  return apiFetch(`${HUB}/return-to-today/${aptId}`, { method: "POST" });
}
export async function hubCheckPhone(phone: string) {
  return apiFetch(`${HUB}/check-phone/${phone}`);
}
export async function hubAddPatient(data: any) {
  return apiFetch(`${HUB}/add-patient`, { method: "POST", body: JSON.stringify(data) });
}
export async function hubCollectPayment(data: any) {
  return apiFetch(`${HUB}/collect-payment`, { method: "POST", body: JSON.stringify(data) });
}
export async function hubConditions() {
  return apiFetch(`${HUB}/conditions`);
}
export async function hubAddCondition(name: string) {
  return apiFetch(`${HUB}/conditions?name=${encodeURIComponent(name)}`, { method: "POST" });
}
export async function hubUpdateIllnesses(patientId: string, illnesses: string[]) {
  return apiFetch(`${HUB}/patient/${patientId}/illnesses`, { method: "POST", body: JSON.stringify({ existing_illnesses: illnesses }) });
}
export async function hubComplaints() {
  return apiFetch(`${HUB}/complaints`);
}
export async function hubAddComplaint(name: string) {
  return apiFetch(`${HUB}/complaints?name=${encodeURIComponent(name)}`, { method: "POST" });
}
export async function hubReschedule(aptId: string, newDate: string, opts?: { time?: string; status?: string; reason?: string }) {
  return apiFetch(`${HUB}/reschedule/${aptId}`, { method: "POST", body: JSON.stringify({ new_date: newDate, new_time: opts?.time || null, status: opts?.status || "scheduled", reason: opts?.reason || null }) });
}
export async function hubBulkWhatsApp(clinicId: string) {
  return apiFetch(`${HUB}/bulk-whatsapp?clinic_id=${clinicId}`);
}
export async function hubStartSession(data: any) {
  return apiFetch(`/api/sessions/start`, { method: "POST", body: JSON.stringify(data) });
}
export async function diaryWhatsAppTemplate(aptId: string, template = "confirmation") {
  return apiFetch(`/api/diary/${aptId}/whatsapp-template?template=${template}`);
}
export async function diaryLogMessage(aptId: string, channel: string, template?: string, body?: string) {
  return apiFetch(`/api/diary/${aptId}/log-message`, { method: "POST", body: JSON.stringify({ channel, template_used: template, message_body: body }) });
}

// ── Hub v2 — Final Workflow Spec additions ──────────────────────
export async function hubCallDiary(clinicId: string, days = 7) {
  return apiFetch(`${HUB}/call-diary?clinic_id=${clinicId}&days_ahead=${days}`);
}
export async function hubAppointmentTypes() {
  return apiFetch(`${HUB}/appointment-types`);
}
export async function hubDoctorDayList(clinicId: string, doctorPhone?: string) {
  return apiFetch(`${HUB}/doctor-day-list?clinic_id=${clinicId}${doctorPhone ? `&doctor_phone=${doctorPhone}` : ""}`);
}

// ── Treatment Workspace v3 ──────────────────────────────────────
const WS = "/api/ws";
export async function wsFull(patientId: string, clinicId: string, aptId?: string) {
  return apiFetch(`${WS}/${patientId}/full?clinic_id=${clinicId}${aptId ? `&apt_id=${aptId}` : ""}`);
}
export async function wsAddPlanItem(patientId: string, data: any) {
  return apiFetch(`${WS}/${patientId}/plan-item`, { method: "POST", body: JSON.stringify(data) });
}
export async function wsEditPlanItem(itemId: string, data: any) {
  return apiFetch(`${WS}/plan-item/${itemId}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function wsDeletePlanItem(itemId: string) {
  return apiFetch(`${WS}/plan-item/${itemId}`, { method: "DELETE" });
}
export async function wsDuplicatePlanItem(itemId: string) {
  return apiFetch(`${WS}/plan-item/${itemId}/duplicate`, { method: "POST" });
}
export async function wsTreatments() {
  return apiFetch(`${WS}/treatments`);
}
export async function wsAddTreatment(data: { name: string; default_cost?: number; is_tooth_based?: boolean }) {
  return apiFetch(`${WS}/treatments`, { method: "POST", body: JSON.stringify(data) });
}
export async function wsAddWorkStep(procId: string, step: string) {
  return apiFetch(`${WS}/treatments/${procId}/work-step`, { method: "POST", body: JSON.stringify({ step }) });
}
export async function wsToothIssues() {
  return apiFetch(`${WS}/tooth-issues`);
}
export async function wsChairsideNotes(patientId: string, notes: string) {
  return apiFetch(`${WS}/${patientId}/chairside-notes`, { method: "PATCH", body: JSON.stringify({ notes }) });
}
export async function wsAptComplaints(aptId: string, complaints: string[]) {
  return apiFetch(`${WS}/appointment/${aptId}/complaints`, { method: "PATCH", body: JSON.stringify({ chief_complaints: complaints }) });
}
export async function wsSaveDraft(patientId: string, data: any) {
  return apiFetch(`${WS}/${patientId}/draft`, { method: "POST", body: JSON.stringify({ data }) });
}
export async function wsCloseVisit(data: any) {
  return apiFetch(`${WS}/visit/close`, { method: "POST", body: JSON.stringify(data) });
}
export async function hubBook(data: any) {
  return apiFetch(`${HUB}/book`, { method: "POST", body: JSON.stringify(data) });
}

// ── Admin: Staff (User Control) ─────────────────────────────────
const ADMIN = "/api/admin";
export async function adminListStaff(includeInactive = false) {
  return apiFetch(`${ADMIN}/staff${includeInactive ? "?include_inactive=true" : ""}`);
}
export async function adminCreateStaff(data: any) {
  return apiFetch(`${ADMIN}/staff`, { method: "POST", body: JSON.stringify(data) });
}
export async function adminUpdateStaff(staffId: string, data: any) {
  return apiFetch(`${ADMIN}/staff/${staffId}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function adminResetPin(staffId: string, newPin: string) {
  return apiFetch(`${ADMIN}/staff/${staffId}/reset-pin`, { method: "POST", body: JSON.stringify({ new_pin: newPin }) });
}
export async function adminDeactivateStaff(staffId: string) {
  return apiFetch(`${ADMIN}/staff/${staffId}`, { method: "DELETE" });
}
// ── Admin: Templates ─────────────────────────────────────────────
export async function adminListTemplates() { return apiFetch(`${ADMIN}/templates`); }
export async function adminUseTemplate(templateId: string) {
  return apiFetch(`${ADMIN}/templates/${templateId}/use`, { method: "POST" });
}
// ── Admin: Gallery ───────────────────────────────────────────────
export async function adminListGallery() { return apiFetch(`${ADMIN}/gallery`); }
export async function adminDeleteGalleryImage(imageId: string) {
  return apiFetch(`${ADMIN}/gallery/${imageId}`, { method: "DELETE" });
}
// ── Admin: Website CMS ───────────────────────────────────────────
// ── Clinical Examination + Diagnosis ─────────────────────────────
export async function wsExamCatalog() { return apiFetch(`${WS}/exam-catalog`); }
export async function wsDiagCatalog() { return apiFetch(`${WS}/diagnosis-catalog`); }
export async function wsAddToothExam(patientId: string, data: any) { return apiFetch(`${WS}/${patientId}/tooth-exam`, { method: "POST", body: JSON.stringify(data) }); }
export async function wsRemoveToothExam(examId: string) { return apiFetch(`${WS}/tooth-exam/${examId}`, { method: "DELETE" }); }
export async function wsAddToothDiagnosis(patientId: string, data: any) { return apiFetch(`${WS}/${patientId}/tooth-diagnosis`, { method: "POST", body: JSON.stringify(data) }); }
export async function wsRemoveToothDiagnosis(diagId: string) { return apiFetch(`${WS}/tooth-diagnosis/${diagId}`, { method: "DELETE" }); }
export async function wsToothTimeline(patientId: string, toothNumber: number) { return apiFetch(`${WS}/${patientId}/tooth-timeline/${toothNumber}`); }
export async function wsRecordClinicalLink(linkType: string, source: string, target: string) {
  return apiFetch(`${WS}/clinical-learn`, { method: "POST", body: JSON.stringify({ link_type: linkType, source, target }) });
}
export async function wsClinicalSuggest(linkType: string, source: string, limit = 8) {
  return apiFetch(`${WS}/clinical-suggest?link_type=${encodeURIComponent(linkType)}&source=${encodeURIComponent(source)}&limit=${limit}`);
}
// ╔══════════════════════════════════════════════════════════════════╗
// ║  api_lab_specialist_additions.ts                                  ║
// ║  APPEND the contents of this file to your existing frontend/lib/  ║
// ║  api.ts (just before the final `}` if there is one, or at EOF).   ║
// ║  Uses the existing `apiFetch` helper defined earlier in that file.║
// ╚══════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════
// LAB MODULE
// ═══════════════════════════════════════════════════════════════════════
const LAB = "/api/lab";

// — Vendors —
export async function labListVendors(includeInactive = false, clinicId?: string) {
  const p = new URLSearchParams();
  if (includeInactive) p.set("include_inactive", "true");
  if (clinicId) p.set("clinic_id", clinicId);
  const qs = p.toString();
  return apiFetch(`${LAB}/vendors${qs ? `?${qs}` : ""}`);
}
export async function labCreateVendor(data: any) {
  return apiFetch(`${LAB}/vendors`, { method: "POST", body: JSON.stringify(data) });
}
export async function labUpdateVendor(id: string, data: any) {
  return apiFetch(`${LAB}/vendors/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function labDeleteVendor(id: string) {
  return apiFetch(`${LAB}/vendors/${id}`, { method: "DELETE" });
}

// — Work types —
// — Orders —
export async function labCreateOrder(data: any) {
  return apiFetch(`${LAB}/orders`, { method: "POST", body: JSON.stringify(data) });
}
export async function labUpdateOrder(id: string, data: any) {
  return apiFetch(`${LAB}/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function labReceiveOrder(id: string) {
  return apiFetch(`${LAB}/orders/${id}/receive`, { method: "POST" });
}
export async function labApproveOrder(id: string) {
  return apiFetch(`${LAB}/orders/${id}/approve`, { method: "POST" });
}
// — Payments —
// — Scheduling guard —
export async function labGuard(patientId: string) {
  return apiFetch(`${LAB}/guard/${patientId}`);
}

// ═══════════════════════════════════════════════════════════════════════
// SPECIALIST MODULE
// ═══════════════════════════════════════════════════════════════════════
const SPEC = "/api/specialist";

// — Specialist directory —
export async function specListSpecialists(clinicId?: string) {
  return apiFetch(`${SPEC}/list${clinicId ? `?clinic_id=${clinicId}` : ""}`);
}
export async function specCreateSpecialist(data: any) {
  return apiFetch(`${SPEC}/list`, { method: "POST", body: JSON.stringify(data) });
}

// — Assignment —
export async function specAssign(appointmentId: string, data: { specialist_id: string; notes?: string }) {
  return apiFetch(`${SPEC}/appointments/${appointmentId}/assign`, { method: "POST", body: JSON.stringify(data) });
}
export async function specUnassign(appointmentId: string) {
  return apiFetch(`${SPEC}/appointments/${appointmentId}/assign`, { method: "DELETE" });
}

// — Queue —
export async function specQueue(specialistId?: string) {
  return apiFetch(`${SPEC}/queue${specialistId ? `?specialist_id=${specialistId}` : ""}`);
}

export async function specialistCallConfirm(appointmentId: string, data: any) {
  return apiFetch(`${SPEC}/appointments/${appointmentId}/call-confirm-specialist`, { method: "POST", body: JSON.stringify(data) });
}

// — Session close —
export async function specCloseSession(appointmentId: string, data: any = {}) {
  return apiFetch(`${SPEC}/appointments/${appointmentId}/close`, { method: "POST", body: JSON.stringify(data) });
}

// — Earnings —
export async function specCreateEarning(data: any) {
  return apiFetch(`${SPEC}/earnings`, { method: "POST", body: JSON.stringify(data) });
}
export async function specListEarnings(filters: { specialist_id?: string; settled?: boolean; date_from?: string; date_to?: string; clinic_id?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.specialist_id) qs.set("specialist_id", filters.specialist_id);
  if (filters.settled !== undefined) qs.set("settled", String(filters.settled));
  if (filters.date_from) qs.set("date_from", filters.date_from);
  if (filters.date_to) qs.set("date_to", filters.date_to);
  if (filters.clinic_id) qs.set("clinic_id", filters.clinic_id);
  return apiFetch(`${SPEC}/earnings${qs.toString() ? `?${qs}` : ""}`);
}
export async function specSettleBatch(earningIds: string[], data: any) {
  return apiFetch(`${SPEC}/earnings/settle-batch`, { method: "POST", body: JSON.stringify({ earning_ids: earningIds, ...data }) });
}

const PDB = "/api/patients-db";

export async function pdbList(opts: {
  clinic_id?: string;
  q?: string;
  sort?: "recent" | "name" | "visits" | "outstanding" | "alerts";
  filter_alerts?: boolean;
  filter_active_plans?: boolean;
  filter_outstanding?: boolean;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (opts.clinic_id) params.set("clinic_id", opts.clinic_id);
  if (opts.q) params.set("q", opts.q);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.filter_alerts) params.set("filter_alerts", "true");
  if (opts.filter_active_plans) params.set("filter_active_plans", "true");
  if (opts.filter_outstanding) params.set("filter_outstanding", "true");
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  return apiFetch(`${PDB}/list?${params.toString()}`);
}

export async function pdbFull(patientId: string) {
  return apiFetch(`${PDB}/${patientId}/full`);
}

export async function pdbTimeline(patientId: string, limit = 100) {
  return apiFetch(`${PDB}/${patientId}/timeline?limit=${limit}`);
}

export async function pdbWorkspaceSnapshot(patientId: string) {
  return apiFetch(`${PDB}/${patientId}/workspace-snapshot`);
}

export async function pdbLabOrders(patientId: string) {
  return apiFetch(`${PDB}/${patientId}/lab-orders`);
}

export async function pdbVisits(patientId: string, limit = 30, offset = 0) {
  return apiFetch(`${PDB}/${patientId}/visits?limit=${limit}&offset=${offset}`);
}

export async function pdbUpdate(patientId: string, data: Partial<{
  name: string; phone: string; age: number; gender: string;
  address: string; chairside_notes: string; existing_illnesses: string[];
}>) {
  return apiFetch(`${PDB}/${patientId}`, { method: "PATCH", body: JSON.stringify(data) });
}

// ════════════════════════════════════════════════════════════════════════════
// frontend/lib/api.ts — APPEND for Bundle Q+
// Settings · Messaging · Phone Consult · Ratings
// ════════════════════════════════════════════════════════════════════════════

// ── Settings ────────────────────────────────────────────────────────────────
export async function settingsGet(clinicId: string) {
  return apiFetch(`/api/settings/clinic/${clinicId}`);
}
export async function settingsUpdate(clinicId: string, patch: any) {
  return apiFetch(`/api/settings/clinic/${clinicId}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export async function settingsTest(clinicId: string, phone: string, message?: string) {
  return apiFetch(`/api/settings/clinic/${clinicId}/test`, {
    method: "POST", body: JSON.stringify({ phone, message }),
  });
}

// ── Templates ───────────────────────────────────────────────────────────────
export async function templatesList(clinicId?: string, category?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  if (category) p.set("category", category);
  return apiFetch(`/api/settings/templates?${p.toString()}`);
}
export async function templateUpsert(body: {
  clinic_id?: string; template_key: string; category: string; label: string;
  body: string; cloud_template_name?: string; cloud_template_lang?: string; is_active?: boolean;
}) {
  return apiFetch(`/api/settings/templates`, { method: "POST", body: JSON.stringify(body) });
}
// ── Message engine ──────────────────────────────────────────────────────────
export async function msgSend(body: {
  clinic_id: string; template_key?: string; body_override?: string;
  recipient_kind?: string; recipient_id?: string; recipient_phone: string;
  recipient_name?: string; variables?: Record<string, any>;
  appointment_id?: string; payment_id?: string; lab_order_id?: string; visit_id?: string;
  scheduled_for?: string; transport_override?: string;
}) {
  return apiFetch(`/api/msg/send`, { method: "POST", body: JSON.stringify(body) });
}

export async function msgBulk(body: {
  clinic_id: string; template_key?: string; body_override?: string;
  common_variables?: Record<string, any>;
  recipients: Array<{
    recipient_id?: string; recipient_kind?: string; recipient_name?: string;
    recipient_phone: string; variables?: Record<string, any>;
  }>;
  transport_override?: string;
}) {
  return apiFetch(`/api/msg/bulk`, { method: "POST", body: JSON.stringify(body) });
}

export async function msgLog(opts: {
  clinic_id?: string; template_key?: string; recipient_kind?: string;
  recipient_id?: string; status?: string; trigger?: string;
  days?: number; limit?: number; offset?: number;
}) {
  const p = new URLSearchParams();
  Object.entries(opts).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  return apiFetch(`/api/msg/log?${p.toString()}`);
}

export async function msgStats(clinicId: string) {
  return apiFetch(`/api/msg/stats?clinic_id=${clinicId}`);
}

export async function msgFlush() {
  return apiFetch(`/api/msg/flush`, { method: "POST" });
}

// ── Phone consultation (admin) ──────────────────────────────────────────────
export async function consultQueue(clinicId?: string, status?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  if (status) p.set("status", status);
  return apiFetch(`/api/consult/queue?${p.toString()}`);
}
export async function consultClaim(consultId: string) {
  return apiFetch(`/api/consult/${consultId}/claim`, { method: "POST" });
}
export async function consultComplete(consultId: string, body: {
  consult_notes?: string; rx_text?: string;
  medicines?: any[]; advice?: string; followup_date?: string; create_patient_record?: boolean;
}) {
  return apiFetch(`/api/consult/${consultId}/complete`, { method: "POST", body: JSON.stringify(body) });
}

// ── Ratings (admin) ─────────────────────────────────────────────────────────
// ── Public (no auth) ────────────────────────────────────────────────────────
export async function publicPhoneConsultCreate(body: {
  clinic_id: string; patient_name: string; patient_phone: string;
  patient_age?: number; patient_gender?: string; complaint: string; duration_complaint?: string;
}) {
  // Public endpoint — bypass auth
  const r = await fetch(`/api/public/phone-consult`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json()).detail || "Failed");
  return r.json();
}
export async function publicPhoneConsultVerify(body: {
  consult_id: string; razorpay_order_id: string;
  razorpay_payment_id: string; razorpay_signature: string;
}) {
  const r = await fetch(`/api/public/phone-consult/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json()).detail || "Failed");
  return r.json();
}
export async function publicRatingGet(token: string) {
  const r = await fetch(`/api/public/rating/${token}`);
  if (!r.ok) throw new Error((await r.json()).detail || "Failed");
  return r.json();
}
export async function publicRatingSubmit(token: string, rating: number, comment?: string) {
  const r = await fetch(`/api/public/rating/${token}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment }),
  });
  if (!r.ok) throw new Error((await r.json()).detail || "Failed");
  return r.json();
}

// ── Trigger helpers (used internally by other flows) ────────────────────────
export async function triggerLabReceived(orderId: string) {
  return apiFetch(`/api/triggers/lab-received/${orderId}`, { method: "POST" });
}
export async function tiersList(opts: { specialist_id?: string; clinic_id?: string } = {}) {
  const p = new URLSearchParams();
  if (opts.specialist_id) p.set("specialist_id", opts.specialist_id);
  if (opts.clinic_id) p.set("clinic_id", opts.clinic_id);
  return apiFetch(`/api/specialist-tiers?${p.toString()}`);
}

export const COLORS = {
  accent: "#0E7C7B",
  accentDeep: "#0A5C5B",
  ink: "#0F172A",
  mute: "#475569",
  muteSoft: "#64748B",
  line: "#E2E8F0",
  bg: "#F8FAFC",
  bgAlt: "#F1F5F9",
  success: "#047857",
  warn: "#B45309",
  danger: "#B91C1C",
  info: "#1D4ED8",
};

export function prescriptionV2Url(rxId: string): string {
  return `/api/prescriptions/${rxId}/pdf-v2`;
}

// ════════════════════════════════════════════════════════════════════════════
// Bundle T: AR Settings
// ════════════════════════════════════════════════════════════════════════════
export async function arSettingsGet() {
  return apiFetch("/api/ar-settings");
}
export async function arSettingsUpdate(body: any) {
  return apiFetch("/api/ar-settings", { method: "PUT", body: JSON.stringify(body) });
}

// ── Nurse Command Center APIs ────────────────────────────────
export async function hubPendingRequests(clinicId: string) {
  return apiFetch(`${HUB}/pending-requests?clinic_id=${clinicId}`);
}

/** Public site / marketing booking — no auth required */
export async function publicAppointmentRequest(payload: {
  patient_name: string;
  phone: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  branch?: string | null;
  message?: string | null;
  clinic_id: string;
  source?: string;
  service?: string | null;
}) {
  const r = await fetch("/api/public/appointment-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, source: payload.source || "public_site" }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Error ${r.status}`);
  }
  return r.json();
}
export async function hubConfirmRequest(requestId: string | number, date: string, time?: string) {
  return apiFetch(`${HUB}/confirm-request/${requestId}`, { method: "POST", body: JSON.stringify({ date, time: time || null }) });
}
export async function hubRejectRequest(requestId: string | number, reason?: string) {
  return apiFetch(`${HUB}/reject-request/${requestId}`, { method: "POST", body: JSON.stringify({ reason: reason || "Not available" }) });
}
export async function hubMoveAppointment(aptId: string, newDate: string, newTime?: string) {
  return apiFetch(`${HUB}/reschedule/${aptId}`, { method: "POST", body: JSON.stringify({ new_date: newDate, new_time: newTime || null, status: "scheduled" }) });
}
export async function hubUnschedule(aptId: string) {
  return apiFetch(`${HUB}/unschedule/${aptId}`, { method: "POST", body: JSON.stringify({}) });
}
export async function hubUpdateTime(aptId: string, newTime: string) {
  return apiFetch(`${HUB}/time/${aptId}`, { method: "POST", body: JSON.stringify({ new_time: newTime }) });
}
// ════════════════════════════════════════════════════════════════════════════
// Bundle U / V / W — API helpers (appended to lib/api.ts)
// ════════════════════════════════════════════════════════════════════════════

// --- Bundle U: Reminder Settings, Portal, Smile, Templates ----------------

export async function treatmentTemplatesList(clinicId: string, category?: string) {
  const q = category ? `&category=${encodeURIComponent(category)}` : "";
  return apiFetch(`/api/treatment-templates?clinic_id=${clinicId}${q}`);
}
// --- Bundle V: Media, Bot Config, CMS, Medicines, Lab Closure -------------

export async function mediaUpload(clinicId: string, body: {
  patient_id: string; image_data_url: string;
  tooth_number?: string; media_type?: "before" | "after" | "xray" | "general";
  caption?: string; treatment_plan_id?: string; is_shared_with_patient?: boolean;
}) {
  return apiFetch(`/api/media?clinic_id=${clinicId}`, {
    method: "POST", body: JSON.stringify({ media_type: "general", ...body }),
  });
}
export async function mediaList(patientId: string, opts: { tooth_number?: string; media_type?: string } = {}) {
  const p = new URLSearchParams();
  if (opts.tooth_number) p.set("tooth_number", opts.tooth_number);
  if (opts.media_type) p.set("media_type", opts.media_type);
  const q = p.toString() ? `?${p.toString()}` : "";
  return apiFetch(`/api/patients/${patientId}/media${q}`);
}
export async function mediaUpdate(mediaId: string, body: { caption?: string; is_shared_with_patient?: boolean }) {
  return apiFetch(`/api/media/${mediaId}`, { method: "PATCH", body: JSON.stringify(body) });
}
export async function mediaDelete(mediaId: string) {
  return apiFetch(`/api/media/${mediaId}`, { method: "DELETE" });
}

export async function botConfigGet(clinicId: string) {
  return apiFetch(`/api/settings/bot?clinic_id=${clinicId}`);
}
export async function botConfigUpdate(clinicId: string, body: any) {
  return apiFetch(`/api/settings/bot?clinic_id=${clinicId}`, { method: "PUT", body: JSON.stringify(body) });
}
export async function botEventsList(clinicId: string, limit = 50) {
  return apiFetch(`/api/bot/events?clinic_id=${clinicId}&limit=${limit}`);
}
export async function telegramTest(clinicId: string) {
  return apiFetch(`/api/bot/telegram/test?clinic_id=${clinicId}`, { method: "POST" });
}
export async function cmsPagesList(clinicId: string) {
  return apiFetch(`/api/cms/pages?clinic_id=${clinicId}`);
}
export async function cmsPageGet(clinicId: string, slug: string) {
  return apiFetch(`/api/cms/pages/${slug}?clinic_id=${clinicId}`);
}
export async function cmsSectionUpdate(sectionId: string, body: any) {
  return apiFetch(`/api/cms/sections/${sectionId}`, { method: "PATCH", body: JSON.stringify(body) });
}
export async function cmsSectionCreate(body: { page_id: string; section_type: string; content: any; display_order?: number }) {
  return apiFetch(`/api/cms/sections`, { method: "POST", body: JSON.stringify(body) });
}
export async function cmsSectionDelete(sectionId: string) {
  return apiFetch(`/api/cms/sections/${sectionId}`, { method: "DELETE" });
}
export async function cmsUploadImage(imageDataUrl: string) {
  const form = new FormData();
  form.append("image_data_url", imageDataUrl);
  const token = getToken();
  const res = await fetch(`/api/cms/upload-image`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function medicineSearch(q: string, clinicId?: string, limit = 10) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (clinicId) params.set("clinic_id", clinicId);
  return apiFetch(`/api/medicines/search?${params.toString()}`);
}
export async function medicineIncrementUsage(medicineId: string) {
  return apiFetch(`/api/medicines/${medicineId}/increment-usage`, { method: "POST" });
}

export async function labOrderClose(orderId: string, body: {
  before_image_data_url?: string; after_image_data_url?: string; closure_notes?: string;
}) {
  return apiFetch(`/api/lab/orders/${orderId}/complete`, {
    method: "POST", body: JSON.stringify({ closure_notes: body.closure_notes }),
  });
}

// --- Bundle W: Dashboard + QR -------------------------------------------

export async function dashboardSummary(clinicId: string) {
  return apiFetch(`/api/dashboard/summary?clinic_id=${clinicId}`);
}
export async function dashboardRevenue(clinicId: string) {
  return apiFetch(`/api/dashboard/revenue-pulse?clinic_id=${clinicId}`);
}
export async function dashboardFunnel(clinicId: string) {
  return apiFetch(`/api/dashboard/appt-funnel?clinic_id=${clinicId}`);
}
export async function dashboardLab(clinicId: string) {
  return apiFetch(`/api/dashboard/lab-pipeline?clinic_id=${clinicId}`);
}
export async function dashboardAging(clinicId: string) {
  return apiFetch(`/api/dashboard/outstanding-aging?clinic_id=${clinicId}`);
}
export async function dashboardFollowups(clinicId: string, limit = 20) {
  return apiFetch(`/api/dashboard/followup-alerts?clinic_id=${clinicId}&limit=${limit}`);
}
export async function dashboardNoShow(clinicId: string) {
  return apiFetch(`/api/dashboard/no-show?clinic_id=${clinicId}`);
}
export async function dashboardTopProc(clinicId: string) {
  return apiFetch(`/api/dashboard/top-procedures?clinic_id=${clinicId}`);
}
export async function dashboardBotPulse(clinicId: string) {
  return apiFetch(`/api/dashboard/bot-pulse?clinic_id=${clinicId}`);
}
export async function dashboardRemindersHealth(clinicId: string) {
  return apiFetch(`/api/dashboard/reminders-health?clinic_id=${clinicId}`);
}

export async function qrCreate(body: {
  clinic_id: string; kind: "rx" | "lab_order" | "patient_portal" | "smile" | "custom";
  target_id?: string; target_url_override?: string; base_url?: string; expires_days?: number;
}) {
  return apiFetch(`/api/qr/codes`, { method: "POST", body: JSON.stringify(body) });
}
export function qrPngUrl(qrId: string): string {
  return `/api/qr/codes/${qrId}/png`;
}
// ═══════════════════════════════════════════════════════════════════════════
// BUNDLE X — Additional API helpers
// ═══════════════════════════════════════════════════════════════════════════

// Aliases for frontend component conventions (clean names)
export const labVendorsList = (clinicId?: string) => labListVendors(false, clinicId);
export const labVendorCreate = (body: any) => labCreateVendor(body);
export const labVendorUpdate = (id: string, body: any) => labUpdateVendor(id, body);
export const labVendorDelete = (id: string) => labDeleteVendor(id);
export const labOrderCreate = (body: any) => labCreateOrder(body);
export const listSpecialists = (clinicId?: string) => specListSpecialists(clinicId);
export const createSpecialist = (body: any) => specCreateSpecialist(body);

// Update specialist (PATCH)
export async function updateSpecialist(id: string, body: any) {
  return apiFetch(`/api/specialist/list/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

// Lab work types (Bundle X extended with usage + inline-add)
export async function listLabWorkTypes(opts: { clinic_id?: string; q?: string } = {}) {
  const p = new URLSearchParams();
  if (opts.clinic_id) p.set("clinic_id", opts.clinic_id);
  if (opts.q) p.set("q", opts.q);
  return apiFetch(`/api/lab/work-types?${p.toString()}`);
}
export async function createLabWorkType(body: { name: string; clinic_id?: string; category?: string; typical_days?: number; typical_cost?: number }) {
  return apiFetch("/api/lab/work-types", { method: "POST", body: JSON.stringify(body) });
}
export async function bumpLabWorkType(name: string, clinicId?: string) {
  // Find the id by name first, then bump
  try {
    const types = await listLabWorkTypes({ clinic_id: clinicId, q: name });
    const match = (Array.isArray(types) ? types : []).find((t: any) => t.name?.toLowerCase() === name.toLowerCase());
    if (match?.id) {
      return apiFetch(`/api/lab/work-types/${match.id}/bump`, { method: "POST" });
    }
  } catch {}
}

// Specialist rate tiers (Bundle X aliases)
export const listSpecialistTiers = (opts: { specialist_id?: string; clinic_id?: string } = {}) => tiersList(opts);
export async function upsertSpecialistTier(body: {
  clinic_id: string; specialist_id: string; tier_name: string;
  treatment_key?: string; rate_amount: number; label?: string;
}) {
  return apiFetch("/api/specialist-tiers", { method: "POST", body: JSON.stringify(body) });
}

// Multi-mode payment (regression fix)
export async function collectPaymentMulti(body: {
  patient_id: string; plan_id?: string | null; clinic_id: string;
  appointment_id?: string | null;
  splits: { mode: string; amount: number; reference?: string }[];
  remarks?: string; date?: string;
}) {
  return apiFetch("/payments/collect-multi", { method: "POST", body: JSON.stringify(body) });
}

// Specialist verify (doctor-only)
export async function verifySpecialistWork(appointmentId: string, body: { earning_amount?: number; notes?: string } = {}) {
  return apiFetch(`/api/specialist/appointments/${appointmentId}/verify`, {
    method: "POST", body: JSON.stringify(body),
  });
}

export async function callConfirm(appointmentId: string, body: {
  action: string; new_date?: string; new_time?: string; notes?: string;
}) {
  return apiFetch(`/api/hub/call-confirm/${appointmentId}`, {
    method: "POST", body: JSON.stringify(body),
  });
}



export async function applyPendingAction(appointmentId: string, body: {
  new_date?: string; new_time?: string;
}) {
  return apiFetch(`/api/hub/apply-pending/${appointmentId}`, {
    method: "POST", body: JSON.stringify(body),
  });
}

export async function bookingGates(patientId: string) {
  return apiFetch(`/api/hub/booking-gates/${patientId}`);
}

// Workshop trackers
export async function workshopSpecialistWork(clinicId?: string, status?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  if (status) p.set("status", status);
  return apiFetch(`/api/workshop/specialist-work?${p.toString()}`);
}
export async function workshopLabOrders(clinicId?: string, status?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  if (status) p.set("status", status);
  return apiFetch(`/api/workshop/lab-orders?${p.toString()}`);
}
export async function workshopLabPayables(clinicId?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  return apiFetch(`/api/workshop/lab-payables?${p.toString()}`);
}
export async function workshopSpecialistPayables(clinicId?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  return apiFetch(`/api/workshop/specialist-payables?${p.toString()}`);
}

// Revenue dashboard
export async function revenueFull(clinicId: string, days = 30) {
  return apiFetch(`/api/revenue/full?clinic_id=${clinicId}&days=${days}`);
}

// Archived patients
export async function archivedPatients(clinicId?: string, q?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  if (q) p.set("q", q);
  return apiFetch(`/api/patients/archived?${p.toString()}`);
}
export async function reopenArchivedPatient(patientId: string, clinicId?: string) {
  const p = new URLSearchParams();
  if (clinicId) p.set("clinic_id", clinicId);
  const qs = p.toString();
  return apiFetch(`/api/patients/archived/${patientId}/reopen${qs ? `?${qs}` : ""}`, {
    method: "POST",
  });
}

// Module visibility
export async function getModuleVisibility(clinicId: string, role?: string) {
  const p = new URLSearchParams({ clinic_id: clinicId });
  if (role) p.set("role", role);
  return apiFetch(`/api/module-visibility?${p.toString()}`);
}
export async function updateModuleVisibility(clinicId: string, entries: { module_key: string; role: string; is_visible: boolean }[]) {
  return apiFetch("/api/module-visibility/bulk", {
    method: "POST",
    body: JSON.stringify({ clinic_id: clinicId, entries }),
  });
}
