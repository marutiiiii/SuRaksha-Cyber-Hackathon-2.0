import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Document, Comparison, Map, Report
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit History"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    query: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    
    logs = []
    
    # 1. Fetch documents
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    for d in docs:
        logs.append({
            "entity_type": d.source or "Regulatory Doc",
            "action": f"Document Uploaded: {d.title}",
            "description": f"Extracted {d.pages or 0} pages. Status: {d.status}.",
            "created_at": d.created_at
        })
        
    # 2. Fetch comparisons
    comps = db.query(Comparison).filter(Comparison.user_id == user_id).all()
    for c in comps:
        old_doc = db.query(Document).filter(Document.id == c.old_document_id).first()
        new_doc = db.query(Document).filter(Document.id == c.new_document_id).first()
        old_title = old_doc.title if old_doc else str(c.old_document_id)
        new_title = new_doc.title if new_doc else str(c.new_document_id)
        
        counts = c.result_json.get("counts", {})
        summary = f"Added: {counts.get('added', 0)}, Removed: {counts.get('removed', 0)}, Modified: {counts.get('modified', 0)}."
        
        logs.append({
            "entity_type": "AI Analysis",
            "action": f"Comparison Run: {new_title} vs {old_title}",
            "description": f"Analyzed differences. {summary}",
            "created_at": c.created_at
        })
        
    # 3. Fetch MAP tasks
    maps = db.query(Map).filter(Map.user_id == user_id).all()
    for m in maps:
        logs.append({
            "entity_type": m.owner or "Compliance Team",
            "action": f"MAP Created: {m.title}",
            "description": f"Assigned to {m.owner or 'Compliance Team'} with status {m.status} and severity {m.severity}.",
            "created_at": m.created_at
        })
        
    # 4. Fetch reports
    reps = db.query(Report).filter(Report.user_id == user_id).all()
    for r in reps:
        logs.append({
            "entity_type": "Report Center",
            "action": f"Report Generated: {r.title}",
            "description": f"Saved PDF file for download type: {r.type.upper()}.",
            "created_at": r.created_at
        })
        

        
    # Apply query filtering
    if query:
        search = query.lower()
        logs = [
            l for l in logs 
            if search in l["entity_type"].lower() or 
               search in l["action"].lower() or 
               (l["description"] and search in l["description"].lower())
        ]
        
    # Sort by created_at descending
    logs.sort(key=lambda x: x["created_at"], reverse=True)
    return logs
