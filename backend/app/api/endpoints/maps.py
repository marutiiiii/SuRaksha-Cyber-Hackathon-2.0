import os
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_dept_officer_scope
from app.models.models import Map, Comparison, Evidence, User, Organization
from app.schemas.schemas import MapResponse, MapCreate, MapStatusUpdate, EvidenceResponse, EvidenceReviewRequest
from app.core.config import settings

router = APIRouter(prefix="/maps", tags=["MAP Management"])

COLUMNS = ["Pending", "Assigned", "In Progress", "Review", "Awaiting Validation", "Completed"]

EVIDENCE_DIR = os.path.join(settings.STORAGE_PATH, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)


def seed_user_default_maps(user_id: UUID, db: Session, copilot_mode: str = "beginner"):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.organization_id:
        return
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        return
        
    services = org.services or []
    departments = org.departments or []
    
    standard_maps = [
        {
            "clause_ref": "RBI-2026-002",
            "title": "Update KYC Verification Workflow",
            "description": "Reconfigure CBS to trigger annual KYC review for high-risk segment.",
            "owner": "Compliance Team",
            "severity": "High",
            "status": "In Progress",
            "deadline": date.today() + timedelta(days=14),
            "department": "Compliance"
        },
        {
            "clause_ref": "RBI-2026-001",
            "title": "Re-paper FLDG contracts",
            "description": "Amend FLDG schedules with all LSP partners to cap at 5%.",
            "owner": "Legal Team",
            "severity": "High",
            "status": "Assigned",
            "deadline": date.today() + timedelta(days=29),
            "department": "Legal"
        },
        {
            "clause_ref": "RBI-2026-001",
            "title": "Stand up DLA quarterly reporting",
            "description": "Build pipeline to RBI portal for DLA metrics.",
            "owner": "IT Team",
            "severity": "Medium",
            "status": "Pending",
            "deadline": date.today() + timedelta(days=39),
            "department": "IT"
        },
        {
            "clause_ref": "CERT-2026-006",
            "title": "Patch Java middleware CVE-2026-3344",
            "description": "Roll emergency patch across core banking nodes.",
            "owner": "Cybersecurity Team",
            "severity": "Critical",
            "status": "In Progress",
            "deadline": date.today() + timedelta(days=6),
            "department": "Cybersecurity"
        },
        {
            "clause_ref": "SEBI-2026-003",
            "title": "Update materiality policy",
            "description": "Refresh disclosure thresholds per SEBI LODR amendment.",
            "owner": "Compliance Team",
            "severity": "Medium",
            "status": "Review",
            "deadline": date.today() + timedelta(days=14),
            "department": "Compliance"
        },
        {
            "clause_ref": "NPCI-2026-005",
            "title": "UPI velocity rules rollout",
            "description": "Deploy new velocity rules in payments switch.",
            "owner": "IT Team",
            "severity": "Medium",
            "status": "Pending",
            "deadline": date.today() + timedelta(days=29),
            "department": "IT"
        },
        {
            "clause_ref": "SEBI-2026-004",
            "title": "Train insider trading designated persons",
            "description": "Conduct mandatory training on updated windows.",
            "owner": "Legal Team",
            "severity": "Low",
            "status": "Completed",
            "deadline": date.today() + timedelta(days=8),
            "department": "Legal"
        },
        {
            "clause_ref": "INT-2026-007",
            "title": "Refresh vendor risk templates",
            "description": "Push new vendor onboarding templates live.",
            "owner": "Audit Team",
            "severity": "Low",
            "status": "Assigned",
            "deadline": date.today() + timedelta(days=21),
            "department": "Audit"
        },
        {
            "clause_ref": "RBI-2026-002",
            "title": "Configure V-CIP as default",
            "description": "Set V-CIP as preferred onboarding journey.",
            "owner": "Operations Team",
            "severity": "High",
            "status": "Pending",
            "deadline": date.today() + timedelta(days=24),
            "department": "Operations"
        }
    ]
    
    personalized_maps = []
    if "UPI" in services:
        personalized_maps.append({
            "clause_ref": "NPCI-2026-005",
            "title": "Deploy NPCI UPI Velocity & Fraud Rules",
            "description": "Configure daily transactional limits and alert thresholds for high-frequency UPI accounts per NPCI guidelines.",
            "owner": "IT Team",
            "severity": "High",
            "status": "Pending",
            "deadline": date.today() + timedelta(days=24),
            "department": "IT"
        })
    if "KYC Services" in services:
        personalized_maps.append({
            "clause_ref": "RBI-2026-002",
            "title": "Implement RBI V-CIP Compliance Journey",
            "description": "Upgrade the remote customer onboarding platform to enforce live video verification, facial matching, and geo-tagging for V-CIP compliance.",
            "owner": "Operations Team",
            "severity": "Critical",
            "status": "In Progress",
            "deadline": date.today() + timedelta(days=9),
            "department": "Operations"
        })
    if "Loans" in services:
        personalized_maps.append({
            "clause_ref": "RBI-2026-001",
            "title": "Audit Digital Lending FLDG Cap Compliance",
            "description": "Verify that First Loss Default Guarantee (FLDG) arrangements with Lending Service Providers (LSPs) do not exceed the 5% cap.",
            "owner": "Compliance Team",
            "severity": "High",
            "status": "Assigned",
            "deadline": date.today() + timedelta(days=29),
            "department": "Compliance"
        })
    if "Credit Cards" in services:
        personalized_maps.append({
            "clause_ref": "RBI-2026-CC",
            "title": "Configure Credit Card Billing Cycle Alerts",
            "description": "Deploy automated notifications notifying customers of billing cycles and deadlines to comply with RBI credit card guidelines.",
            "owner": "Compliance Team",
            "severity": "Medium",
            "status": "Pending",
            "deadline": date.today() + timedelta(days=45),
            "department": "Compliance"
        })
        
    all_to_seed = standard_maps + personalized_maps
    
    # Filter by user's departments if configured
    if departments:
        filtered = [m for m in all_to_seed if m["department"] in departments]
        if filtered:
            all_to_seed = filtered
        
    db_items = []
    for m in all_to_seed:
        db_items.append(Map(
            user_id=user_id,
            clause_ref=m["clause_ref"],
            title=m["title"],
            description=m["description"],
            owner=m["owner"],
            severity=m["severity"],
            status=m["status"],
            deadline=m["deadline"],
            copilot_mode=copilot_mode,
            assigned_department=m["department"]
        ))
        
    db.add_all(db_items)
    db.commit()


