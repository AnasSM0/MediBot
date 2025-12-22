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

# Import API monitoring (optional, graceful degradation if not available)
try:
    from api_monitor import log_api_call
except ImportError:
    # Fallback if monitoring is not available
    def log_api_call(*args, **kwargs):
        pass

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


from fastapi import UploadFile, File, Form
from services.vision import analyze_image

@router.post("/chat/image")
async def chat_image(
    file: UploadFile = File(...),
    message: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    auth: AuthUser = AuthDependency,
    db: AsyncSession = Depends(get_db)
):
    user_id = auth["sub"]
    
    # Validate file
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are supported.")
    
    # 1. Analyze Image
    image_context = await analyze_image(file)
    
    # 2. Construct Augmented Message
    user_text = message.strip() if message else "Analyze this image."
    augmented_message = (
        f"[User Uploaded Image]\n"
        f"Image Analysis & OCR:\n{image_context}\n\n"
        f"User Question:\n{user_text}"
    )
    
    # 3. Reuse existing chat logic (mostly)
    # Ensure user exists
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(id=user_id, email=auth.get("email") or f"{user_id}@placeholder.local", name=auth.get("name"))
        db.add(user)
        await db.flush()

    # Create or load session
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
        chat_session.title = (user_text[:60] + "…") if len(user_text) > 60 else user_text

    # Save user message (We save the augmented one so context is preserved for history)
    # Or we could save the original and a system message. 
    # For simplicity and effectiveness in RAG/History, saving the augmented one is better for the LLM context in future turns.
    # However, for UI it might look ugly. 
    # Let's save the augmented message but maybe we can clean it up in UI if needed.
    # Actually, let's just save it. The user will see "Image Analysis & OCR: ..." which is actually helpful transparency.
    user_message_entry = Message(session_id=session_id, role="user", content=augmented_message)
    db.add(user_message_entry)
    await db.flush()
    await db.commit()

    # Stream assistant response
    async def done_payload():
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
        # We stream response based on the augmented message
        # Log that we're using reasoning on image data
        log_api_call("openrouter", "/chat/image", "reasoning", success=True, metadata={"has_image_context": True})
        async for chunk in stream_response(augmented_message):
            collected.append(chunk)
            yield {"type": "chunk", "content": chunk}
        full_text = "".join(collected).strip()
        final_severity = detect_severity(user_text, full_text) # Detect severity based on user's actual text + response
        assistant = Message(session_id=session_id, role="assistant", content=full_text)
        db.add(assistant)
        await db.flush()
        assistant_message_id = assistant.id
        await db.commit()
        yield await done_payload()

    async def sse_stream():
        async for event in generator():
            from utils.sse import format_sse
            yield format_sse(event)

    return StreamingResponse(sse_stream(), media_type="text/event-stream")
