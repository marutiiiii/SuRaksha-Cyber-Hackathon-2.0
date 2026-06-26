from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RegulationCreate(BaseModel):
    content: str

class TaskCreate(BaseModel):
    regulation_id: int
    title: str
    description: str
    department: str
    deadline: str

class TaskUpdate(BaseModel):
    status: str

class TaskResponse(BaseModel):
    id: int
    regulation_id: int
    title: str
    description: str
    department: str
    deadline: str
    status: str
    created_at: str

class RegulationResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: str
    changes: List[str]
    actions_required: List[str]
    affected_entities: List[str]
    deadline: Optional[str] = None
    created_at: str
    tasks: List[TaskResponse] = []

class EvidenceResponse(BaseModel):
    id: int
    task_id: int
    file_path: str
    file_type: str
    uploaded_at: str

class VerificationReportResponse(BaseModel):
    id: int
    task_id: int
    evidence_id: int
    department: str
    status: str
    confidence: float
    evidence_found: List[str]
    missing_requirements: List[str]
    reason: str
    created_at: str

class TaskDetailResponse(BaseModel):
    id: int
    regulation_id: int
    title: str
    description: str
    department: str
    deadline: str
    status: str
    created_at: str
    evidence: List[EvidenceResponse] = []
    reports: List[VerificationReportResponse] = []

class DashboardStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    not_started_tasks: int
    average_confidence: float
    compliance_rate: float
