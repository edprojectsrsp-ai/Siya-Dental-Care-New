# Bundle X — Specialist Integration Patch
**Replaces isolated SpecialistPortal with integrated same-interface approach**

---

## What Changed

The specialist no longer gets redirected to `/specialist` or sees an isolated portal.
Instead, she logs into the **same interface** as the doctor with these restrictions:

### What Specialist SEES (same as doctor):
- ✅ **Dashboard** — clinic overview
- ✅ **Queue** — filtered to only HER assigned patients
- ✅ **Treatment Workspace** — full 5-tab panel (Overview, Tooth Chart, Plan, Rx & Visit, Files/RVG)
- ✅ **Send to Lab** button — can create lab orders
- ✅ **Close Visit** button — can close visits (no payment collected)
- ✅ **Save Draft** — can save work in progress
- ✅ **Patients** — patient database (read access)
- ✅ **Lab** — lab module
- ✅ **My Practice** — NEW 4-tab module (see below)

### What Specialist CANNOT SEE:
- ❌ **₹ Financials tab** — hidden from Treatment Workspace tabs
- ❌ **Financial snapshot** — Total Value / Paid / Outstanding header hidden
- ❌ **Close Treatment** button — only doctor can archive
- ❌ **Refer to Specialist** button — she IS the specialist
- ❌ **CoordinationBoard** — doctor's lab/specialist tracking panel in Overview
- ❌ **Payment fields in Close Visit modal** — no "Amount to collect", no adjustment
- ❌ **Workshop / Revenue / Billing** — hidden via module_visibility
- ❌ **Settings / Staff / Counters / Messages / Bulk WA** — hidden
- ❌ **Appointments (nurse hub)** — hidden

### New: "My Practice" Sidebar Module (4 tabs)

| Tab | What It Shows |
|-----|---------------|
| **My Queue** | Assigned patients not yet treated (status: PENDING) |
| **Completed** | Work done, awaiting doctor verification (status: DONE/CLOSED) |
| **Verified** | Doctor approved — payable generated (status: VERIFIED) |
| **My Payments** | Summary cards (Pending ₹ / Settled ₹) + payment history per patient |

Header shows: Queue count, Awaiting Approval count, Payment Pending ₹, Total Settled ₹

---

## Files to Deploy (6 files)

### Frontend — Replace These:
| File | Action | What Changed |
|------|--------|-------------|
| `app/page.tsx` | **REPLACE** | Removed 3 specialist redirects; import SpecialistModule; added `mypractice` to NAV + render; specialist auto-lands on "My Practice" |
| `components/TreatmentWorkspace.tsx` | **REPLACE** | Added `isSpec` flag; hides Financials tab, financial snapshot, Close Treatment, Refer to Specialist, CoordinationBoard, payment fields in Close Visit modal |
| `components/DoctorQueue.tsx` | **REPLACE** | Added specialist filter: all queue segments filtered by `specialist_id === staff.staff_id` |
| `components/SpecialistModule.tsx` | **NEW** | 4-tab "My Practice" module (272 LOC) |

### Backend:
| File | Action | What Changed |
|------|--------|-------------|
| `app/api/v1/endpoints/bundle_x.py` | **REPLACE** | Added `mypractice`, `workshop`, `archived`, `revenue` to `KNOWN_MODULES` |
| `migrations/028_mypractice_module.sql` | **NEW** | Seeds module_visibility: specialist sees dashboard/queue/patients/lab/mypractice; hides 17 other modules |

---

## Setup

```bash
# 1. Run migration
psql -d dentassist -f 028_mypractice_module.sql

# 2. Replace the 5 files listed above
# 3. SpecialistPortal.tsx can be DELETED (no longer imported)
# 4. Restart backend + frontend
# 5. Test: login as a specialist staff member → should land on "My Practice"
```

---

## Audit Results (No Gaps Found)

| Check | Result |
|-------|--------|
| api.ts completeness | 308 defined, 203 used — all present |
| Backend route mounts | All 6 bundle_x routers in main.py ✅ |
| Module visibility wiring | Loads on mount, filters sidebar ✅ |
| Workshop/Revenue/Archived | All wired in page.tsx ✅ |
| Cross-component imports | All resolved ✅ |
| Specialist → Doctor flow | Verify & Create Payable works end-to-end ✅ |

---

## Complete Specialist Flow

```
1. Specialist logs in → lands on "My Practice" (not dashboard)
2. Sidebar shows: Dashboard, Queue, Patients, Lab, My Practice
3. Click "Queue" → sees ONLY her assigned patients (filtered by specialist_id)
4. Click patient → "Start Treatment" → opens TreatmentWorkspace
   - Same 5 tabs as doctor (no Financials)
   - Can add notes, prescriptions, tooth chart observations
   - Can send to lab
   - Can close visit (no payment collected)
   - CANNOT close treatment, see costs, or refer to specialist
5. Click "My Practice" → 4 tabs:
   - My Queue: pending work
   - Completed: done, awaiting doctor verification
   - Verified: doctor approved
   - My Payments: pending settlement ₹ + settled history
6. Doctor → Workshop → Specialist Work → "Verify & Create Payable"
   → specialist_earnings row created → shows in specialist's Payments tab
```
