import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    
    # Bypass for frontend demo session (mock-access-token)
    if settings.ALLOW_MOCK_AUTH:
        if token == "mock-access-token":
            import uuid
            demo_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
            return {
                "sub": demo_uuid,
                "id": demo_uuid,
                "email": "demo@safebank.com",
                "role": "authenticated",
                "user_metadata": {
                    "name": "Aarav Mehta",
                    "role": "Compliance Officer"
                }
            }
            
        if token.startswith("mock-access-token:"):
            email = token.split(":", 1)[1]
            import uuid
            import hashlib
            from app.core.database import SessionLocal
            from app.models.models import User
            
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == email.lower()).first()
                if user:
                    user_uuid = user.id
                else:
                    h = hashlib.md5(email.lower().encode()).hexdigest()
                    user_uuid = uuid.UUID(h)
            finally:
                db.close()
                
            return {
                "sub": user_uuid,
                "id": user_uuid,
                "email": email,
                "role": "authenticated",
                "user_metadata": {
                    "name": email.split("@")[0].capitalize(),
                    "role": "Compliance Officer"
                }
            }
        
    try:
        # Supabase JWTs are typically HS256 signed with the project JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        import uuid
        # Standardize sub/id keys
        if "sub" in payload and "id" not in payload:
            payload["id"] = payload["sub"]
        
        # Convert IDs to UUID objects to be compatible with database models
        if "id" in payload:
            try:
                payload["id"] = uuid.UUID(str(payload["id"]))
            except ValueError:
                pass
        if "sub" in payload:
            try:
                payload["sub"] = uuid.UUID(str(payload["sub"]))
            except ValueError:
                pass
        return payload
    except jwt.PyJWTError as e:
        try:
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token signature verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

from fastapi import Header
from app.core.database import SessionLocal
from app.models.models import User, Role, Map

def get_current_user(
    payload: dict = Depends(verify_token),
    x_copilot_mode: str = Header(default="beginner")
) -> dict:
    payload["copilot_mode"] = x_copilot_mode
    
    # Enrich from database
    db = SessionLocal()
    try:
        user_id = payload.get("id")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                payload["user_type"] = user.user_type
                payload["department"] = user.department
                payload["organization_id"] = user.organization_id
                payload["status"] = user.status
                payload["full_name"] = user.full_name
                if user.role_id:
                    role_obj = db.query(Role).filter(Role.id == user.role_id).first()
                    payload["role_name"] = role_obj.name if role_obj else None
                else:
                    payload["role_name"] = None
            else:
                payload["user_type"] = "admin"
                payload["department"] = None
                payload["organization_id"] = None
                payload["status"] = "Active"
                payload["role_name"] = "AI Compliance Officer"
        else:
            payload["user_type"] = "admin"
            payload["department"] = None
            payload["organization_id"] = None
            payload["status"] = "Active"
            payload["role_name"] = "AI Compliance Officer"
    except Exception:
        # Fallback values in case of DB errors during startup checks
        payload["user_type"] = "admin"
        payload["department"] = None
        payload["organization_id"] = None
        payload["status"] = "Active"
        payload["role_name"] = "AI Compliance Officer"
    finally:
        db.close()
        
    return payload

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: AI Compliance Officer role required."
        )
    return current_user

def require_dept_officer_scope(map_id, current_user: dict, db):
    if current_user.get("user_type") == "department_officer":
        map_task = db.query(Map).filter(Map.id == map_id).first()
        if not map_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MAP not found."
            )
        if map_task.assigned_department != current_user.get("department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: MAP belongs to a different department."
            )

def create_access_token(user_id: str, email: str, role: str = "authenticated", user_type: str = "admin", department: str = None) -> str:
    payload = {
        "sub": str(user_id),
        "id": str(user_id),
        "email": email,
        "role": role,
        "user_type": user_type,
        "department": department,
        "user_metadata": {
            "role": "Compliance Officer" if user_type == "admin" else "Department Officer"
        }
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

