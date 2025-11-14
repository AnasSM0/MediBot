# chat_summarizer.py
from sqlalchemy.orm import Session
from backendmodels import ChatHistory
from datetime import datetime
from .stream_openrouter import stream_openrouter  # your LLM caller
from .chat_memory_db import clear_session_history, add_message

SUMMARY_TRIGGER_COUNT = 25  # summarize after 25 messages (adjust as needed)

async def summarize_chat_if_needed(db: Session, session_id: str):
    # Count how many messages exist
    total_messages = (
        db.query(ChatHistory)
        .filter(ChatHistory.session_id == session_id)
        .count()
    )

    if total_messages < SUMMARY_TRIGGER_COUNT:
        return None  # no summarization needed yet

    # Fetch messages
    messages = (
        db.query(ChatHistory)
        .filter(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.timestamp.asc())
        .all()
    )

    conversation_text = "\n".join(
        [f"{m.role}: {m.message}" for m in messages]
    )

    # Use your LLM to create a compact summary
    summary_prompt = [
        {
            "role": "system",
            "content": "Summarize this chat history briefly while keeping all essential context for continuing the conversation naturally. Preserve important facts, user requests, and AI responses."
        },
        {"role": "user", "content": conversation_text},
    ]

    summary_text = await stream_openrouter(summary_prompt)

    # Clear old chat to keep DB clean
    clear_session_history(db, session_id)

    # Save the summary as the new starting context
    add_message(db, session_id, "system", f"Summary of previous chat:\n{summary_text}")

    print(f"[{datetime.now()}] Chat summarized for session: {session_id}")
    return summary_text
