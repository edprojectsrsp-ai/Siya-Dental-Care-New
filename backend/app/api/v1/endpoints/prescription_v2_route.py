"""
backend/app/api/v1/endpoints/prescription_v2_route.py — Bundle S

GET /api/prescriptions/{rx_id}/pdf-v2  → professional A4/A5 PDF
GET /api/prescriptions/{rx_id}/preview → JSON preview (for in-app render)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_staff
from app.services.prescription_v2 import generate_rx_pdf

rx_v2_router = APIRouter(prefix="/prescriptions", tags=["Prescription PDF v2"])


@rx_v2_router.get("/{rx_id}/pdf-v2")
async def rx_pdf_v2(rx_id: UUID, db: AsyncSession = Depends(get_db),
                    staff=Depends(get_current_staff)):
    try:
        pdf_bytes = await generate_rx_pdf(db, str(rx_id))
    except ValueError as e:
        raise HTTPException(404, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="prescription_{str(rx_id)[:8]}.pdf"',
        },
    )
