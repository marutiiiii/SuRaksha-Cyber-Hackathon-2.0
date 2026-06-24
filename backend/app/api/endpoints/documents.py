import os
import uuid
from uuid import UUID
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pypdf import PdfReader
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.models import Document, Clause
from app.schemas.schemas import DocumentResponse, ListDocumentsResponse, ClauseResponse
from app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

STORAGE_DIR = os.path.join(settings.STORAGE_PATH, "documents")
os.makedirs(STORAGE_DIR, exist_ok=True)

@router.get("", response_model=ListDocumentsResponse)
def list_documents(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    docs = db.query(Document).filter(
        Document.user_id == user_id,
        Document.copilot_mode == copilot_mode
    ).order_by(Document.created_at.desc()).all()
    return {"documents": docs}

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    source: str = Form("Unknown"),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    
    # Save the file locally
    file_id = uuid.uuid4()
    safe_filename = f"{file_id}-{file.filename.replace(' ', '_')}"
    file_path = os.path.join(STORAGE_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    # Create DB entry
    db_doc = Document(
        id=file_id,
        user_id=user_id,
        title=file.filename,
        source=source,
        file_path=f"/storage/documents/{safe_filename}",
        status="uploaded",
        copilot_mode=copilot_mode
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Trigger downstream pipeline automatically in expert mode
    if copilot_mode == "expert":
        from app.core.pipeline import execute_downstream_pipeline
        try:
            execute_downstream_pipeline(db, db_doc, user_id, "expert")
            db.refresh(db_doc)
        except Exception as e:
            print(f"[API] Expert mode pipeline execution failed: {e}")
            
    return {"documentId": db_doc.id, "status": db_doc.status, "document": db_doc}

@router.post("/{document_id}/extract-text")
def extract_document_text(
    document_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    db_doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Get local path
    filename = os.path.basename(db_doc.file_path)
    local_path = os.path.join(STORAGE_DIR, filename)
    
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Physical file not found")
        
    try:
        reader = PdfReader(local_path)
        text_content = ""
        for page in reader.pages:
            text_content += page.extract_text() or ""
            
        # Cap text size
        text_content = text_content[:200000]
        pages_count = len(reader.pages)
        
        db_doc.pages = pages_count
        db_doc.extracted_text = text_content
        db_doc.status = "extracted"
        db.commit()
        
        db.commit()
        
        return {"documentId": db_doc.id, "pages": pages_count, "text": text_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

@router.post("/{document_id}/extract-clauses")
def extract_document_clauses(
    document_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    db_doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not db_doc.extracted_text:
        raise HTTPException(status_code=400, detail="Run text extraction first")
        
    sample = db_doc.extracted_text[:40000]
    
    # Call local Llama 3 AI service
    from app.core.ai_service import LlamaAIService
    from app.core.embeddings import EmbeddingService
    res_json = LlamaAIService.extract_clauses(db_doc.title, db_doc.source or "RBI", sample)
    clauses = res_json.get("clauses", [])
            
    # Delete existing clauses
    db.query(Clause).filter(Clause.document_id == document_id).delete()
    
    # Generate REAL embeddings using sentence-transformers (all-MiniLM-L6-v2, 384-dim)
    # Batch encode all clause texts in one pass for efficiency
    clause_texts = [c.get("text", "") for c in clauses]
    embeddings = EmbeddingService.batch_encode(clause_texts) if clause_texts else []
    
    rows = []
    for i, c in enumerate(clauses):
        vec = embeddings[i] if i < len(embeddings) else [0.0] * 384
        rows.append(Clause(
            document_id=document_id,
            clause_id=c["clauseId"],
            text=c["text"],
            category=c["category"],
            obligation=c["obligation"],
            severity=c["severity"],
            embedding=EmbeddingService.to_db(vec)
        ))
        
    db.add_all(rows)
    db_doc.status = "analyzed"
    db.commit()
    
    db.commit()
    
    return {"documentId": db_doc.id, "count": len(clauses), "clauses": clauses}

@router.get("/{document_id}/clauses", response_model=List[ClauseResponse])
def get_document_clauses(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    # Verify document belongs to user
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    clauses = db.query(Clause).filter(Clause.document_id == document_id).all()
    return clauses

