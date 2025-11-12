import os
from typing import Optional, TypedDict

from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError


class AuthUser(TypedDict, total=False):
    sub: str
    email: Optional[str]
    name: Optional[str]
    provider: Optional[str]


ALGORITHM = "HS256"
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET")
ALLOW_ANON = os.getenv("ALLOW_ANON") == "true"


def _bearer_from_header(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    return authorization.split(" ", 1)[1].strip()


def verify_token(authorization: Optional[str] = Header(None)) -> AuthUser:
    if ALLOW_ANON and not authorization:
        return {
            "sub": "anon-user",
            "email": None,
            "name": "Guest",
            "provider": "anonymous",
        }
    token = _bearer_from_header(authorization)
    if not NEXTAUTH_SECRET:
        raise HTTPException(status_code=500, detail="Server not configured")
    try:
        payload = jwt.decode(token, NEXTAUTH_SECRET, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "sub": sub,
            "email": payload.get("email"),
            "name": payload.get("name"),
            "provider": payload.get("provider"),
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


AuthDependency = Depends(verify_token)


