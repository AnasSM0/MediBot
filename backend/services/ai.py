from __future__ import annotations

import asyncio
import os
import csv
import httpx
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session
from models import ChatHistory
from services.normal_mode import generate_normal_response
from services.doctor_mode import generate_doctor_response
from services.deep_research_mode import generate_deep_research_response

# Import API monitoring
try:
    from api_monitor import log_api_call
except ImportError:
    def log_api_call(*args, **kwargs):
        pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

SYSTEM_DISCLAIMER = (
    "This is not medical advice. Consult a licensed doctor for diagnosis. "
    "Seek urgent care if symptoms are severe or worsening."
)

SYSTEM_PROMPT_NORMAL = (
    "You are MediBot, an empathetic medical triage assistant.\n"
    "INSTRUCTIONS:\n"
    "1. **General Conversation**: Respond naturally to greetings. DO NOT provide medical advice for greetings.\n"
    "2. **Medical Queries**: Provide concise, safe advice for common conditions.\n"
    "   - Focus on practical self-care and home remedies.\n"
    "   - Mention Over-the-counter (OTC) options if appropriate.\n"
    "   - Identify red-flag warning signs.\n"
    "   - Disclaimer: This is not medical advice. Consult a doctor.\n"
    "3. Maintain a helpful, calm tone."
)

SYSTEM_PROMPT_DOCTOR = (
    "You are MediBot in **DOCTOR MODE**.\n"
    "INSTRUCTIONS:\n"
    "1. Provide detailed, structured, technical medical analysis.\n"
    "2. Use appropriate medical terminology and clinical reasoning.\n"
    "3. Discuss differential possibilities and physiological mechanisms.\n"
    "4. Explicitly state uncertainty and limitations.\n"
    "5. **CRITICAL**: DO NOT provide a definitive diagnosis or prescription. You are an AI assistant helping a user understand complex medical concepts.\n"
    "6. Include a section on 'Clinical Considerations' where appropriate."
)

SYSTEM_PROMPT_DEEP_RESEARCH = (
    "You are MediBot in **DEEP RESEARCH MODE**.\n"
    "INSTRUCTIONS:\n"
    "1. Provide LONG-FORM, comprehensive responses.\n"
    "2. Cite specific medical concepts, guidelines, or study types (e.g., 'recent 2020-2026 guidelines suggest...').\n"
    "3. Structure with clear headings: Abstract, Current Evidence, Methodological Considerations, Conclusions.\n"
    "4. State assumptions and data limitations clearly.\n"
    "5. Focus on academic and scientific accuracy."
)

def _load_local_dataset(path: str = "dataset.csv") -> list[dict[str, str]]:
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

def _match_symptoms(user_message: str) -> str:
    if not DATASET:
        return ""
    user_symptoms = {w.strip().lower() for w in user_message.replace(",", " ").split()}
    scored = []
    for entry in DATASET:
        match_count = sum(1 for s in entry["symptoms"] if any(s in word for word in user_symptoms))
        if match_count > 0:
            scored.append((entry["disease"], match_count, entry["symptoms"]))

    if not scored:
        return ""

    scored.sort(key=lambda x: x[1], reverse=True)
    top_matches = scored[:5]

    text = "### Local Dataset Analysis (Reference Only)\n\n"
    for disease, score, symptoms in top_matches:
        text += f"**{disease}** — {score} matching symptoms\n"
        text += f"- Common Symptoms: {', '.join(symptoms[:6])}\n\n"
    return text

def _detect_severity(text: str) -> str:
    t = text.lower()
    
    # CRITICAL: Hard rules overriding everything
    critical_terms = [
        "chest pain", "left arm pain", "loss of consciousness", "fainted", 
        "unknown ingestion", "poisoning", "child poisoning", "swallowed battery",
        "difficulty breathing", "severe bleeding", "stroke", "seizure", "heart attack",
        "911", "emergency room", "call ambulance"
    ]
    if any(term in t for term in critical_terms):
        return "CRITICAL"

    # MODERATE rules
    moderate_terms = [
        "high fever", "persistent vomiting", "severe headache", "dehydration", 
        "worsening", "infection", "fracture", "deep cut", "moderate pain",
        "102°", "102f", "blood in"
    ]
    if any(term in t for term in moderate_terms):
        return "MODERATE"
        
    return "MILD" # Default

