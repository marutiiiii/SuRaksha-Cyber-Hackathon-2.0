import hashlib
import hmac
import uuid
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user, create_access_token
from app.models.models import User, Organization, Role, Notification
from app.schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    AuthResponse,
    OrgSetupRequest,
    OrganizationResponse,
    UserResponse,
    MessageResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    """Simple SHA-256 hash for password storage (demo-grade; use bcrypt in prod)."""
    return hashlib.sha256(password.encode()).hexdigest()

def _verify_password(plain: str, hashed: str) -> bool:
    return hmac.compare_digest(_hash_password(plain), hashed)

def _get_or_create_default_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "Compliance Officer").first()
    if not role:
        role = Role(name="Compliance Officer", description="Default role for new users")
        db.add(role)
        db.commit()
        db.refresh(role)
    return role


# ─── Register ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    # Determine user_type
    utype = payload.user_type or "admin"
    if utype not in ("admin", "department_officer"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid user type. Must be 'admin' or 'department_officer'."
        )

    org = None
    status_val = "Active"
    role_name = "AI Compliance Officer"

    if utype == "admin":
        if not payload.org_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Organization name is required for admin signup."
            )
        # Create organization
        org = Organization(
            name=payload.org_name,
            industry=payload.industry_type,
            enabled_sources=["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
            is_setup_complete=False
        )
        db.add(org)
        db.flush()  # get org.id
    else:
        # Department Officer signup
        if not payload.organization_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Organization ID is required for department officer signup."
            )
        org = db.query(Organization).filter(Organization.id == payload.organization_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found."
            )
        
        # Validate department
        valid_departments = ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management", "HR"]
        if payload.department not in valid_departments:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid department. Must be one of: {', '.join(valid_departments)}"
            )
        status_val = "Pending Approval"
        role_name = "Department Officer"

    # Get/create role
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name, description=f"Default role for {role_name}")
        db.add(role)
        db.flush()

    # Create user
    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        password_hash=_hash_password(payload.password),
        organization_id=org.id if org else None,
        role_id=role.id if role else None,
        department=payload.department if utype == "department_officer" else None,
        user_type=utype,
        status=status_val
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if org:
        db.refresh(org)

    access_token = create_access_token(user.id, user.email, user_type=user.user_type, department=user.department)

    return AuthResponse(
        success=True,
        message="Account created successfully." if utype == "admin" else "Registration submitted. Awaiting approval from your organization admin.",
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            status=user.status,
            user_type=user.user_type,
            department=user.department or "",
            role_name=role.name if role else None,
            organization_id=user.organization_id,
            organization=OrganizationResponse(
                id=org.id,
                name=org.name,
                industry=org.industry,
                org_size=org.org_size,
                country=org.country,
                departments=org.departments or [],
                services=org.services or [],
                enabled_sources=org.enabled_sources or [],
                is_setup_complete=org.is_setup_complete,
                created_at=org.created_at,
                updated_at=org.updated_at
            ) if org else None,
            created_at=user.created_at
        )
    )


# ─── Login ───────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not user.password_hash or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    if user.status not in ("Active", "Pending Approval", "Blocked"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    org = None
    if user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()

    role_name = None
    if user.role_id:
        role_obj = db.query(Role).filter(Role.id == user.role_id).first()
        role_name = role_obj.name if role_obj else None

    access_token = create_access_token(user.id, user.email, user_type=user.user_type, department=user.department)

    return AuthResponse(
        success=True,
        message="Login successful.",
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            status=user.status,
            user_type=user.user_type,
            department=user.department or "",
            role_name=role_name,
            organization_id=user.organization_id,
            organization=OrganizationResponse(
                id=org.id,
                name=org.name,
                industry=org.industry,
                org_size=org.org_size,
                country=org.country,
                departments=org.departments or [],
                services=org.services or [],
                enabled_sources=org.enabled_sources or [],
                is_setup_complete=org.is_setup_complete,
                created_at=org.created_at,
                updated_at=org.updated_at
            ) if org else None,
            created_at=user.created_at
        )
    )


# ─── Org Setup ───────────────────────────────────────────────────────────────

