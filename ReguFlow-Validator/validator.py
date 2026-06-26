import os
import shutil
import uvicorn
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel

import config
from models.db import (
    init_db,
    db_get_regulations,
    db_get_regulation,
    db_add_task,
    db_get_tasks,
    db_get_task,
    db_add_evidence,
    db_get_evidence,
    db_get_evidence_by_task,
    db_get_verification_reports_by_task,
    db_get_verification_report,
    db_create_queued_report,
    db_get_stats
)
from services import qwen_service
from task_generator import generate_tasks_from_regulation
from evidence_analyzer import verify_compliance, verify_compliance_task


# Lifespan context manager for FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up ReguFlow Validator...")
    print("Initializing Database...")
    try:
        init_db()
        from models.db import db_cleanup_stale_reports
        db_cleanup_stale_reports()
    except Exception as e:
        print(f"Error initializing database: {e}")
        
    # Trigger local Qwen2.5-VL model load on startup
    asyncio.create_task(asyncio.to_thread(qwen_service.load_qwen_model_on_startup))
    
    yield
    print("Shutting down ReguFlow Validator...")

app = FastAPI(title="ReguFlow AI Proof Verification System", lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request bodies
class TaskCreateRequest(BaseModel):
    regulation_id: int
    title: str
    description: str
    department: str
    deadline: str

class VerifyRequest(BaseModel):
    task_id: int
    evidence_id: int

# REST API Endpoints

@app.get("/health")
def health_check():
    """Retrieve loading status and readiness of the local Qwen vision model."""
    if not qwen_service.model_ready:
        # Try to trigger loading if model is ready in directory but not loaded
        try:
            if qwen_service.verify_model_integrity():
                print("Model files detected. Triggering loading...")
                asyncio.create_task(asyncio.to_thread(qwen_service.load_qwen_model_on_startup))
        except Exception:
            pass
            
    return {
        "model_loaded": qwen_service.model_loaded,
        "device": qwen_service.device_used,
        "ready": qwen_service.model_ready,
        "error": qwen_service.load_error_message or None
    }

@app.get("/stats")
def get_dashboard_stats():
    try:
        return db_get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/regulations")
def get_all_regulations():
    try:
        return db_get_regulations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/regulations/{id}")
def get_regulation_details(id: int):
    reg = db_get_regulation(id)
    if not reg:
        raise HTTPException(status_code=404, detail="Regulation not found")
    reg["tasks"] = db_get_tasks(regulation_id=id)
    return reg

@app.post("/regulations/upload")
async def upload_regulation(
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None)
):
    # Guard check: Ensure model is ready
    if not qwen_service.model_ready:
        raise HTTPException(
            status_code=503,
            detail=f"Qwen2.5-VL-3B-Instruct model is not ready. Rationale: {qwen_service.load_error_message or 'Model is still loading on startup.'}"
        )
        
    if not file and not text_content:
        raise HTTPException(status_code=400, detail="Provide either a regulation file or text_content")
        
    try:
        if file:
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in [".pdf", ".txt"]:
                raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
                
            file_path = os.path.join(config.UPLOAD_REG_DIR, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            # Run CPU-bound extraction task in background thread pool with a 300s timeout
            result = await asyncio.wait_for(
                asyncio.to_thread(generate_tasks_from_regulation, file_path, file.filename),
                timeout=300.0
            )
            return result
        else:
            result = await asyncio.wait_for(
                asyncio.to_thread(generate_tasks_from_regulation, text_content, "Pasted Regulation"),
                timeout=300.0
            )
            return result
            
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Regulation extraction timed out. The local model took too long to respond.")
    except Exception as e:
        print(f"Error processing regulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tasks/create")
def create_manual_task(req: TaskCreateRequest):
    try:
        task_id = db_add_task(
            regulation_id=req.regulation_id,
            title=req.title,
            description=req.description,
            department=req.department,
            deadline=req.deadline
        )
        return {"message": "Task created successfully", "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks")
def list_tasks(regulation_id: Optional[int] = None):
    try:
        return db_get_tasks(regulation_id=regulation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/{id}")
def get_task_details(id: int):
    task = db_get_task(id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    evidence = db_get_evidence_by_task(id)
    reports = db_get_verification_reports_by_task(id)
    
    return {
        "id": task["id"],
        "regulation_id": task["regulation_id"],
        "title": task["title"],
        "description": task["description"],
        "department": task["department"],
        "deadline": task["deadline"],
        "status": task["status"],
        "created_at": task["created_at"],
        "evidence": evidence,
        "reports": reports
    }

@app.post("/evidence/upload")
def upload_evidence(
    task_id: int = Form(...),
    file: UploadFile = File(...)
):
    try:
        task = db_get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
            
        file_ext = os.path.splitext(file.filename)[1].lower()
        allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg", ".bmp"]
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Allowed: {allowed_extensions}")
            
        safe_filename = f"task_{task_id}_{file.filename}"
        file_path = os.path.join(config.UPLOAD_PROOF_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        evidence_id = db_add_evidence(
            task_id=task_id,
            file_path=file_path,
            file_type=file_ext.replace(".", "").upper()
        )
        
        return {
            "message": "Evidence uploaded successfully",
            "evidence_id": evidence_id,
            "task_id": task_id,
            "file_path": file_path,
            "file_type": file_ext.replace(".", "").upper()
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error uploading evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evidence/verify", status_code=202)
async def verify_evidence(req: VerifyRequest, background_tasks: BackgroundTasks):
    # Guard check: Ensure model is ready
    if not qwen_service.model_ready:
        raise HTTPException(
            status_code=503,
            detail=f"Qwen2.5-VL-3B-Instruct model is not ready. Rationale: {qwen_service.load_error_message or 'Model is still loading on startup.'}"
        )
        
    try:
        print(f"Triggering background compliance verification for task {req.task_id} with evidence {req.evidence_id}...")
        # Fetch task and evidence details to validate existence
        task = db_get_task(req.task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task with ID {req.task_id} not found.")
            
        evidence = db_get_evidence(req.evidence_id)
        if not evidence:
            raise HTTPException(status_code=404, detail=f"Evidence with ID {req.evidence_id} not found.")
            
        # Create verification report stub with status 'QUEUED'
        report_id = db_create_queued_report(req.task_id, req.evidence_id, task["department"])
        
        # Add to background tasks
        background_tasks.add_task(verify_compliance_task, report_id)
        
        return JSONResponse(
            status_code=202,
            content={
                "report_id": report_id,
                "status": "QUEUED"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"AI compliance verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/verification/{id}")
def get_verification_details(id: int):
    report = db_get_verification_report(id)
    if not report:
        raise HTTPException(status_code=404, detail="Verification report not found")
    return report

# Serve Frontend SPA
@app.get("/", response_class=HTMLResponse)
def get_dashboard():
    index_path = os.path.join(config.STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse(content="<h1>ReguFlow Validator Dashboard Static File Not Found</h1>", status_code=404)

# Mount static folders
app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    uvicorn.run(
        "validator:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        reload_excludes=["uploads/*", "static/*", "*.db", "reguflow.db"]
    )
