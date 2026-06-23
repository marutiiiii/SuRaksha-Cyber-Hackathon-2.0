import os
import uuid
import logging
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from fpdf import FPDF
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Document, Map, Comparison, Report
from app.schemas.schemas import ReportRequest, ReportResponse
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

def clean_pdf_text(text) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    if not text:
        return ""
    # Map common non-latin-1 or unicode characters to their latin-1 equivalents
    replacements = {
        "\u2014": "-", # em dash
        "\u2013": "-", # en dash
        "\u201c": '"', # smart left double quote
        "\u201d": '"', # smart right double quote
        "\u2018": "'", # smart left single quote
        "\u2019": "'", # smart right single quote
        "\u2022": "*", # bullet point
        "\u20ac": "EUR", # euro symbol
        "\u2122": "TM", # trademark symbol
        "\u00ae": "(R)", # registered trademark
        "\u00a9": "(C)", # copyright
        "\u201f": '"',
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
    
    # Try to encode as latin-1, replacing any characters we missed with '?'
    return text.encode("latin-1", errors="replace").decode("latin-1")

router = APIRouter(prefix="/reports", tags=["Compliance Reports"])

REPORTS_DIR = os.path.join(settings.STORAGE_PATH, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.post("/generate", response_model=ReportResponse)
def generate_report(
    schema: ReportRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = current_user.get("id")
        report_type = schema.type
        copilot_mode = current_user.get("copilot_mode", "beginner")
        
        logger.info(f"Generating PDF report '{report_type}' for user {user_id} in {copilot_mode} mode")
        
        # 1. Generate populated markdown text and PDF filename
        from app.core.report_renderer import populate_report_template, MarkdownPDF
        markdown_text, filename, report_uuid = populate_report_template(db, user_id, report_type, copilot_mode)
        
        file_path = os.path.join(REPORTS_DIR, filename)
        
        # 2. Render PDF using MarkdownPDF
        pdf = MarkdownPDF()
        pdf.render_markdown(markdown_text)
        pdf.output(file_path)
        
        # Save Report entry in DB
        db_report = Report(
            id=report_uuid,
            user_id=user_id,
            type=report_type,
            title=f"{report_type.capitalize()} Compliance Report",
            file_path=f"/storage/reports/{filename}",
            copilot_mode=copilot_mode
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        return {
            "report": {
                "id": str(db_report.id),
                "type": db_report.type,
                "title": db_report.title,
                "file_path": db_report.file_path,
                "created_at": db_report.created_at.isoformat()
            },
            "signed_url": db_report.file_path
        }
    except Exception as e:
        logger.error(f"Failed to generate report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )

@router.get("/preview/{report_type}")
def preview_report(
    report_type: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = current_user.get("id")
        copilot_mode = current_user.get("copilot_mode", "beginner")
        
        logger.info(f"Previewing markdown report '{report_type}' for user {user_id} in {copilot_mode} mode")
        
        from app.core.report_renderer import populate_report_template
        markdown_text, _, _ = populate_report_template(db, user_id, report_type, copilot_mode)
        
        return {"markdown": markdown_text}
    except Exception as e:
        logger.error(f"Failed to preview report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview report: {str(e)}"
        )

@router.get("/download/{filename}")
def download_report(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Security: sanitize filename to avoid path traversal
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(REPORTS_DIR, safe_filename)
        
        logger.info(f"Downloading report file: {file_path}")
        if not os.path.exists(file_path):
            logger.error(f"Report file not found: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report file not found"
            )
        return FileResponse(
            path=file_path,
            filename=safe_filename,
            media_type="application/pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download report: {str(e)}"
        )