@router.get("", response_model=List[MapResponse])
def get_user_maps(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    org_id = current_user.get("organization_id")
    utype = current_user.get("user_type", "admin")
    dept = current_user.get("department")
    copilot_mode = current_user.get("copilot_mode", "beginner")

    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        existing_user_maps = db.query(Map).filter(Map.user_id == user_id, Map.copilot_mode == copilot_mode).first()
        if not existing_user_maps:
            seed_user_default_maps(user_id, db, copilot_mode=copilot_mode)
            
        q = db.query(Map).filter(Map.user_id.in_(org_user_ids), Map.copilot_mode == copilot_mode)
        if utype == "department_officer":
            q = q.filter(Map.assigned_department == dept)
        return q.order_by(Map.created_at.desc()).all()
    else:
        existing = db.query(Map).filter(Map.user_id == user_id, Map.copilot_mode == copilot_mode).first()
        if not existing:
            seed_user_default_maps(user_id, db, copilot_mode=copilot_mode)
        return db.query(Map).filter(Map.user_id == user_id, Map.copilot_mode == copilot_mode).order_by(Map.created_at.desc()).all()


@router.post("", response_model=MapResponse)
def create_map(
    schema: MapCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    utype = current_user.get("user_type", "admin")
    dept = current_user.get("department")
    
    assigned_dept = schema.assigned_department
    if utype == "department_officer":
        assigned_dept = dept
        
    new_map = Map(
        user_id=user_id,
        comparison_id=schema.comparison_id,
        clause_ref=schema.clause_ref,
        title=schema.title,
        description=schema.description,
        owner=schema.owner,
        severity=schema.severity,
        status="Pending",
        deadline=schema.deadline,
        copilot_mode=copilot_mode,
        assigned_department=assigned_dept
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    
    return new_map

@router.patch("/{map_id}/status", response_model=MapResponse)
def update_map_status(
    map_id: UUID,
    schema: MapStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    utype = current_user.get("user_type", "admin")
    if utype == "department_officer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence required. Use POST /maps/{id}/evidence with requested_status."
        )
        
    user_id = current_user.get("id")
    org_id = current_user.get("organization_id")
    target_status = schema.status
    
    if target_status not in COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: '{target_status}'. Allowed: {COLUMNS}"
        )
        
    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        db_map = db.query(Map).filter(Map.id == map_id, Map.user_id.in_(org_user_ids)).first()
    else:
        db_map = db.query(Map).filter(Map.id == map_id, Map.user_id == user_id).first()
        
    if not db_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MAP not found"
        )
        
    if db_map.status == "Completed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workflow Locked: Completed MAPs cannot be modified."
        )
        
    source_index = COLUMNS.index(db_map.status)
    target_index = COLUMNS.index(target_status)
    
    if abs(target_index - source_index) > 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Workflow Violation: Cannot transition status directly from '{db_map.status}' to '{target_status}'. Sequential flow required."
        )
        
    db_map.status = target_status
    db.commit()
    db.refresh(db_map)
    
    return db_map


# ─── Evidence Endpoints ────────────────────────────────────────────────────────

