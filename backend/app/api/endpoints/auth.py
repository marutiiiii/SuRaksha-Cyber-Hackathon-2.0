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

    # Create organization
    org = Organization(
        name=payload.org_name,
        industry=payload.industry_type,
        enabled_sources=["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
        is_setup_complete=False
    )
    db.add(org)
    db.flush()  # get org.id

    # Get/create default role
    role = _get_or_create_default_role(db)

    # Create user
    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        password_hash=_hash_password(payload.password),
        organization_id=org.id,
        role_id=role.id,
        status="Active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(org)



    access_token = create_access_token(user.id, user.email)

    return AuthResponse(
        success=True,
        message="Account created successfully.",
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            status=user.status,
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
            ),
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
    if user.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    org = None
    if user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()

    access_token = create_access_token(user.id, user.email)

    return AuthResponse(
        success=True,
        message="Login successful.",
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            status=user.status,
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

    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        status=user.status,
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
