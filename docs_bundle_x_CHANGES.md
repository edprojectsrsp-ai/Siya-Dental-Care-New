# Bundle X — Complete Delivery (Pass 1 + 2 + 3)
**10,423 LOC · 24 files · Migrations 026 + 027**
**Tested against live DB backup (47 patients, 53 appointments, 2 clinics)**

---

## What Was Broken (Doctor's Testing Observations)

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Lab vendor CRUD missing — can't create vendors, can't test lab | No UI existed; backend at `/api/lab/vendors` was there but unused | `SettingsLabsTab.tsx` + Settings → Labs tab |
| 2 | Multi-mode payment broken — single mode only, error on submit | `PaymentModal` had single `useState("cash")` — regression from pre-Bundle-T | Rewrote `PaymentModal` with splits array + new `POST /payments/collect-multi` |
| 3 | Confirm WA/website request → error | `workflow.py:707` used `source='online'` violating `appointments_source_check` constraint; `requested_time` NOT NULL but body passed NULL | `_normalize_time()` + source mapping (public_site→phone, whatsapp→whatsapp, etc.) |
| 4 | No one-click assignment in Treatment Workspace | Doctor had to navigate away to Lab or Specialist module | Two new buttons: 🧪 Send to Lab + 👨‍⚕️ Refer to Specialist |
| 5 | No specialist or lab outstanding visibility | No tracking dashboards existed | Workshop Trackers (4 tabs) + Revenue Dashboard |
| 6 | Specialist rates hardcoded (2-3 only) | `specialist_rate_tiers` had no inline-add capability | `DropdownWithInlineAdd` + tier upsert with usage tracking |
| 7 | Lab work type dropdown static | `lab_work_types` had no inline-add | Same `DropdownWithInlineAdd` pattern |
| 8 | Booking constraints view broken | `patient_booking_constraints_v` referenced stale lab statuses (`placed`, `in_progress`) | Rebuilt view with correct statuses + specialist gate column |
| 9 | No specialist isolated portal | Specialist had no limited-access login | `SpecialistPortal.tsx` — no cost visible anywhere |
| 10 | No call & confirm workflow | Nurse couldn't confirm/refuse/reschedule from a modal | `CallConfirmModal.tsx` with 4 actions |
| 11 | No module visibility control | Everyone saw everything | `SettingsModuleVisibility.tsx` + `module_visibility` table |
| 12 | No specialist CRUD in Settings | Doctor couldn't add specialists from UI | `SettingsSpecialistsTab.tsx` |

---

## Pre-Test Setup

```bash
# 1. Run migrations IN ORDER
psql -d dentassist -f 026_bundle_x_pass1.sql
psql -d dentassist -f 027_bundle_x_pass2_3.sql

# 2. Register new backend routers in main.py (add these imports + mounts):
from app.api.v1.endpoints.bundle_x import (
    modvis_router, verify_router, callconfirm_router,
    workshop_router, revenue_router, archived_router,
)
app.include_router(modvis_router, prefix="/api")
app.include_router(verify_router, prefix="/api/specialist")
app.include_router(callconfirm_router, prefix="/api/hub")
app.include_router(workshop_router, prefix="/api/workshop")
app.include_router(revenue_router, prefix="/api/revenue")
app.include_router(archived_router, prefix="/api/patients")

# 3. Copy all changed files to their respective paths
# 4. Restart backend + frontend
# 5. Test patient '+919999100001' has crown@16 + RCT@36 plan items (seeded)
```

---

## File Inventory (24 files)

### Backend — Migrations (2 files)
| File | Purpose |
|------|---------|
| `migrations/026_bundle_x_pass1.sql` | Schema: lab_work_types inline-add cols, specialist_rate_tiers usage, appointments specialist_confirmation_status, appointment_history table, v_lab_payables view, fixed patient_booking_constraints_v, seeds (vendors, work types, endo tiers, test patient) |
| `migrations/027_bundle_x_pass2_3.sql` | Schema: module_visibility table + seeds, pending_action blink cols, v_specialist_payables view, v_workshop_specialist_work view |

### Backend — Python (7 files)
| File | What Changed |
|------|-------------|
| `app/schemas/schemas.py` | Added `PaymentSplit`, `PaymentCollectMulti` models |
| `app/api/v1/endpoints/payments.py` | Added `POST /payments/collect-multi` (N splits → N transactions) |
| `app/api/v1/endpoints/workflow.py` | Fixed `hub_confirm_request`: source mapping, `_normalize_time()`, clinic_id fallback, history logging |
| `app/api/v1/endpoints/lab.py` | Replaced `GET /lab/work-types` with usage-sorted + clinic filter; added `POST /lab/work-types` (upsert+usage), `POST /lab/work-types/{id}/bump` |
| `app/api/v1/endpoints/bundle_r.py` | Extended `TierIn` with `label`; tiers sorted by usage_count DESC; upsert bumps usage+label; added `POST /specialist-tiers/{id}/bump` |
| `app/api/v1/endpoints/specialist.py` | `assign_specialist` now sets `specialist_confirmation_status='pending_call'` |
| `app/api/v1/endpoints/bundle_x.py` | **NEW** — module visibility CRUD, specialist verify, call & confirm (4 actions), apply pending action, specialist call confirm, booking gates, workshop trackers (4 views), revenue dashboard, archived patients |

