from __future__ import annotations

import asyncio
import os
from typing import AsyncGenerator, Optional

import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


SYSTEM_DISCLAIMER = (
    "This is not medical advice. Consult a licensed doctor for diagnosis. "
    "Seek urgent care if symptoms are severe or worsening."
)


def _detect_severity(text: str) -> str:
    t = text.lower()
    severe_terms = [
        "chest pain",
        "shortness of breath",
        "blood in stool",
        "blood in vomit",
        "loss of consciousness",
        "stroke",
        "seizure",
        "severe bleeding",
        "fever over 102",
        "102°",
        "102f",
        "uncontrolled",
    ]
    moderate_terms = ["high fever", "persistent vomiting", "severe headache", "dehydration", "worsening"]
    if any(term in t for term in severe_terms):
        return "severe"
    if any(term in t for term in moderate_terms):
        return "moderate"
    return "mild"


def _build_prompt(user_message: str) -> str:
    return (
        "You are MediBot, an empathetic medical triage assistant. Given the user's symptoms, provide:\n"
        "1) Possible mild/common causes\n"
        "2) Practical home remedies and self-care\n"
        "3) Over-the-counter (non-prescription) suggestions when appropriate\n"
        "4) Red-flag warning signs to watch for\n"
        f"5) A clear disclaimer: {SYSTEM_DISCLAIMER}\n\n"
        "Write concisely in markdown with headings and bullet points. Avoid diagnosing definitively.\n\n"
        f"User symptoms:\n{user_message.strip()}\n"
    )


async def _stream_gemini(user_message: str) -> AsyncGenerator[str, None]:
    # Use OpenAI-compatible response from Gemini via google-generativeai if available
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(model_name=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
        prompt = _build_prompt(user_message)
        stream = model.generate_content(prompt, stream=True)
        for chunk in stream:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text
            await asyncio.sleep(0)  # allow cooperative multitasking
        return
    except Exception:
        # Fall back further below
        pass
    # If google.generativeai not available or error occurred, fall through to OpenRouter
    async for c in _stream_openrouter(user_message):
        yield c


async def _stream_openrouter(user_message: str) -> AsyncGenerator[str, None]:
    # Minimal OpenRouter streaming
    if not OPENROUTER_API_KEY:
        # No keys at all -> use local simple generator
        async for c in _local_rule_based(user_message):
            yield c
        return

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free"),
        "messages": [
            {"role": "system", "content": "You are MediBot, an empathetic medical triage assistant."},
            {"role": "user", "content": _build_prompt(user_message)},
        ],
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", "https://openrouter.ai/api/v1/chat/completions", json=body, headers=headers) as r:
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


async def _local_rule_based(user_message: str) -> AsyncGenerator[str, None]:
    # Deterministic, dependency-free fallback with sections
    severity = _detect_severity(user_message)
    sections = [
        "# Overview\n",
        "Based on your description, here are possible considerations and next steps.\n\n",
        "## Possible Mild Causes\n",
        "- Viral upper respiratory infection (common cold)\n- Seasonal allergies\n- Mild gastritis or indigestion\n\n",
        "## Home Remedies\n",
        "- Rest, fluids, and balanced meals\n- Warm salt-water gargles for sore throat\n- Humidifier and nasal saline rinse if congested\n\n",
        "## Over-the-Counter Options\n",
        "- Acetaminophen or ibuprofen for pain/fever (as labeled)\n- Antacids for mild indigestion\n- Antihistamines if allergies suspected\n\n",
        "## Warning Signs\n",
        "- Worsening pain, high fever, dehydration, chest pain, or breathing trouble\n\n",
        f"> Disclaimer: {SYSTEM_DISCLAIMER}\n\n",
    ]
    # Stream piece by piece
    for sec in sections:
        yield sec
        await asyncio.sleep(0)


async def stream_response(user_message: str) -> AsyncGenerator[str, None]:
    if GEMINI_API_KEY:
        async for chunk in _stream_gemini(user_message):
            yield chunk
        return
    async for chunk in _stream_openrouter(user_message):
        yield chunk


def detect_severity(user_message: str, assistant_text: Optional[str] = None) -> str:
    # Combine signals for severity
    candidates = " ".join(filter(None, [user_message, assistant_text or ""]))
    return _detect_severity(candidates)


