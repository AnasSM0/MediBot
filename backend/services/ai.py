from __future__ import annotations

import asyncio
import os
import csv
import httpx
import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session
from models import ChatHistory

# Mode handlers imported lazily to avoid circular dependencies
# from services.normal_mode import generate_normal_response
# from services.doctor_mode import generate_doctor_response
# from services.deep_research_mode import generate_deep_research_response

# Configure logger
logger = logging.getLogger(__name__)

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

def _load_local_dataset(path: str = None) -> list[dict[str, str]]:
    # Use dynamic path resolution
    if path is None:
        # Get the directory where this file is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Navigate to backend directory (parent of services)
        backend_dir = os.path.dirname(current_dir)
        # Path to dataset.csv in DataSets folder
        path = os.path.join(backend_dir, "DataSets", "dataset.csv")
    
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
        # Cardiac / circulatory emergencies
        "chest pain", "severe chest pain", "crushing chest pain", "pressure in chest",
        "left arm pain", "right arm pain", "jaw pain", "neck pain radiating",
        "chest feels heavy", "pain goes down my left arm", "heavy chest",
        "heart attack", "myocardial infarction",
        "sudden collapse", "cardiac arrest",
        "irregular heartbeat with dizziness",
        "rapid heartbeat with chest pain",

        # Neurological emergencies
        "loss of consciousness", "unconscious", "fainted", "passed out",
        "sudden confusion", "unable to speak", "slurred speech",
        "face drooping", "one sided weakness",
        "stroke", "brain attack", "mini stroke", "tia",
        "seizure", "active seizure", "multiple seizures",
        "first seizure", "status epilepticus",
        "severe head injury", "head trauma with vomiting",
    "unequal pupils",

    # Respiratory failure
    "difficulty breathing", "trouble breathing",
    "cannot breathe", "gasping for air",
    "severe shortness of breath",
    "blue lips", "blue fingertips",
    "choking", "airway obstruction",
    "asthma attack not responding",
    "respiratory failure",

    # Severe bleeding & trauma
    "severe bleeding", "uncontrolled bleeding",
    "bleeding that won't stop",
    "internal bleeding",
    "vomiting blood", "coughing blood",
    "blood loss", "hemorrhage",
    "gunshot wound", "stab wound",
    "major trauma", "polytrauma",
    "open fracture", "bone protruding",
    "amputation",

    # Poisoning & ingestion
    "poisoning", "suspected poisoning",
    "unknown ingestion", "toxic ingestion",
    "child poisoning", "overdose",
    "drug overdose", "opioid overdose",
    "swallowed battery", "button battery",
    "swallowed magnet", "multiple magnets",
    "ingested chemicals", "cleaning chemicals",
    "carbon monoxide exposure",
    "gas poisoning",

    # Pediatric emergencies
    "child not breathing",
    "unresponsive child",
    "baby stopped breathing",
    "high fever seizure child",
    "blue baby",
    "sudden infant collapse",

    # Allergic / anaphylaxis
    "anaphylaxis", "severe allergic reaction",
    "throat closing", "swollen throat",
    "tongue swelling", "lip swelling with breathing difficulty",
    "hives with breathing trouble",

    # Infection / sepsis
    "sepsis", "septic shock",
    "high fever with confusion",
    "fever with stiff neck",
    "fever and rash",
    "fever and low blood pressure",

    # Obstetric emergencies
    "severe vaginal bleeding",
    "bleeding during pregnancy",
    "ectopic pregnancy",
    "severe abdominal pain pregnancy",
    "pregnancy collapse",

    # Extreme pain signals
    "worst headache of my life",
    "sudden severe headache",
    "tearing chest pain",
    "tearing back pain",

    # Emergency intent keywords
    "911", "call 911", "call ambulance",
    "emergency room", "go to er",
    "urgent emergency", "life threatening",
    "help now", "need help immediately",

    # Other life-threatening states
    "shock", "circulatory shock",
    "very low blood pressure",
    "unresponsive", "not waking up",
    "coma",
    "heat stroke",
    "hypothermia",
    "electrocution",
    "near drowning",
    "drowning"
    ]

    if any(term in t for term in critical_terms):
        return "CRITICAL"

    # MODERATE rules
    moderate_terms = [
    # Fever & infection
    "high fever", "persistent fever", "fever for 3 days", "fever not responding",
    "102°", "102f", "103°", "103f", "chills", "night sweats",
    "infection", "bacterial infection", "viral infection", "worsening infection",
    "localized infection", "pus", "swelling with redness", "warm to touch",

    # Gastrointestinal
    "persistent vomiting", "frequent vomiting", "vomiting blood",
    "blood in vomit", "blood in stool", "black stools", "severe diarrhea",
    "diarrhea for days", "abdominal pain", "moderate abdominal pain",
    "cramping pain", "severe nausea", "loss of appetite",
    "dehydration", "dry mouth", "sunken eyes", "dark urine",
    "reduced urination", "unable to keep fluids",
    "ate a weird", "ate a berry", "ate unknown", "weird berry",

    # Head & neurological
    "severe headache", "persistent headache", "sudden headache",
    "head injury", "concussion symptoms", "confusion",
    "dizziness", "vertigo",
    "blurred vision", "double vision",
    "fainting", "near fainting",
    "memory issues", "difficulty concentrating",

    # Pain (general)
    "moderate pain", "persistent pain", "worsening pain",
    "pain not improving", "pain lasting days",
    "sharp pain", "throbbing pain", "burning pain",

    # Chest & breathing
    "chest pain", "tightness in chest", "shortness of breath",
    "difficulty breathing", "wheezing", "persistent cough",
    "coughing blood", "pain when breathing",
    "rapid breathing", "labored breathing",

    # Musculoskeletal & injuries
    "fracture", "possible fracture", "bone pain",
    "deep cut", "deep wound", "bleeding that won't stop",
    "significant bleeding", "large bruise",
    "joint swelling", "limited movement",
    "sprain", "ligament injury",
    "severe back pain", "neck pain after injury",

    # Cardiovascular
    "rapid heartbeat", "irregular heartbeat",
    "palpitations", "elevated blood pressure",
    "low blood pressure", "lightheaded on standing",

    # Urinary & reproductive
    "blood in urine", "painful urination",
    "burning urination", "frequent urination",
    "lower back pain with fever",
    "pelvic pain", "abnormal bleeding",

    # Skin & allergic
    "widespread rash", "rapidly spreading rash",
    "infected wound", "skin ulcer",
    "swelling of face", "swelling of lips",
    "moderate allergic reaction", "hives",

    # General red flags
    "symptoms worsening", "not improving",
    "persistent symptoms", "symptoms lasting more than a week",
    "significant weakness", "fatigue with fever",
    "unexplained weight loss"
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
        logger.info(f"Using Gemini Model: {target_model} (Mode: {mode})", extra={"model": target_model, "mode": mode})
        
        model = genai.GenerativeModel(model_name=target_model)

        # Build the prompt
        if raw_prompt:
            # user_message is already a complete prompt (used by RAG/mode handlers)
            full_prompt = user_message
        else:
            # Build prompt with system instructions
            full_prompt = _build_prompt(user_message, mode)
        
        # Add history if provided
        if history:
            # Format history for Gemini
            conversation = []
            for msg in history:
                conversation.append({"role": msg.get("role", "user"), "parts": [msg.get("content", "")]})
            conversation.append({"role": "user", "parts": [full_prompt]})
            full_prompt = conversation

        stream = await model.generate_content_async(full_prompt, stream=True)
        log_api_call("gemini", "/chat", "text", success=True, metadata={"model": target_model, "mode": mode})
        async for chunk in stream:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text
    except Exception as e:
        logger.error(f"Gemini Error ({target_model}): {e}", exc_info=True)
        log_api_call("gemini", "/chat", "text", success=False, error=str(e))
        raise e 

# OpenRouter fallback implementation
async def _stream_openrouter(user_message: str, history: list[dict] = []) -> AsyncGenerator[str, None]:
    """Stream response from OpenRouter API as fallback."""
    if not OPENROUTER_API_KEY:
        yield "OpenRouter API key not configured."
        return
        
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Build messages array
            messages = []
            
            # Add history
            for msg in history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            # Add current message
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            # DEBUG: Print message structure to check context
            print(f"DEBUG: OpenRouter Prompt History Length: {len(history)}")
            if len(history) > 0:
                print(f"DEBUG: Last History Item: {str(history[-1])[:100]}...")

            
            # Make streaming request to OpenRouter
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://medibot.app",
                    "X-Title": "MediBot"
                },
                json={
                    "model": "meta-llama/llama-3.3-70b-instruct",  # Fast, reliable Llama 3.3
                    "messages": messages,
                    "stream": True
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                error_msg = f"OpenRouter API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Stream the response
            async for line in response.aiter_lines():
                if not line:
                    continue
                    
                if line.startswith("data:"):
                    data = line[5:].strip() # Remove "data:" and whitespace
                    
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data)
                        if "choices" in chunk and len(chunk["choices"]) > 0:
                            delta = chunk["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            # Some models (like DeepSeek R1) might put content in 'reasoning_content' or similar
                            # We'll just stick to standard content for now to be safe
                            
                            if content:
                                print(f"DEBUG: Yielding chunk: {content[:20]}...")
                                yield content
                    except json.JSONDecodeError:
                        print(f"DEBUG: JSON Parse Error: {data}")
                        continue
                else:
                    # Keep-alive lines or errors
                    pass
            
            log_api_call("openrouter", "/chat", "text", success=True, metadata={"model": "deepseek-r1"})
            
    except Exception as e:
        logger.error(f"OpenRouter streaming error: {e}", exc_info=True)
        log_api_call("openrouter", "/chat", "text", success=False, error=str(e))
        raise  # Re-raise to trigger fallback to local rules



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

    # Route based on mode (lazy imports to avoid circular dependencies)
    print(f"Routing request to mode: {mode}")
    if mode == "doctor":
        from services.doctor_mode import generate_doctor_response
        async for chunk in generate_doctor_response(user_message, ai_service_wrapper, history):
            yield chunk
    elif mode == "deep_research":
        from services.deep_research_mode import generate_deep_research_response
        async for chunk in generate_deep_research_response(user_message, ai_service_wrapper, history):
            yield chunk
    else:
        # Default to Normal Mode
        from services.normal_mode import generate_normal_response
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
    # Try Gemini first
    if GEMINI_API_KEY:
        try:
            print(f"DEBUG: Attempting Gemini stream... Mode={mode}")
            async for chunk in _stream_gemini(prompt, history, mode=mode, raw_prompt=True):
                print(f"DEBUG: Gemini Chunk: {chunk[:20]}..." if chunk else "DEBUG: Empty Chunk")
                yield chunk
            return
        except Exception as e:
            print(f"Gemini failed in direct stream: {e}")
            logger.warning(f"Gemini failed, attempting fallback to OpenRouter: {e}")
            
    # Fallback to OpenRouter
    if OPENROUTER_API_KEY:
        try:
            print("DEBUG: Attempting OpenRouter fallback...")
            async for chunk in _stream_openrouter(prompt, history):
                print(f"DEBUG: OpenRouter Chunk: {chunk[:20]}..." if chunk else "DEBUG: Empty OR Chunk")
                yield chunk
            return
        except Exception as e:
            print(f"OpenRouter failed in direct stream: {e}")
            logger.warning(f"OpenRouter failed, using local fallback: {e}")
    
    # Final fallback to local rule-based
    async for chunk in _local_rule_based(prompt, history):
        yield chunk


