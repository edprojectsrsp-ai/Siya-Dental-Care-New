#!/usr/bin/env python3
"""Set staff PINs and test API"""
import sys, os, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def set_pin(phone, pin):
    from app.core.security import hash_pin
    from app.core.database import AsyncSessionLocal
    from app.models.models import Staff
    from sqlalchemy import select
    hashed = hash_pin(pin)
    async with AsyncSessionLocal() as session:
        staff = (await session.execute(select(Staff).where(Staff.phone == phone))).scalar_one_or_none()
        if not staff:
            print(f"❌ No staff with phone: {phone}")
            all_staff = (await session.execute(select(Staff))).scalars().all()
            for s in all_staff: print(f"  {s.name} ({s.role}) — {s.phone}")
            return
        staff.pin_hash = hashed
        await session.commit()
        print(f"✅ PIN set for {staff.name} ({staff.role}) — phone: {phone}, PIN: {pin}")

async def test_api():
    import httpx
    base = "http://localhost:8000"
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{base}/health"); print(f"{'✅' if r.status_code==200 else '❌'} /health — {r.status_code}")
        r = await c.get(f"{base}/api/v1/clinics"); clinics = r.json() if r.status_code==200 else []
        print(f"✅ /clinics — {len(clinics)} clinics")
        if clinics:
            cid = clinics[0]["id"]
            r = await c.post(f"{base}/api/v1/auth/login", json={"phone": "+919876500001", "pin": "1234", "clinic_id": cid})
            if r.status_code == 200:
                token = r.json()["access_token"]; h = {"Authorization": f"Bearer {token}"}
                print(f"✅ Login as {r.json()['name']}")
                for path in [f"/api/v1/dashboard/stats?clinic_id={cid}", f"/api/v1/appointments/today?clinic_id={cid}", "/api/v1/catalog/medicines", "/api/v1/catalog/procedures"]:
                    r2 = await c.get(f"{base}{path}", headers=h); print(f"  ✅ GET {path} — {r2.status_code}")
            else: print(f"⚠️ Login failed — run: python scripts/setup.py set-pin +919876500001 1234")
    print("\n🎉 Done! Open http://localhost:8000/docs")

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage:\n  python scripts/setup.py set-pin +919876500001 1234\n  python scripts/setup.py test-api"); sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "set-pin" and len(sys.argv) >= 4: asyncio.run(set_pin(sys.argv[2], sys.argv[3]))
    elif cmd == "test-api": asyncio.run(test_api())
    else: print(f"Unknown: {cmd}")
