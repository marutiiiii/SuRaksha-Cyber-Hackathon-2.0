from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Regulation
from app.schemas.schemas import RegulationResponse

router = APIRouter(prefix="/regulations", tags=["Regulations"])

@router.get("", response_model=List[RegulationResponse])
def list_regulations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    copilot_mode = current_user.get("copilot_mode", "beginner")
    if copilot_mode == "expert":
        return []
    return db.query(Regulation).order_by(Regulation.date.desc()).all()

@router.post("/trigger-scrape")
def trigger_scrape(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        from app.core.scraper import scrape_latest_regulations
        count = scrape_latest_regulations(db, limit=5)
        return {"success": True, "message": f"Successfully scraped and ingested {count} new regulations."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraper execution failed: {str(e)}")
