import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, ForeignKey, Uuid, JSON, ARRAY, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


# ─── Organization ──────────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=True)   # Banking | FinTech
    org_size = Column(String(100), nullable=True)   # Startup | Small | Medium | Enterprise
    country = Column(String(100), nullable=True, default="India")
    departments = Column(JSON, nullable=True, default=[])   # list of dept strings
    services = Column(JSON, nullable=True, default=[])      # list of service strings
    enabled_sources = Column(JSON, nullable=True, default=[])  # RBI, NPCI, etc.
    is_setup_complete = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="organization")


# ─── Role ──────────────────────────────────────────────────────────────────────

class Role(Base):
    __tablename__ = "roles"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="role")


# ─── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id = Column(Uuid, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    role_id = Column(Uuid, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    # Hashed password stored here for local-DB auth fallback
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="Active")  # Active | Inactive
    department = Column(String(100), nullable=True)
    user_type = Column(String(50), nullable=False, default="admin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="users")
    role = relationship("Role", back_populates="users")


# ─── Regulation ────────────────────────────────────────────────────────────────

class Regulation(Base):
    __tablename__ = "regulations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    source = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    date = Column(Date, nullable=False)
    link = Column(String(500), nullable=True)
    summary = Column(String, nullable=True)
    risk_level = Column(String(50), nullable=True, default="Medium")
    obligations = Column(JSON, nullable=True, default=[])
    suggested_actions = Column(JSON, nullable=True, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def suggestedActions(self):
        return self.suggested_actions

    # Relationships
    findings = relationship("Finding", back_populates="regulation")
    chunks = relationship("RegulationChunk", back_populates="regulation", cascade="all, delete-orphan")


# ─── Regulation Chunk ──────────────────────────────────────────────────────────

class RegulationChunk(Base):
    __tablename__ = "regulation_chunks"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    regulation_id = Column(Uuid, ForeignKey("regulations.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    regulation = relationship("Regulation", back_populates="chunks")


# ─── Document ──────────────────────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)  # Maps to users.id
    title = Column(String(255), nullable=False)
    source = Column(String(100), nullable=True)
    file_path = Column(String, nullable=False)
    pages = Column(Integer, nullable=True)
    extracted_text = Column(String, nullable=True)
    status = Column(String(50), nullable=False, default="uploaded")
    copilot_mode = Column(String(50), nullable=True, default="beginner")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    clauses = relationship("Clause", back_populates="document", cascade="all, delete-orphan")


# ─── Clause ────────────────────────────────────────────────────────────────────

class Clause(Base):
    __tablename__ = "clauses"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    clause_id = Column(String(100), nullable=False)
    text = Column(String, nullable=False)
    category = Column(String(100), nullable=True)
    obligation = Column(String, nullable=True)
    severity = Column(String(50), nullable=True)
    embedding = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("Document", back_populates="clauses")


# ─── Comparison ────────────────────────────────────────────────────────────────

class Comparison(Base):
    __tablename__ = "comparisons"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    old_document_id = Column(Uuid, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    new_document_id = Column(Uuid, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    result_json = Column(JSON, nullable=False, default={})
    copilot_mode = Column(String(50), nullable=True, default="beginner")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    old_document = relationship("Document", foreign_keys=[old_document_id])
    new_document = relationship("Document", foreign_keys=[new_document_id])
    maps = relationship("Map", back_populates="comparison")


# ─── Map ───────────────────────────────────────────────────────────────────────

class Map(Base):
    __tablename__ = "maps"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    comparison_id = Column(Uuid, ForeignKey("comparisons.id", ondelete="SET NULL"), nullable=True)
    clause_ref = Column(String(100), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=True)
    owner = Column(String(255), nullable=True)
    severity = Column(String(50), nullable=False, default="Medium")
    status = Column(String(50), nullable=False, default="Open")
    deadline = Column(Date, nullable=True)
    copilot_mode = Column(String(50), nullable=True, default="beginner")
    assigned_department = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    comparison = relationship("Comparison", back_populates="maps")
    evidences = relationship("Evidence", back_populates="map_task", cascade="all, delete-orphan")


# ─── Evidence ──────────────────────────────────────────────────────────────────

class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    map_id = Column(Uuid, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String, nullable=False)
    validation_status = Column(String(50), nullable=False, default="Pending")  # Pending | Passed | Failed
    ai_notes = Column(Text, nullable=True)
    department = Column(String(100), nullable=True)
    organization_id = Column(Uuid, nullable=True)
    requested_status = Column(String(50), nullable=True)
    previous_status = Column(String(50), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    map_task = relationship("Map", back_populates="evidences")


# ─── Report ────────────────────────────────────────────────────────────────────

class Report(Base):
    __tablename__ = "reports"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    type = Column(String(100), nullable=False)
    title = Column(String(500), nullable=True)
    file_path = Column(String, nullable=False)
    copilot_mode = Column(String(50), nullable=True, default="beginner")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Chat History ──────────────────────────────────────────────────────────────

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    session_id = Column(Uuid, nullable=False)
    role = Column(String(50), nullable=False)
    content = Column(String, nullable=False)
    citations_json = Column(JSON, nullable=True, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Notification ──────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String, nullable=False)
    severity = Column(String(50), nullable=False, default="Medium")
    is_read = Column(Boolean, nullable=False, default=False)
    copilot_mode = Column(String(50), nullable=True, default="beginner")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Finding ───────────────────────────────────────────────────────────────────

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    regulation_id = Column(Uuid, ForeignKey("regulations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=True)
    severity = Column(String(50), nullable=False, default="Medium")
    status = Column(String(50), nullable=False, default="Open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    regulation = relationship("Regulation", back_populates="findings")


class ImpactAnalysis(Base):
    __tablename__ = "impact_analyses"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    comparison_id = Column(Uuid, ForeignKey("comparisons.id", ondelete="CASCADE"), nullable=False)
    risk_level = Column(String(50), nullable=True)  # High | Medium | Low
    departments = Column(JSON, nullable=True, default=[])  # e.g., ["Compliance", "IT"]
    services = Column(JSON, nullable=True, default=[])  # e.g., ["Retail Banking"]
    matrix_json = Column(JSON, nullable=False, default=[])  # department matrix list
    detail_json = Column(JSON, nullable=False, default=[])  # per-clause details
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    comparison = relationship("Comparison")


class ComplianceDraft(Base):
    __tablename__ = "compliance_drafts"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    comparison_id = Column(Uuid, ForeignKey("comparisons.id", ondelete="SET NULL"), nullable=True)
    document_id = Column(Uuid, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)  # sop | policy | circular | checklist
    content = Column(Text, nullable=False)
    source = Column(String(255), nullable=True)
    ai_model = Column(String(100), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    comparison = relationship("Comparison")
    document = relationship("Document")


# ─── Demo Booking ─────────────────────────────────────────────────────────────

class DemoBooking(Base):
    __tablename__ = "demo_bookings"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


