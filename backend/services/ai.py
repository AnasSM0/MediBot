from __future__ import annotations

import asyncio
import os
import csv
import httpx
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session
from models import ChatHistory

# Import API monitoring (optional, graceful degradation if not available)
try:
    from api_monitor import log_api_call
except ImportError:
    # Fallback if monitoring is not available
    def log_api_call(*args, **kwargs):
        pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

SYSTEM_DISCLAIMER = (
    "This is not medical advice. Consult a licensed doctor for diagnosis. "
    "Seek urgent care if symptoms are severe or worsening."
)

# ==========================================
# 🔹 Load and Process Local Disease Dataset
# ==========================================

def _load_local_dataset(path: str = "dataset.csv") -> list[dict[str, str]]:
    """Load dataset with columns: Disease, Symptom_1 ... Symptom_17."""
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        data = []
        for row in reader:
            symptoms = [
                row[col].strip().lower()
                for col in row.keys()
                if col.lower().startswith("symptom") and row[col].strip()
            ]
            data.append({"disease": row["Disease"].strip(), "symptoms": symptoms})
        return data

DATASET = _load_local_dataset()

# ==========================================
# 🔹 Matching Logic
# ==========================================

def _match_symptoms(user_message: str) -> str:
    """Find top-matching diseases based on user symptoms."""
    if not DATASET:
        return ""  # Return empty string instead of error message

    user_symptoms = {w.strip().lower() for w in user_message.replace(",", " ").split()}

    scored = []
    for entry in DATASET:
        match_count = sum(1 for s in entry["symptoms"] if any(s in word for word in user_symptoms))
        if match_count > 0:
            scored.append((entry["disease"], match_count, entry["symptoms"]))

    if not scored:
        return ""

    # Sort by most matches
    scored.sort(key=lambda x: x[1], reverse=True)
    top_matches = scored[:5]

    text = "### Local Dataset Analysis\n\n"
    for disease, score, symptoms in top_matches:
        text += f"**{disease}** — {score} matching symptoms\n"
        text += f"- Common Symptoms: {', '.join(symptoms[:6])}\n\n"
    return text

# ==========================================
# 🔹 Severity Detection Logic
# ==========================================

def _detect_severity(text: str) -> str:
    t = text.lower()
    severe_terms = [
        "chest pain", "shortness of breath", "blood in stool", "blood in vomit",
        "loss of consciousness", "stroke", "seizure", "severe bleeding",
        "fever over 102", "102°", "102f", "uncontrolled"
    ]
    moderate_terms = ["high fever", "persistent vomiting", "severe headache", "dehydration", "worsening"]
    if any(term in t for term in severe_terms):
        return "severe"
    if any(term in t for term in moderate_terms):
        return "moderate"
    return "mild"

# ==========================================
# 🔹 Prompt Builder (LLM + Dataset)
# ==========================================

def _build_prompt(user_message: str) -> str:
    dataset_context = _match_symptoms(user_message)

    return (
        "You are MediBot, an empathetic medical triage assistant.\n\n"
        "INSTRUCTIONS:\n"
        "1. **General Conversation**: If the user says 'hello', 'hi', 'yo', 'wassup', asks who you are, or makes small talk, respond naturally and briefly. Introduce yourself as MediBot if asked. DO NOT provide medical advice for greetings.\n"
        "2. **Medical Queries**: If the user describes symptoms, asks about medication, or provides an image analysis, follow this structure:\n"
        "   - Most likely mild/common conditions (avoid diagnosing with certainty)\n"
        "   - Practical self-care and home remedies\n"
        "   - Over-the-counter (OTC) options if appropriate\n"
        "   - Red-flag warning signs that require medical attention\n"
        f"   - Disclaimer: {SYSTEM_DISCLAIMER}\n\n"
        "Format medical answers in markdown with short sections and bullet points.\n\n"
        f"### User Input:\n{user_message.strip()}\n\n"
        f"{dataset_context}\n"
    )

# ==========================================
# 🔹 Gemini Streaming
# ==========================================

async def _stream_gemini(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(model_name=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))

        # Format history for Gemini (stateless mode usually, or explicit chat inputs)
        # We will concatenate for simplicity since we use generate_content
        context_str = ""
        for msg in history:
            role = "User" if msg["role"] == "user" else "Model"
            context_str += f"{role}: {msg['content']}\n"
        
        full_prompt = (
            f"{_build_prompt(user_message)}\n"
            f"### Conversation History:\n{context_str}\n" 
            f"### Current User Input:\n{user_message}"
        )
        # Note: _build_prompt includes instructions and dataset context. 
        # Ideally we refactor _build_prompt, but appending works for now.

        stream = model.generate_content(full_prompt, stream=True)
        log_api_call("gemini", "/chat", "text", success=True, metadata={"model": os.getenv("GEMINI_MODEL", "gemini-1.5-flash")})
        for chunk in stream:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text
            await asyncio.sleep(0)
    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        log_api_call("gemini", "/chat", "text", success=False, error=str(e))
        yield f"Error: Unable to process request with Gemini. {str(e)}"