### Frontend — Components (13 files)
| File | Status | Purpose |
|------|--------|---------|
| `DropdownWithInlineAdd.tsx` | **NEW** | Reusable: type-ahead, usage badges, inline "+ Add new" row |
| `SettingsLabsTab.tsx` | **NEW** | Lab vendor CRUD (name, phone, WA, address, GST, specialities, preferred flag) |
| `SettingsSpecialistsTab.tsx` | **NEW** | Specialist CRUD (name, specialization, phone, WA, fee, external flag) |
| `SettingsModuleVisibility.tsx` | **NEW** | Module × Role toggle matrix (18 modules × 4 roles) |
| `SendToLabModal.tsx` | **NEW** | One-click lab order from Treatment Workspace (vendor, work type, tooth chart, shade, cost, expected date) |
| `SendToSpecialistModal.tsx` | **NEW** | One-click referral (specialist, rate tier with inline-add, notes → WA link) |
| `CallConfirmModal.tsx` | **NEW** | 4-action modal (confirm/refused/change date/change time) + specialist variant |
| `SpecialistPortal.tsx` | **NEW** | Isolated specialist view: own queue, limited notes, mark done, NO COST |
| `WorkshopTrackers.tsx` | **NEW** | 4-tab tracker: specialist work, lab orders, lab payables, specialist payables |
| `ArchivedPatients.tsx` | **NEW** | Patients with completed treatment + full payment |
| `RevenueDashboard.tsx` | **NEW** | 30-day bar chart + summary cards (collected, patient/spec/lab outstanding, net) |
| `Modals.tsx` | **EDIT** | PaymentModal rewritten: multi-mode splits, per-split references, auto-sum |
| `SettingsHub.tsx` | **EDIT** | 3 new tabs: Labs, Specialists, Module Access |
| `TreatmentWorkspace.tsx` | **EDIT** | 2 new buttons (Send to Lab, Refer to Specialist) + modal state + renders |

### Frontend — Lib (1 file)
| File | What Changed |
|------|-------------|
| `lib/api.ts` | ~30 new helpers: collectPaymentMulti, listLabWorkTypes, createLabWorkType, bumpLabWorkType, labVendor* aliases, updateSpecialist, upsertSpecialistTier, verifySpecialistWork, callConfirm, specialistCallConfirm, applyPendingAction, bookingGates, workshop* (4), revenueFull, archivedPatients, getModuleVisibility, updateModuleVisibility |

---

## Integration Patches for page.tsx

Add these imports and mount points to `frontend/app/page.tsx`:

```tsx
// Add to imports:
import SpecialistPortal from "@/components/SpecialistPortal";
import WorkshopTrackers from "@/components/WorkshopTrackers";
import ArchivedPatients from "@/components/ArchivedPatients";
import RevenueDashboard from "@/components/RevenueDashboard";

// In the NAV array, add after "specialists":
{id:"workshop",icon:"🏗️",label:sanitize("Workshop")},
{id:"archived",icon:"📦",label:sanitize("Archived")},
{id:"revenue",icon:"📈",label:sanitize("Revenue")},

// In the main content render section, add:
{!loading&&sec==="workshop"&&<WorkshopTrackers clinicId={staff?.clinic_id} staff={staff} accent={accentColor} show={show} />}
{!loading&&sec==="archived"&&<ArchivedPatients clinicId={staff?.clinic_id} accent={accentColor} />}
{!loading&&sec==="revenue"&&<RevenueDashboard clinicId={staff?.clinic_id} accent={accentColor}
  onDrillDown={(target) => setSec("workshop")} />}

// At the TOP of the main content area (before the sidebar grid),
// add specialist portal redirect:
if (staff?.role === 'specialist') return <SpecialistPortal staff={staff} show={show} />;

// Module visibility filtering (in the sidebar render):
// After NAV definition, filter based on role:
// const visibleNav = NAV.filter(n => {
//   const vis = moduleVisibility?.[staff?.role]?.[n.id];
//   return vis !== false;
// });
// Then use visibleNav instead of NAV in the sidebar .map()
```

---

## Specialist Workflow (Complete Flow)

```
Doctor → Treatment Workspace → "Refer to Specialist" button
  → picks specialist + rate tier → POSTs to /specialist/appointments/{id}/assign
  → sets specialist_confirmation_status = 'pending_call'
  → WhatsApp fires to specialist → specialist is LINKED

Specialist → Logs in → sees SpecialistPortal (no cost)
  → sees only HER patients → clicks patient → adds notes → "Mark as Done"
  → specialist_session_status = 'closed'

Doctor → Workshop → Specialist Work tab
  → sees "done" status → clicks "Verify & Create Payable"
  → POSTs to /specialist/appointments/{id}/verify
  → sets specialist_session_status = 'verified'
  → auto-creates specialist_earnings row (payable)

Nurse → Appointment Hub → tries to book follow-up
  → Booking gate checks: lab pending? specialist pending_call?
  → If specialist referral exists: must first [Call Specialist] [WhatsApp Specialist]
  → After calling → marks confirmed/declined
  → Only confirmed → appointment finalized
  → "Send to Doctor's Queue" button only visible AFTER call confirmed
```

---

## Seed Data Created (Migration 026)

- **2 lab vendors per clinic**: Bharat Dental Lab (preferred), Pearl Ceramic Works
- **11 lab work types**: PFM Crown, Zirconia Crown, Bridge (3-unit PFM/Zr), RPD, CPD, Veneer, Inlay/Onlay, Implant abutment, Night guard, Bleaching tray
- **5 endo rate tiers** (if endodontist exists): Anterior ₹3K, Premolar ₹4K, Molar ₹5K, Retreatment ₹6.5K, Curved molar ₹7.5K
- **1 test patient**: "Test — Bundle X (Crown+RCT)" phone +919999100001, with PFM Crown@16 + RCT@36 plan items
- **Module visibility defaults**: doctor+admin see all; receptionist sees dashboard/appointments/patients/queue/billing/lab/messages; specialist sees dashboard+queue only
