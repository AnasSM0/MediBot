from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ChatSession, Message, User
from services.ai import stream_response, detect_severity
from utils.auth import AuthDependency, AuthUser
from utils.sse import stream_chunks

router = APIRouter()


class ChatBody(BaseModel):
    message: str
    session_id: Optional[str] = None


@router.post("/chat")
async def chat(body: ChatBody, auth: AuthUser = AuthDependency, db: AsyncSession = Depends(get_db)):
    user_id = auth["sub"]
    message_text = body.message.strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Message is required")

    # Ensure user exists in local DB (NextAuth owns canonical users; we mirror minimal info)
    user: Optional[User] = None
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(id=user_id, email=auth.get("email") or f"{user_id}@placeholder.local", name=auth.get("name"))
        db.add(user)
        await db.flush()

    # Create or load session
    session_id = body.session_id
    chat_session: Optional[ChatSession] = None
    if session_id:
        session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id))
        chat_session = session_result.scalar_one_or_none()
        if not chat_session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        chat_session = ChatSession(user_id=user_id)
        db.add(chat_session)
        await db.flush()
        session_id = chat_session.id

    # Title from first user message
    if not chat_session.title:
        chat_session.title = (message_text[:60] + "…") if len(message_text) > 60 else message_text

    # Save user message
    user_message = Message(session_id=session_id, role="user", content=message_text)
    db.add(user_message)
    await db.flush()
    await db.commit()

    # Stream assistant response and persist at the end
    async def done_payload():
        # The outer scope will mutate these after streaming ends
        return {
            "type": "done",
            "session_id": session_id,
            "message_id": assistant_message_id or "",
            "severity": final_severity or "mild",
            "requires_attention": final_severity == "severe",
        }

    collected = []
    assistant_message_id = ""
    final_severity = "mild"

    async def generator():
        nonlocal assistant_message_id, final_severity
        async for chunk in stream_response(message_text):
            collected.append(chunk)
            yield {"type": "chunk", "content": chunk}
        full_text = "".join(collected).strip()
        final_severity = detect_severity(message_text, full_text)
        assistant = Message(session_id=session_id, role="assistant", content=full_text)
        db.add(assistant)
        await db.flush()
        assistant_message_id = assistant.id
        await db.commit()
        yield {
            "type": "done",
            "session_id": session_id,
            "message_id": assistant_message_id,
            "severity": final_severity,
            "requires_attention": final_severity == "severe",
        }

    async def sse_stream():
        async for event in generator():
            from utils.sse import format_sse

            yield format_sse(event)  # type: ignore[arg-type]

    return StreamingResponse(sse_stream(), media_type="text/event-stream")


