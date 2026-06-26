import asyncio
import sys
import os
import uuid
from datetime import date, datetime
import json

# Setup paths to import from app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException

from app.api.v1.endpoints.workflow import hub_book, BookIn, mark_status, WorkflowMarkIn
from app.api.v1.endpoints.specialist import assign_specialist, AssignIn, specialist_call_confirm, SpecialistCallIn
from app.api.v1.endpoints.lab import create_order, OrderIn, approve_order

async def main():
    async for db in get_db():
        session = db
        break
    
    # Setup mock admin staff
    staff = {"staff_id": "00000000-0000-0000-0000-000000000000", "role": "admin", "clinic_id": None}
    
    # 1. Get a clinic
    clinic = (await session.execute(text("SELECT id FROM clinics LIMIT 1"))).mappings().first()
    if not clinic:
        print("No clinics found. Please seed the DB first.")
        return
    clinic_id = clinic["id"]
    staff["clinic_id"] = str(clinic_id)
    
    print(f"Using Clinic: {clinic_id}")
    
    # 2. Create a test patient
    p_id = uuid.uuid4()
    await session.execute(text("""
        INSERT INTO patients (id, preferred_clinic_id, name, phone, age, gender) 
        VALUES (:id, :cid, :n, :p, :a, :g)
    """), {"id": p_id, "cid": clinic_id, "n": "Smoketest Patient", "p": "9999999999", "a": 30, "g": "Male"})
    await session.commit()
    print(f"Created Patient: {p_id}")
    
    try:
        # 3. Create a lab vendor and specialist
        vendor = (await session.execute(text("INSERT INTO lab_vendors (clinic_id, name, is_active) VALUES (:cid, 'Test Vendor', true) RETURNING id"), {"cid": clinic_id})).mappings().first()
        vendor_id = vendor["id"]
        
        spec = (await session.execute(text("INSERT INTO staff (clinic_id, name, role, specialization, is_active) VALUES (:cid, 'Dr. Specialist', 'specialist', 'Endodontist', true) RETURNING id"), {"cid": clinic_id})).mappings().first()
        spec_id = spec["id"]
        await session.commit()
        
        # 4. Create a lab order for this patient
        print("Creating a pending lab order...")
        try:
            lo_res = await create_order(OrderIn(
                patient_id=p_id, vendor_id=vendor_id, work_type_id=None, item_name="Crown",
                status="pending", expected_date=date.today(), cost=1000
            ), db=session, staff=staff)
            lo_id = lo_res["id"]
            print(f"Created Lab Order: {lo_id}")
        except Exception as e:
            print(f"Failed to create lab order: {e}")
            raise e
        
        # 5. Try to book a near-term appointment (should fail due to lab order)
        print("Attempting to book a near-term appointment with a pending lab order...")
        try:
            await hub_book(BookIn(patient_id=p_id, clinic_id=clinic_id, date=date.today()), db=session, staff=staff)
            print("❌ FAILED: Booking succeeded when it should have failed!")
        except HTTPException as e:
            if e.status_code == 409 and "pending lab order" in e.detail:
                print("✅ SUCCESS: Booking correctly blocked by pending lab order.")
            else:
                print(f"❌ FAILED: Unexpected HTTPException: {e.detail}")
        
        # 6. Mark lab order as approved/delivered
        print("Approving the lab order...")
        await approve_order(lo_id, db=session, staff=staff)
        print("Lab order approved.")
        
        # 7. Try to book near-term appointment again (should succeed)
        print("Attempting to book a near-term appointment again...")
        apt_res = await hub_book(BookIn(patient_id=p_id, clinic_id=clinic_id, date=date.today()), db=session, staff=staff)
        apt_id = apt_res["appointment_id"]
        print(f"✅ SUCCESS: Booked appointment {apt_id}")
        
        # 8. Assign specialist
        print("Assigning specialist to appointment...")
        await assign_specialist(apt_id, AssignIn(specialist_id=spec_id, notes="Test notes"), db=session, staff=staff)
        print("Specialist assigned.")
        
        # 9. Try to mark arrived (should fail because specialist not confirmed)
        print("Attempting to mark appointment as arrived...")
        try:
            await mark_status(apt_id, WorkflowMarkIn(status="arrived"), db=session, staff=staff)
            print("❌ FAILED: Mark arrived succeeded when it should have failed!")
        except HTTPException as e:
            if e.status_code == 409 and "Specialist is assigned but not yet called" in e.detail:
                print("✅ SUCCESS: Mark arrived correctly blocked by unconfirmed specialist.")
            else:
                print(f"❌ FAILED: Unexpected HTTPException: {e.detail}")
        
        # 10. Confirm specialist
        print("Confirming specialist call...")
        await specialist_call_confirm(apt_id, SpecialistCallIn(action="confirmed"), db=session, staff=staff)
        print("Specialist confirmed.")
        
        # 11. Mark arrived again (should succeed)
        print("Attempting to mark appointment as arrived again...")
        await mark_status(apt_id, WorkflowMarkIn(status="arrived"), db=session, staff=staff)
        print("✅ SUCCESS: Appointment marked as arrived.")

        print("🎉 ALL SMOKETESTS PASSED!")
        
    finally:
        # Cleanup
        await session.execute(text("DELETE FROM appointments WHERE patient_id=:pid"), {"pid": p_id})
        await session.execute(text("DELETE FROM lab_orders WHERE patient_id=:pid"), {"pid": p_id})
        await session.execute(text("DELETE FROM patients WHERE id=:pid"), {"pid": p_id})
        await session.execute(text("DELETE FROM staff WHERE id=:sid"), {"sid": spec_id})
        await session.execute(text("DELETE FROM lab_vendors WHERE id=:vid"), {"vid": vendor_id})
        await session.commit()

if __name__ == "__main__":
    asyncio.run(main())