def detect_severity(user_message: str, assistant_text: Optional[str] = None) -> str:
    # 1. Try to extract from assistant text if explicit header exists
    if assistant_text:
        import re
        match = re.search(r"Detected Severity:\s*(MILD|MODERATE|CRITICAL)", assistant_text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
            
    # 2. Fallback to analysis
    candidates = " ".join(filter(None, [user_message, assistant_text or ""]))
    return _detect_severity(candidates)

# ... inside stream_response ...


def _build_prompt(user_message: str, mode: str = "normal") -> str:
    dataset_context = _match_symptoms(user_message)
    system_instruction = SYSTEM_PROMPT_NORMAL
    if mode == "doctor":
        system_instruction = SYSTEM_PROMPT_DOCTOR
    elif mode == "deep_research":
        system_instruction = SYSTEM_PROMPT_DEEP_RESEARCH

    return (
        f"{system_instruction}\n\n"
        f"DISCLAIMER: {SYSTEM_DISCLAIMER}\n\n"
        f"### User Input:\n{user_message.strip()}\n\n"
        f"{dataset_context}\n"
    )

def _get_gemini_model(mode: str) -> str:
    if mode == "deep_research":
        return "deep-research-pro-preview"
    if mode == "doctor":
        return "gemini-3-pro-preview"
    return "gemini-3-flash-preview"

async def _stream_gemini(user_message: str, history: list[dict] = [], mode: str = "normal", raw_prompt: bool = False) -> AsyncGenerator[str, None]:
    if not GEMINI_API_KEY:
         return
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        
        target_model = _get_gemini_model(mode)
        print(f"🧠 Using Gemini Model: {target_model} (Mode: {mode})")
        
        model = genai.GenerativeModel(model_name=target_model)

        context_str = ""
        for msg in history:
            role = "User" if msg["role"] == "user" else "Model"
            context_str += f"{role}: {msg['content']}\n"
        
        if raw_prompt:
            full_prompt = (
                f"{user_message}\n"
                f"### Conversation History:\n{context_str}\n" 
                f"### Current Reply:"
            )
        else:
            full_prompt = (
                f"{_build_prompt(user_message, mode)}\n"
                f"### Conversation History:\n{context_str}\n" 
                f"### Current User Input:\n{user_message}"
            )

        stream = await model.generate_content_async(full_prompt, stream=True)
        log_api_call("gemini", "/chat", "text", success=True, metadata={"model": target_model, "mode": mode})
        async for chunk in stream:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"❌ Gemini Error ({target_model}): {e}")
        log_api_call("gemini", "/chat", "text", success=False, error=str(e))
        raise e 

# Missing fallback implementations added for safety
async def _stream_openrouter(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    yield "OpenRouter fallback is not fully configured."

async def _local_rule_based(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    # Use _match_symptoms logic
    symptoms_text = _match_symptoms(user_message)
    if symptoms_text:
        yield f"Based on keyword matching:\n{symptoms_text}\n\n(No AI connectivity available)"
    else:
        yield "System is currently offline and no local matches found."

async def stream_response(user_message: str, history: list[dict] = [], mode: str = "normal") -> AsyncGenerator[str, None]:
    """
    Main entry point for chat. Routes to specific mode handlers.
    """
    
    # Wrapper for AI service to allow mode handlers to use it
    async def ai_service_wrapper(prompt: str, hist: list, mode: str):
        # 1. Deterministic Severity Check (Pre-Generation)
        # We need the original user message for accurate severity detection, 
        # but 'prompt' here is the FULL prompt which might contain system instructions.
        # Ideally we pass user_message separately or extract it.
        # However, 'user_message' is available in the outer scope of stream_response!
        
        calculated_severity = _detect_severity(user_message)
        header = f"Detected Severity: {calculated_severity}\n\n"
        yield header

        # Prefer Gemini
        if GEMINI_API_KEY:
            try:
                # We use raw_prompt=True because the mode handlers construct the full prompt
                async for chunk in _stream_gemini(prompt, hist, mode, raw_prompt=True):
                    yield chunk
                return
            except Exception as e:
                print(f"Gemini failed, falling back: {e}")
        
        # Fallback to OpenRouter
        if OPENROUTER_API_KEY:
            try:
                async for chunk in _stream_openrouter(prompt, hist):
                    yield chunk
                return
            except Exception as e:
                print(f"OpenRouter failed: {e}")

        # Fallback to local rule based
        async for chunk in _local_rule_based(prompt, hist):
            yield chunk

    # Route based on mode
    print(f"Routing request to mode: {mode}")
    if mode == "doctor":
        async for chunk in generate_doctor_response(user_message, ai_service_wrapper, history):
            yield chunk
    elif mode == "deep_research":
        async for chunk in generate_deep_research_response(user_message, ai_service_wrapper, history):
            yield chunk
    else:
        # Default to Normal Mode
        async for chunk in generate_normal_response(user_message, ai_service_wrapper, history):
             yield chunk

# detect_severity moved up


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
        .all()[::-1]
    )

def clear_session_history(db: Session, session_id: str):
    db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
    db.commit()

async def stream_llm_direct(prompt: str, history: list[dict] = [], mode: str = "normal") -> AsyncGenerator[str, None]:
    """
    Stream response directly from LLM using a raw prompt.
    Used by the RAG pipeline.
    """
    # Check keys
    if GEMINI_API_KEY:
        try:
            async for chunk in _stream_gemini(prompt, history, mode=mode, raw_prompt=True):
                yield chunk
            return
        except Exception as e:
            print(f"Gemini failed in direct stream: {e}")
            
    # Fallback
    if OPENROUTER_API_KEY:
         async for chunk in _stream_openrouter(prompt, history):
            yield chunk