@router.post("/{map_id}/evidence", response_model=EvidenceResponse)
def upload_map_evidence(
    map_id: UUID,
    file: UploadFile = File(...),
    requested_status: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    utype = current_user.get("user_type", "admin")
    user_dept = current_user.get("department")
    org_id = current_user.get("organization_id")
    
    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        m = db.query(Map).filter(Map.id == map_id, Map.user_id.in_(org_user_ids)).first()
    else:
        m = db.query(Map).filter(Map.id == map_id, Map.user_id == user_id).first()
        
    if not m:
        raise HTTPException(status_code=404, detail="MAP not found.")
        
    if utype == "department_officer":
        require_dept_officer_scope(map_id, current_user, db)
        
    if requested_status not in COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: '{requested_status}'. Allowed: {COLUMNS}"
        )
        
    if m.status == "Completed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workflow Locked: Completed MAPs cannot be modified."
        )
        
    source_index = COLUMNS.index(m.status)
    target_index = COLUMNS.index(requested_status)
    if abs(target_index - source_index) > 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Workflow Violation: Cannot transition status directly from '{m.status}' to '{requested_status}'. Sequential flow required."
        )
        
    evidence_id = uuid.uuid4()
    ext = os.path.splitext(file.filename)[1] or ".pdf"
    filename = f"evidence-{evidence_id}{ext}"
    file_path = os.path.join(EVIDENCE_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    db_ev = Evidence(
        id=evidence_id,
        map_id=map_id,
        user_id=user_id,
        filename=file.filename,
        file_path=f"/storage/evidence/{filename}",
        validation_status="Pending",
        department=user_dept,
        organization_id=org_id,
        requested_status=requested_status,
        previous_status=m.status,
        rejection_reason=None
    )
    db.add(db_ev)
    
    m.status = "Awaiting Validation"
    db.commit()
    db.refresh(db_ev)
    db.refresh(m)
    
    return db_ev


@router.get("/{map_id}/evidence", response_model=List[EvidenceResponse])
def get_map_evidence(
    map_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    org_id = current_user.get("organization_id")
    utype = current_user.get("user_type", "admin")
    
    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        m = db.query(Map).filter(Map.id == map_id, Map.user_id.in_(org_user_ids)).first()
    else:
        m = db.query(Map).filter(Map.id == map_id, Map.user_id == user_id).first()
        
    if not m:
        raise HTTPException(status_code=404, detail="MAP not found.")
        
    if utype == "department_officer":
        require_dept_officer_scope(map_id, current_user, db)
        
    return db.query(Evidence).filter(Evidence.map_id == map_id).order_by(Evidence.created_at.desc()).all()


@router.get("/evidence/{evidence_id}/download")
def download_evidence(
    evidence_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence record not found.")
        
    utype = current_user.get("user_type", "admin")
    dept = current_user.get("department")
    org_id = current_user.get("organization_id")
    
    if org_id and evidence.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied: Evidence belongs to a different organization.")
        
    if utype == "department_officer" and evidence.department != dept:
        raise HTTPException(status_code=403, detail="Access denied: Evidence belongs to a different department.")
        
    filename = os.path.basename(evidence.file_path)
    file_path = os.path.join(EVIDENCE_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical evidence file not found.")
        
    return FileResponse(
        path=file_path,
        filename=evidence.filename,
        media_type="application/octet-stream"
    )


# ─── Evidence Review (Admin Only) ──────────────────────────────────────────

@router.patch("/evidence/{evidence_id}/review", response_model=EvidenceResponse)
def review_evidence(
    evidence_id: UUID,
    schema: EvidenceReviewRequest,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found.")
        
    admin_org_id = current_user.get("organization_id")
    if admin_org_id and evidence.organization_id != admin_org_id:
        raise HTTPException(status_code=403, detail="Not authorized to review evidence from another organization.")
        
    map_task = db.query(Map).filter(Map.id == evidence.map_id).first()
    if not map_task:
        raise HTTPException(status_code=404, detail="Associated MAP not found.")
        
    if schema.status == "Passed":
        evidence.validation_status = "Passed"
        evidence.rejection_reason = None
        
        target_status = evidence.requested_status
        if target_status not in COLUMNS:
            raise HTTPException(status_code=400, detail=f"Invalid target status: '{target_status}'")
            
        map_task.status = target_status
    elif schema.status == "Failed":
        evidence.validation_status = "Failed"
        evidence.rejection_reason = schema.rejection_reason or "Evidence did not satisfy compliance requirements."
        
        map_task.status = evidence.previous_status
    else:
        raise HTTPException(status_code=400, detail="Invalid review status. Must be 'Passed' or 'Failed'.")
        
    db.commit()
    db.refresh(evidence)
    db.refresh(map_task)
    
    return evidence


@router.get("/evidence/all", response_model=List[EvidenceResponse])
def get_all_evidences(
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_org_id = current_user.get("organization_id")
    if not admin_org_id:
        raise HTTPException(status_code=400, detail="Admin has no organization associated.")
        
    q = db.query(Evidence).filter(Evidence.organization_id == admin_org_id)
    if status:
        q = q.filter(Evidence.validation_status == status)
        
    return q.order_by(Evidence.created_at.desc()).all()
