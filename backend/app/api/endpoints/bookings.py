from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import DemoBooking
from pydantic import BaseModel

router = APIRouter(prefix="/bookings", tags=["Bookings"])

class DemoBookingCreate(BaseModel):
    fullName: str
    email: str
    institution: str
    jobTitle: str
    message: str | None = None

class MessageResponse(BaseModel):
    success: bool
    message: str

@router.post("/demo", response_model=MessageResponse)
def book_demo(payload: DemoBookingCreate, db: Session = Depends(get_db)):
    try:
        new_booking = DemoBooking(
            full_name=payload.fullName,
            email=payload.email,
            institution=payload.institution,
            job_title=payload.jobTitle,
            message=payload.message
        )
        db.add(new_booking)
        db.commit()
        return MessageResponse(success=True, message="Demo booking request received successfully.")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record booking request: {str(e)}"
        )