# ==========================================
# 🔹 OpenRouter Streaming
# ==========================================

async def _stream_openrouter(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    if not OPENROUTER_API_KEY:
        async for c in _local_rule_based(user_message):
            yield c
        return

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Analyze symptoms for the current message
    dataset_context = _match_symptoms(user_message)
    
    # Build System Prompt
    system_prompt = (
        "You are MediBot, an empathetic medical triage assistant.\n"
        "Follow these instructions:\n"
        "1. Prioritize patient safety. Identify urgent symptoms immediately.\n"
        "2. Provide home care advice for mild conditions.\n"
        "3. Disclaimer: Not a doctor. Verify with a professional.\n"
        f"{SYSTEM_DISCLAIMER}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Add History
    # Ensure alternate user/assistant roles if possible, but OpenRouter handles it reasonably well
    messages.extend(history)
    
    # Add Current Message with Context
    final_user_content = f"{user_message}\n\n{dataset_context if dataset_context else ''}"
    messages.append({"role": "user", "content": final_user_content})

    body = {
        "model": os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free"),
        "messages": messages,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", "https://openrouter.ai/api/v1/chat/completions", json=body, headers=headers) as r:
                log_api_call("openrouter", "/chat", "text", success=True, metadata={"model": os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free")})
                async for line in r.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line.replace("data:", "").strip()
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        obj = json.loads(data)
                        delta = obj.get("choices", [{}])[0].get("delta", {}).get("content")
                        if delta:
                            yield delta
                    except Exception:
                        continue
    except Exception as e:
        log_api_call("openrouter", "/chat", "text", success=False, error=str(e))
        yield f"Error: Unable to process request with OpenRouter. {str(e)}"

# ==========================================
# 🔹 Local Rule-Based Fallback
# ==========================================

async def _local_rule_based(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    log_api_call("local", "/chat", "text", success=True, metadata={"fallback": True})
    
    # Detect greetings and identity questions
    msg_lower = user_message.lower()
    greeting_keywords = ["hello", "hi", "hey", "yo", "wassup", "sup", "who are you", "name", "model", "what are you"]
    
    if any(keyword in msg_lower for keyword in greeting_keywords):
        text = "Hey! I'm MediBot, your medical triage assistant. I'm here to help answer health-related questions. How can I assist you today?"
        for chunk in text.split():
            yield chunk + " "
            await asyncio.sleep(0)
        return

    severity = _detect_severity(user_message)
    dataset_context = _match_symptoms(user_message)

    if dataset_context:
        text = (
            f"# Overview\n\n"
            f"{dataset_context}\n"
            f"## General Advice\n"
            f"- Stay hydrated, rest well, and monitor your symptoms.\n"
            f"- Over-the-counter pain relievers may help for mild discomfort.\n"
            f"- Avoid self-medicating antibiotics.\n\n"
            f"> Disclaimer: {SYSTEM_DISCLAIMER}\n"
        )
    else:
        text = (
            "I'm currently running in offline mode. "
            "I can help with general health questions if you describe your symptoms. "
            "For urgent medical issues, please consult a healthcare professional immediately."
        )

    for chunk in text.split():
        yield chunk + " "
        await asyncio.sleep(0)

# ==========================================
# 🔹 Entry Point
# ==========================================

async def stream_response(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    # Prefer OpenRouter for text reasoning to conserve Gemini API requests
    # Gemini should primarily be used only for vision tasks (in vision.py)
    if OPENROUTER_API_KEY:
        async for chunk in _stream_openrouter(user_message, history):
            yield chunk
        return
    # Fallback to Gemini only if OpenRouter is unavailable
    if GEMINI_API_KEY:
        async for chunk in _stream_gemini(user_message, history):
            yield chunk
        return
    # Last resort: local rule-based system
    async for chunk in _local_rule_based(user_message, history):
        yield chunk

def detect_severity(user_message: str, assistant_text: Optional[str] = None) -> str:
    candidates = " ".join(filter(None, [user_message, assistant_text or ""]))
    return _detect_severity(candidates)



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