#!/usr/bin/env python3
"""Smoke-test major API endpoints used by UI buttons."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx

BASE = "http://127.0.0.1:8000"
CLINIC = "a1111111-1111-1111-1111-111111111111"


async def main():
    results = []
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{BASE}/api/v1/auth/login", json={"phone": "+919876500001", "pin": "1234", "clinic_id": CLINIC})
        if r.status_code != 200:
            print(f"LOGIN FAILED {r.status_code}: {r.text[:200]}")
            return 1
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        endpoints = [
            ("GET", f"/api/v1/dashboard/stats?clinic_id={CLINIC}"),
            ("GET", f"/api/v1/appointments/today?clinic_id={CLINIC}"),
            ("GET", f"/api/v1/appointments/pending?clinic_id={CLINIC}"),
            ("GET", f"/api/v1/catalog/medicines"),
            ("GET", f"/api/v1/catalog/procedures"),
            ("GET", f"/api/v1/payments/outstanding?clinic_id={CLINIC}"),
            ("GET", f"/api/hub/today?clinic_id={CLINIC}"),
            ("GET", f"/api/hub/queue?clinic_id={CLINIC}"),
            ("GET", f"/api/hub/appointments-range?clinic_id={CLINIC}&from={asyncio.get_event_loop().time():.0f}".replace(str(int(asyncio.get_event_loop().time())), "2026-06-22")),
            ("GET", f"/api/hub/call-diary?clinic_id={CLINIC}"),
            ("GET", f"/api/hub/pending-requests?clinic_id={CLINIC}"),
            ("GET", f"/api/hub/bulk-whatsapp?clinic_id={CLINIC}"),
            ("GET", f"/api/hub/doctor-day-list?clinic_id={CLINIC}"),
            ("GET", f"/api/patients-db/list?clinic_id={CLINIC}&limit=10"),
            ("GET", f"/api/dashboard/summary?clinic_id={CLINIC}"),
            ("GET", f"/api/dashboard/revenue-pulse?clinic_id={CLINIC}"),
            ("GET", f"/api/revenue/full?clinic_id={CLINIC}"),
            ("GET", f"/api/lab/orders?clinic_id={CLINIC}"),
            ("GET", f"/api/lab/vendors?clinic_id={CLINIC}"),
            ("GET", f"/api/specialist/list?clinic_id={CLINIC}"),
            ("GET", f"/api/admin/staff"),
            ("GET", f"/api/settings/clinic/{CLINIC}"),
            ("GET", f"/api/msg/log?clinic_id={CLINIC}&limit=5"),
            ("GET", f"/api/module-visibility?clinic_id={CLINIC}"),
            ("GET", f"/api/reschedule-requests?clinic_id={CLINIC}"),
            ("GET", f"/api/counters?clinic_id={CLINIC}"),
            ("GET", f"/api/workshop/specialist-work?clinic_id={CLINIC}"),
            ("GET", f"/api/workshop/lab-payables?clinic_id={CLINIC}"),
            ("GET", f"/api/patients/archived?clinic_id={CLINIC}"),
            ("GET", f"/api/consult/queue?clinic_id={CLINIC}"),
            ("GET", f"/api/admin/gallery"),
            ("GET", f"/api/admin/website-mgr/clinics"),
            ("GET", f"/api/site-2026/content"),
            ("POST", f"/api/jobs/reminders/tick"),
        ]

        # fix date param
        endpoints[8] = ("GET", f"/api/hub/appointments-range?clinic_id={CLINIC}&from=2026-06-15&to=2026-06-29")

        for method, path in endpoints:
            try:
                if method == "GET":
                    r = await c.get(f"{BASE}{path}", headers=h)
                else:
                    r = await c.post(f"{BASE}{path}", headers=h)
                ok = r.status_code < 400
                results.append((ok, r.status_code, path))
                mark = "✅" if ok else "❌"
                detail = ""
                if not ok:
                    detail = r.text[:120].replace("\n", " ")
                print(f"{mark} {r.status_code} {method} {path} {detail}")
            except Exception as e:
                results.append((False, 0, path))
                print(f"❌ ERR {method} {path} — {e}")

    failed = [r for r in results if not r[0]]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))