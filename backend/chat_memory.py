# chat_memory_db.py
from sqlalchemy.orm import Session
from backendmodels import ChatHistory

def add_message(db: Session, session_id: str, role: str, message: str):
    new_message = ChatHistory(session_id=session_id, role=role, message=message)
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message

def get_recent_messages(db: Session, session_id: str, limit: int = 20):
    return (
        db.query(ChatHistory)
        .filter(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.timestamp.desc())
        .limit(limit)
        .all()[::-1]  # reverse to chronological order
    )

def clear_session_history(db: Session, session_id: str):
    db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
    db.commit()
