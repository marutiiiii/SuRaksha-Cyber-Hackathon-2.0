from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import date, datetime
from uuid import UUID

# ─── General ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

# ─── Organization ─────────────────────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    name: str
    industry: Optional[str] = None          # Banking | FinTech
    org_size: Optional[str] = None          # Startup | Small | Medium | Enterprise
    country: Optional[str] = "India"
    departments: Optional[List[str]] = []
    services: Optional[List[str]] = []
    enabled_sources: Optional[List[str]] = []
    is_setup_complete: Optional[bool] = False

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    org_size: Optional[str] = None
    country: Optional[str] = None
    departments: Optional[List[str]] = None
    services: Optional[List[str]] = None
    enabled_sources: Optional[List[str]] = None
    is_setup_complete: Optional[bool] = None

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    industry: Optional[str] = None
    org_size: Optional[str] = None
    country: Optional[str] = None
    departments: Optional[List[str]] = []
    services: Optional[List[str]] = []
    enabled_sources: Optional[List[str]] = []
    is_setup_complete: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ─── Auth / User ──────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    org_name: Optional[str] = None
    industry_type: Optional[str] = None  # Banking | FinTech
    user_type: Optional[str] = "admin"  # admin | department_officer
    department: Optional[str] = None
    organization_id: Optional[UUID] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    status: str
    user_type: str
    department: Optional[str] = None
    role_name: Optional[str] = None
    organization_id: Optional[UUID] = None
    organization: Optional[OrganizationResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MemberApprovalRequest(BaseModel):
    status: str  # Active | Blocked

class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    user: Optional[UserResponse] = None

class OrgSetupRequest(BaseModel):
    org_name: str
    org_size: str
    departments: List[str]
    services: List[str]
    enabled_sources: Optional[List[str]] = ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
    industry: Optional[str] = None

# ─── Regulations ─────────────────────────────────────────────────────────────

class RegulationBase(BaseModel):
    source: str
    title: str
    date: date
    link: Optional[str] = None
    summary: Optional[str] = None

class RegulationResponse(RegulationBase):
    id: UUID
    risk_level: Optional[str] = "Medium"
    obligations: Optional[List[str]] = []
    suggestedActions: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Documents ───────────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: UUID
    title: str
    source: Optional[str] = None
    pages: Optional[int] = None
    status: str
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True

class ListDocumentsResponse(BaseModel):
    documents: List[DocumentResponse]

# ─── Clauses ─────────────────────────────────────────────────────────────────

class ClauseResponse(BaseModel):
    id: UUID
    clause_id: str
    text: str
    category: Optional[str] = None
    obligation: Optional[str] = None
    severity: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Comparisons ─────────────────────────────────────────────────────────────

class ComparisonRequest(BaseModel):
    oldDocumentId: UUID
    newDocumentId: UUID

class ComparisonResponse(BaseModel):
    comparisonId: UUID
    added: List[Dict[str, Any]]
    removed: List[Dict[str, Any]]
    modified: List[Dict[str, Any]]
    counts: Dict[str, int]

# ─── Maps ────────────────────────────────────────────────────────────────────

class MapStatusUpdate(BaseModel):
    status: str

class MapCreate(BaseModel):
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    severity: str = "Medium"
    deadline: Optional[date] = None
    clause_ref: Optional[str] = None
    comparison_id: Optional[UUID] = None
    assigned_department: Optional[str] = None

class MapResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    severity: str
    status: str
    deadline: Optional[date] = None
    clause_ref: Optional[str] = None
    comparison_id: Optional[UUID] = None
    assigned_department: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Copilot ─────────────────────────────────────────────────────────────────

class CopilotRequest(BaseModel):
    message: str
    sessionId: Optional[UUID] = None

class CopilotResponse(BaseModel):
    sessionId: UUID
    answer: str
    citations: List[Dict[str, Any]]

# ─── Dashboard ───────────────────────────────────────────────────────────────

class KpiCardData(BaseModel):
    value: int
    tone: Optional[str] = None
    delta: Optional[int] = None
    trendLabel: Optional[str] = None

class DashboardOverviewResponse(BaseModel):
    score: int
    total: int
    completed: int
    overdue: int
    departments: List[Dict[str, Any]]
    recentActivity: List[Dict[str, Any]]
    insights: List[Dict[str, Any]]
    complianceTrend: List[Dict[str, Any]]
    mapProgress: List[Dict[str, Any]]

# ─── Reports ─────────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    type: str

class ReportResponse(BaseModel):
    report: Dict[str, Any]
    signed_url: str

# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: UUID
    title: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Audit Logs ──────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    entity_type: str
    action: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Evidence ────────────────────────────────────────────────────────────────

class EvidenceResponse(BaseModel):
    id: UUID
    map_id: UUID
    user_id: UUID
    filename: str
    file_path: str
    validation_status: str
    ai_notes: Optional[str] = None
    department: Optional[str] = None
    organization_id: Optional[UUID] = None
    requested_status: Optional[str] = None
    previous_status: Optional[str] = None
    rejection_reason: Optional[str] = None
    confidence: Optional[float] = 0.0
    score: Optional[float] = 0.0
    evidence_found: Optional[str] = None
    missing_requirements: Optional[str] = None
    progress: Optional[str] = "0%"
    created_at: datetime

    class Config:
        from_attributes = True

class EvidenceReviewRequest(BaseModel):
    status: str  # Passed | Failed
    rejection_reason: Optional[str] = None
