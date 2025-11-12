from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ChatSession, Message
from utils.auth import AuthDependency, AuthUser
from services.ai import detect_severity

router = APIRouter()


@router.get("/history")
async def list_history(auth: AuthUser = AuthDependency, db: AsyncSession = Depends(get_db)):
    user_id = auth["sub"]
    result = await db.execute(select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()))
    sessions = result.scalars().all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]


@router.get("/history/{session_id}")
async def get_session(session_id: str, auth: AuthUser = AuthDependency, db: AsyncSession = Depends(get_db)):
    user_id = auth["sub"]
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id))
    session: Optional[ChatSession] = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load messages
    messages_result = await db.execute(select(Message).where(Message.session_id == session_id).order_by(Message.created_at.asc()))
    messages = messages_result.scalars().all()
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "structured": {"severity": detect_severity("", m.content)} if m.role == "assistant" else None,
            }
            for m in messages
        ],
    }


