from fastapi import APIRouter
from utils.auth import AuthDependency, AuthUser

router = APIRouter()


@router.get("/verify")
async def verify(auth: AuthUser = AuthDependency):
    return {"ok": True, "user": {"id": auth.get("sub"), "email": auth.get("email"), "name": auth.get("name")}}


