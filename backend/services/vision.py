import os
import base64
import json
import httpx
import google.generativeai as genai
from fastapi import UploadFile, HTTPException

# Import API monitoring (optional, graceful degradation if not available)
try:
    from api_monitor import log_api_call
except ImportError:
    # Fallback if monitoring is not available
    def log_api_call(*args, **kwargs):
        pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Vision analysis prompt (shared between Gemini and OpenRouter)
VISION_PROMPT = """
You are a MEDICAL-SAFE vision analysis layer.
OBJECTIVE:
Extract OCR and medical context from the image.

IMAGE TYPES SUPPORTED:
- Pharmacy receipts
- Doctor prescriptions
- Medicine packaging
- Visible symptoms (skin, swelling, rashes)
- Lab reports (basic)

STRICT RULES:
- DO NOT provide diagnosis
- DO NOT prescribe medication or dosages
- DO NOT guess missing text
- If image quality is insufficient, explicitly say so
- If emergency indicators are visible, flag them but do not panic the user

OUTPUT MUST BE STRUCTURED EXACTLY AS JSON:
{
  "ocr_text": "verbatim extracted text",
  "detected_items": {
    "medicines": [
      {
        "name": "",
        "strength": "",
        "frequency": "",
        "notes": ""
      }
    ],
    "dates": [],
    "doctor_names": [],
    "hospital_or_pharmacy": ""
  },
  "visual_medical_observations": [
    "objective visual observations only"
  ],
  "uncertainty_flags": [
    "blurred text",
    "partial image",
    "unclear dosage",
    "insufficient_quality"
  ],
  "safety_flags": [
    "possible prescription",
    "possible skin condition",
    "possible medication interaction risk"
  ]
}

INTERPRETATION GUIDELINES:
- OCR text must be literal and unmodified
- Visual observations must be descriptive, not diagnostic
- Safety flags should be conservative
- If unsure, add uncertainty_flags instead of guessing
- If image quality is insufficient to extract data, return the JSON with "ocr_text": "Unreadable", "uncertainty_flags": ["insufficient_quality"] and empty lists for other fields.
"""

async def _analyze_with_gemini(content: bytes, mime_type: str) -> str:
    """Analyze image using Gemini Vision API."""
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not set")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    image_part = {
        "mime_type": mime_type or "image/jpeg",
        "data": content
    }
    
    response = await model.generate_content_async(
        [VISION_PROMPT, image_part],
        generation_config={"response_mime_type": "application/json"}
    )
    
    log_api_call("gemini", "/chat/image", "vision", success=True, metadata={"model": "gemini-1.5-flash"})
    return response.text

async def _analyze_with_openrouter(content: bytes, mime_type: str) -> str:
    """Fallback: Analyze image using OpenRouter's Gemma vision model."""
    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY is not set")
    
    # Encode image to base64
    base64_image = base64.b64encode(content).decode('utf-8')
    image_url = f"data:{mime_type or 'image/jpeg'};base64,{base64_image}"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    
    body = {
        "model": "google/gemma-2-9b-it:free",  # Free vision-capable model
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": VISION_PROMPT
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ],
        "response_format": {"type": "json_object"}
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=body,
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        log_api_call("openrouter", "/chat/image", "vision", success=True, metadata={"model": "google/gemma-2-9b-it:free"})
        return content

async def analyze_image(file: UploadFile) -> str:
    """
    Analyze image using Gemini Vision (primary) or OpenRouter Gemma (fallback).
    
    Priority:
    1. Gemini 1.5 Flash (best for vision)
    2. OpenRouter Gemma (fallback if Gemini unavailable)
    """
    try:
        content = await file.read()
        mime_type = file.content_type or "image/jpeg"
        
        # Try Gemini first (primary vision provider)
        if GEMINI_API_KEY:
            try:
                result = await _analyze_with_gemini(content, mime_type)
                await file.seek(0)  # Reset file pointer
                return result
            except Exception as gemini_error:
                print(f"⚠️ Gemini vision failed: {gemini_error}")
                log_api_call("gemini", "/chat/image", "vision", success=False, error=str(gemini_error))
                # Continue to fallback
        
        # Fallback to OpenRouter Gemma
        if OPENROUTER_API_KEY:
            try:
                print("ℹ️ Using OpenRouter Gemma fallback for vision analysis")
                result = await _analyze_with_openrouter(content, mime_type)
                await file.seek(0)  # Reset file pointer
                return result
            except Exception as openrouter_error:
                print(f"❌ OpenRouter vision failed: {openrouter_error}")
                log_api_call("openrouter", "/chat/image", "vision", success=False, error=str(openrouter_error))
                raise HTTPException(
                    status_code=500,
                    detail=f"Both vision providers failed. Gemini: {gemini_error if GEMINI_API_KEY else 'Not configured'}. OpenRouter: {openrouter_error}"
                )
        
        # No API keys available
        raise HTTPException(
            status_code=500,
            detail="No vision API keys configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error in vision analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")