@router.post("/org-setup/{user_id}", response_model=MessageResponse)
def org_setup(
    user_id: UUID,
    payload: OrgSetupRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to configure this profile.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    org.name = payload.org_name
    org.org_size = payload.org_size
    org.departments = payload.departments
    org.services = payload.services
    org.enabled_sources = payload.enabled_sources
    if payload.industry:
        org.industry = payload.industry
    org.is_setup_complete = True
    db.commit()

    return MessageResponse(success=True, message="Organization setup complete.")


# ─── Get User Profile ────────────────────────────────────────────────────────

@router.get("/profile/{user_id}", response_model=UserResponse)
def get_profile(
    user_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    org = None
    if user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()

    role_name = None
    if user.role_id:
        role_obj = db.query(Role).filter(Role.id == user.role_id).first()
        role_name = role_obj.name if role_obj else None

    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        status=user.status,
        user_type=user.user_type,
        department=user.department or "",
        role_name=role_name,
        organization_id=user.organization_id,
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            industry=org.industry,
            org_size=org.org_size,
            country=org.country,
            departments=org.departments or [],
            services=org.services or [],
            enabled_sources=org.enabled_sources or [],
            is_setup_complete=org.is_setup_complete,
            created_at=org.created_at,
            updated_at=org.updated_at
        ) if org else None,
        created_at=user.created_at
    )


# ─── Organizations List ──────────────────────────────────────────────────────

@router.get("/organizations")
def get_organizations(db: Session = Depends(get_db)):
    orgs = db.query(Organization).all()
    return [{"id": str(o.id), "name": o.name, "industry": o.industry} for o in orgs]


# ─── Member Management (Admin Only) ─────────────────────────────────────────

from app.core.security import require_admin
from typing import List

@router.get("/members", response_model=List[UserResponse])
def get_members(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_org_id = current_user.get("organization_id")
    if not admin_org_id:
        raise HTTPException(status_code=400, detail="Admin has no organization associated.")
        
    members = db.query(User).filter(User.organization_id == admin_org_id).all()
    
    response_items = []
    for u in members:
        role_name = None
        if u.role_id:
            r = db.query(Role).filter(Role.id == u.role_id).first()
            role_name = r.name if r else None
            
        org = db.query(Organization).filter(Organization.id == u.organization_id).first()
        
        response_items.append(UserResponse(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            status=u.status,
            user_type=u.user_type,
            department=u.department or "",
            role_name=role_name,
            organization_id=u.organization_id,
            organization=OrganizationResponse(
                id=org.id,
                name=org.name,
                industry=org.industry,
                org_size=org.org_size,
                country=org.country,
                departments=org.departments or [],
                services=org.services or [],
                enabled_sources=org.enabled_sources or [],
                is_setup_complete=org.is_setup_complete,
                created_at=org.created_at,
                updated_at=org.updated_at
            ) if org else None,
            created_at=u.created_at
        ))
    return response_items


@router.patch("/members/{user_id}/approve", response_model=UserResponse)
def approve_member(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_org_id = current_user.get("organization_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.organization_id != admin_org_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve users from another organization.")
        
    user.status = "Active"
    db.commit()
    db.refresh(user)
    
    role_name = None
    if user.role_id:
        r = db.query(Role).filter(Role.id == user.role_id).first()
        role_name = r.name if r else None
        
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        status=user.status,
        user_type=user.user_type,
        department=user.department or "",
        role_name=role_name,
        organization_id=user.organization_id,
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            industry=org.industry,
            org_size=org.org_size,
            country=org.country,
            departments=org.departments or [],
            services=org.services or [],
            enabled_sources=org.enabled_sources or [],
            is_setup_complete=org.is_setup_complete,
            created_at=org.created_at,
            updated_at=org.updated_at
        ) if org else None,
        created_at=user.created_at
    )


@router.patch("/members/{user_id}/block", response_model=UserResponse)
def block_member(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_org_id = current_user.get("organization_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.organization_id != admin_org_id:
        raise HTTPException(status_code=403, detail="Not authorized to block users from another organization.")
        
    user.status = "Blocked"
    db.commit()
    db.refresh(user)
    
    role_name = None
    if user.role_id:
        r = db.query(Role).filter(Role.id == user.role_id).first()
        role_name = r.name if r else None
        
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        status=user.status,
        user_type=user.user_type,
        department=user.department or "",
        role_name=role_name,
        organization_id=user.organization_id,
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            industry=org.industry,
            org_size=org.org_size,
            country=org.country,
            departments=org.departments or [],
            services=org.services or [],
            enabled_sources=org.enabled_sources or [],
            is_setup_complete=org.is_setup_complete,
            created_at=org.created_at,
            updated_at=org.updated_at
        ) if org else None,
        created_at=user.created_at
    )
