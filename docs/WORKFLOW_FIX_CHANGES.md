# Siya Dental Care — Workflow Integration Fix
**Audit-driven fixes to close gaps between core workflow doc and running code**

---

## Gap Analysis Results

### FIXED IN THIS DELIVERY:

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **Close Treatment has NO gates** — doctor could archive a case without specialist work verified or lab orders completed | 🔴 CRITICAL | Added Gate A (specialist verified) + Gate B (lab completed) to `workspace.py` close_visit AND `workflow.py` close_session. Returns 409 with specific message. |
| 2 | **Lab confirmation NOT inline** — nurse had to leave appointment card, go to Lab module, find order, mark received | 🔴 CRITICAL | Inline lab order cards on appointment card: each pending order shows work_type, vendor, teeth, expected date + **✓ Received** button + date picker to update expected date. |
| 3 | **Hub query missing pending lab order details** — appointment card only had count, no order IDs for inline confirmation | 🟡 HIGH | Added `plab_pending` lateral join with `json_agg` returning `[{order_id, work_type, vendor_name, expected_date, status, teeth}]` |
| 4 | **Locked queue hint too vague** — just said "Clear all red buttons" | 🟡 MEDIUM | Specific hints: "Call & confirm patient first" / "Confirm specialist availability first" / "Confirm all lab orders received above" |
| 5 | **Booking request notification bar not blinking** — workflow doc requires highlighted/blinking | 🟢 LOW | Added `blinkNotifBar` keyframe animation |

### ALREADY WORKING (confirmed via audit):

| Workflow Point | Status |
|---|---|
| Booking gates (patient confirmed + specialist confirmed + lab received) | ✅ Backend enforces 3 gates on mark_arrived (409 with specific message) |
| Frontend gate buttons (red/green) | ✅ Call & Confirm, Specialist Confirm, Lab Confirm — all wired |
| WhatsApp auto-send hooks | ✅ All 7 hooks wired: appointment created/confirmed/cancelled, arrival, visit close, lab order, specialist assignment |
| Specialist in BOTH queues | ✅ Patient pushed to specialist notification on arrival |
| Module visibility per role | ✅ Loads on mount, filters sidebar dynamically |
| Blinking cards for pending actions | ✅ 3 keyframe animations: pending action, specialist, payment |
| Pending booking request notification | ✅ Orange bar with website/WhatsApp counts + confirm/reject panel |
| Specialist integrated view | ✅ Same interface, filtered queue, restricted buttons (previous delivery) |
| Revenue dashboard (summary) | ✅ Total collected, patient outstanding, specialist due, lab due, net position |
| Call & confirm workflow | ✅ 4-action modal (confirm/refused/change_date/change_time) |
| Appointment drag-drop between days | ✅ Working |

---

## Files to Deploy (4 files)

| File | Action | Changes |
|------|--------|---------|
| `backend/app/api/v1/endpoints/workspace.py` | **REPLACE** | Added specialist/lab gates to `close_visit` — blocks Close Treatment if specialist not verified or lab not completed |
| `backend/app/api/v1/endpoints/workflow.py` | **REPLACE** | Added `plab_pending` lateral join (pending lab order details array) to hub query + same specialist/lab gates to `close_session` |
| `frontend/components/AppointmentHub.tsx` | **REPLACE** | Inline lab confirmation cards per pending order (✓ Received + date picker) + specific lock hints + blinking notification bar |
| `docs/WORKFLOW_FIX_CHANGES.md` | **NEW** | This file |

---

## Setup

```bash
# Just replace the 3 code files — no migration needed
# Restart backend + frontend
```

---

## How the Fixed Flow Works

### Nurse Appointment Card — Lab Gate (BEFORE vs AFTER):

**BEFORE:** Red button "Lab Order — Confirm Received" → clicks → navigates to Lab module → find order → mark received → come back

**AFTER:**
```
┌─ 🧪 PFM Crown (16)                              ─┐
│  Bharat Dental Lab · Expected: 22 Jun            │
│  [📅 date picker]  [✓ Received]                  │
├─ 🧪 Zirconia Crown (36)                          ─┤
│  Pearl Ceramic · Expected: TBD                    │
│  [📅 date picker]  [✓ Received]                  │
└──────────────────────────────────────────────────────┘
```

### Close Treatment Gates (NEW):

```
Doctor clicks "Close Treatment" →
  Gate A: Any specialist work not verified?
    → YES: 409 "Cannot close: 1 specialist session(s) not yet verified.
                Go to Workshop → Specialist Work → Verify first."
    → NO: continue
  Gate B: Any lab orders still pending/sent?
    → YES: 409 "Cannot close: 2 lab order(s) still pending.
                Confirm lab orders are received/completed first."
    → NO: Archive case ✅
```

---

## End-to-End Flow (Complete)

```
 1. Appointment booked (Website/WhatsApp/Manual)
    → If website/WA: blinking orange bar "N New Booking Requests"
    → Nurse clicks "Review Now" → confirms/rejects with date

 2. Appointment appears in day view
    → Gate 1: 📞 Call & Confirm (red → green)
    → Gate 2: 👨‍⚕️ Confirm Specialist (if assigned, red → green)
    → Gate 3: 🧪 Lab Orders inline (each order: red → confirm received → green)
    → All green: ✅ "Move to Queue" unlocks

 3. Patient enters Doctor Queue + Specialist Queue (if assigned)
    → Doctor clicks "Start Treatment" → TreatmentWorkspace
    → Specialist clicks "Start Treatment" → same workspace, restricted

 4. Specialist completes work → "Mark My Job Completed"
    → Status: done → awaiting doctor verification

 5. Doctor verifies specialist work (Workshop → Specialist Work → Verify)
    → Creates payable in specialist_earnings

 6. Doctor closes visit → "Close Visit" (follow-up scheduled)
    OR closes treatment → "Close Treatment" (GATES ENFORCED)
    → Gate A: specialist verified ✅
    → Gate B: lab orders completed ✅
    → Case archived, payments become due

 7. Revenue dashboard updates: specialist due, lab due, net position
```
