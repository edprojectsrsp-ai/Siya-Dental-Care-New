from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def hash_pin(pin: str) -> str: return pwd_context.hash(pin)
def verify_pin(plain: str, hashed: str) -> bool: return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def create_rx_pdf_token(rx_id: str, expires_days: int = 30) -> str:
    return create_access_token(
        {"sub": str(rx_id), "scope": "rx_pdf"},
        expires_delta=timedelta(days=expires_days),
    )

def verify_rx_pdf_token(token: str, rx_id: str) -> bool:
    try:
        payload = decode_token(token)
        return payload.get("scope") == "rx_pdf" and str(payload.get("sub")) == str(rx_id)
    except HTTPException:
        return False

async def get_current_staff(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    return {"staff_id": payload.get("sub"), "clinic_id": payload.get("clinic_id"), "role": payload.get("role"), "name": payload.get("name")}

def require_role(*roles):
    async def checker(staff=Depends(get_current_staff)):
        if staff["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Requires: {', '.join(roles)}")
        return staff
    return checker
