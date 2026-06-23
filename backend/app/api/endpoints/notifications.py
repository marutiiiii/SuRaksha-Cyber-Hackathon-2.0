from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Notification
from app.schemas.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.copilot_mode == copilot_mode
    ).order_by(Notification.created_at.desc()).all()
    
    return notifications

@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    n.is_read = True
    db.commit()
    db.refresh(n)
    return {"success": True, "message": "Notification marked as read"}
