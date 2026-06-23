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
            h = hashlib.md5(email.lower().encode()).hexdigest()
            user_uuid = uuid.UUID(h)
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

def get_current_user(
    payload: dict = Depends(verify_token),
    x_copilot_mode: str = Header(default="beginner")
) -> dict:
    payload["copilot_mode"] = x_copilot_mode
    return payload

def create_access_token(user_id: str, email: str, role: str = "authenticated") -> str:
    payload = {
        "sub": str(user_id),
        "id": str(user_id),
        "email": email,
        "role": role,
        "user_metadata": {
            "role": "Compliance Officer"
        }
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

