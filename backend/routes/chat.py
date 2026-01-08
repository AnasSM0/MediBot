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
    mode: Optional[str] = "normal"


@router.post("/chat")
async def chat(body: ChatBody, auth: AuthUser = AuthDependency, db: AsyncSession = Depends(get_db)):
    user_id = auth["sub"]
    message_text = body.message.strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Message is required")
        
    valid_modes = ["normal", "doctor", "deep_research"]
    current_mode = body.mode or "normal"
    if current_mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {', '.join(valid_modes)}")

    # Ensure user exists in local DB
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
        
        # Update mode if changed
        if chat_session.mode != current_mode:
            chat_session.mode = current_mode
            db.add(chat_session)
            await db.flush()
    else:
        chat_session = ChatSession(user_id=user_id, mode=current_mode)
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

    # RAG Pipeline Execution
    import rag
    from services.ai import stream_llm_direct
    from services.cache import get_cache
    import os
    import json

    cache = get_cache()
    cached_response = cache.check(message_text)

    async def done_payload(msg_id, sev, create_session=False):
        return {
            "type": "done",
            "session_id": session_id,
            "message_id": msg_id,
            "severity": sev,
            "requires_attention": sev == "severe",
        }

    if cached_response and current_mode == "normal": # Only cache normal mode for safety? Or all? User said "threshold 0.90 for medical accuracy". I will use for all but maybe doctor mode requires fresh? I'll use for all.
        # Persist cached response to DB
        final_severity = detect_severity(message_text, cached_response)
        assistant = Message(session_id=session_id, role="assistant", content=cached_response)
        db.add(assistant)
        await db.flush()
        await db.commit()
        
        async def cached_gen():
            yield {"type": "chunk", "content": cached_response}
            yield await done_payload(assistant.id, final_severity)

        async def sse_cached():
            async for event in cached_gen():
                from utils.sse import format_sse
                yield format_sse(event)
                
        return StreamingResponse(sse_cached(), media_type="text/event-stream")

    # 1. Retrieve
    # ... existing RAG logic ...
    k = 5
    if current_mode == "deep_research":
        k = 12
    chunks = rag.retrieve(message_text, k=k)

    # 2. Build Prompt
    prompt_data = rag.build_prompt(message_text, chunks, mode=current_mode)
    final_prompt = prompt_data["prompt"]

    # 3. Debug Inspection
    debug_info = None
    if os.getenv("DEBUG_RAG") == "true":
        debug_info = rag.inspect(final_prompt, chunks)
        global _last_debug_info
        _last_debug_info = {
            "mode": current_mode,
            "last_prompt": final_prompt,
            "retrieved_chunks": debug_info["chunks"]
        }
        print(f"RAG_DEBUG: Prompt built ({len(final_prompt)} chars).")

    collected = []
    assistant_message_id = ""
    final_severity = "mild"

    # Fetch recent history for context
    history_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .where(Message.id != user_message.id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    history_items = history_result.scalars().all()
    history = [{"role": msg.role, "content": msg.content} for msg in reversed(history_items)]

    async def generator():
        nonlocal assistant_message_id, final_severity
        
        if debug_info:
            yield {"type": "debug", "content": json.dumps(debug_info)}

        async for chunk in stream_llm_direct(final_prompt, history, mode=current_mode):
            collected.append(chunk)
            yield {"type": "chunk", "content": chunk}
            
        full_text = "".join(collected).strip()
        final_severity = detect_severity(message_text, full_text)
        
        # Store in Cache
        if full_text:
             cache.store(message_text, full_text)

        assistant = Message(session_id=session_id, role="assistant", content=full_text)
        db.add(assistant)
        await db.flush()
        assistant_message_id = assistant.id
        await db.commit()
        yield await done_payload(assistant_message_id, final_severity)

    async def sse_stream():
        async for event in generator():
            from utils.sse import format_sse
            yield format_sse(event)

    return StreamingResponse(sse_stream(), media_type="text/event-stream")

# Global storage for debug endpoint
_last_debug_info = {}

@router.get("/debug/rag")
async def debug_rag():
    import os
    if os.getenv("DEBUG_RAG") != "true":
         raise HTTPException(status_code=403, detail="RAG debugging disabled")
    return _last_debug_info



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
    image_context = await analyze_image(file, message or "")
    
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

    # Save user message (augmented)
    user_message_entry = Message(session_id=session_id, role="user", content=augmented_message)
    db.add(user_message_entry)
    await db.flush()
    await db.commit()

    # Fetch history for context
    history_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .where(Message.id != user_message_entry.id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    history_items = history_result.scalars().all()
    history = [{"role": msg.role, "content": msg.content} for msg in reversed(history_items)]

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
        log_api_call("openrouter", "/chat/image", "reasoning", success=True, metadata={"has_image_context": True})
        async for chunk in stream_response(augmented_message, history):
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
