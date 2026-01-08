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

# Debug: Log which API keys are available
print(f"🔑 Vision API Keys Status:")
print(f"  - GEMINI_API_KEY: {'✅ SET' if GEMINI_API_KEY else '❌ NOT SET'}")
print(f"  - OPENROUTER_API_KEY: {'✅ SET' if OPENROUTER_API_KEY else '❌ NOT SET'}")
if GEMINI_API_KEY:
    print(f"  - Gemini Key Preview: {GEMINI_API_KEY[:20]}...")
if OPENROUTER_API_KEY:
    print(f"  - OpenRouter Key Preview: {OPENROUTER_API_KEY[:20]}...")


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

async def _analyze_with_gemini(content: bytes, mime_type: str, user_message: str = "") -> str:
    """Analyze image using Gemini Vision API."""
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not set")
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Select Model based on complexity/intent
        msg_lower = user_message.lower() if user_message else ""
        
        # "Doctor Mode" / Complex -> Pro
        target_model = "gemini-3-flash-preview"
        if any(k in msg_lower for k in ["complex", "blurry", "scan", "mri", "x-ray", "detailed", "doctor", "hard to read"]):
            target_model = "gemini-3-pro-preview"
            
        print(f"👁️ Using Gemini Vision Model: {target_model}")
        model = genai.GenerativeModel(target_model)
        
        image_part = {
            "mime_type": mime_type or "image/jpeg",
            "data": content
        }
        
        response = await model.generate_content_async(
            [VISION_PROMPT, image_part],
            generation_config={"response_mime_type": "application/json"}
        )
        
        log_api_call("gemini", "/chat/image", "vision", success=True, metadata={"model": target_model})
        print(f"✅ Gemini vision analysis successful")
        return response.text
    except Exception as e:
        print(f"⚠️ Gemini vision error details: {type(e).__name__}: {str(e)}")
        raise

async def _analyze_with_openrouter(content: bytes, mime_type: str) -> str:
    """Fallback: Analyze image using OpenRouter's vision-capable model."""
    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY is not set")
    
    # Encode image to base64
    base64_image = base64.b64encode(content).decode('utf-8')
    image_url = f"data:{mime_type or 'image/jpeg'};base64,{base64_image}"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",  # Required by OpenRouter
        "X-Title": "MediBot",  # Optional but recommended
    }
    
    # Use Gemma 3 27B which supports vision (multimodal)
    body = {
        "model": "google/gemma-3-27b-it:free",  # Free multimodal model with vision support
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
        ]
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=body,
                headers=headers
            )
            
            # Log the response for debugging
            print(f"📡 OpenRouter Response Status: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                print(f"❌ OpenRouter Error Response: {error_text}")
                response.raise_for_status()
            
            result = response.json()
            
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            log_api_call("openrouter", "/chat/image", "vision", success=True, metadata={"model": "google/gemma-3-27b-it:free"})
            print(f"✅ OpenRouter vision analysis successful")
            return content
    except httpx.HTTPStatusError as e:
        print(f"❌ OpenRouter HTTP Error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        print(f"❌ OpenRouter Unexpected Error: {type(e).__name__}: {str(e)}")
        raise

async def analyze_image(file: UploadFile, user_message: str = "") -> str:
    """
    Analyze image using Gemini Vision (primary) or OpenRouter Gemma (fallback).
    
    Priority:
    1. Gemini 3 Flash/Pro (best for vision)
    2. OpenRouter Gemma (fallback if Gemini unavailable)
    """
    try:
        content = await file.read()
        mime_type = file.content_type or "image/jpeg"
        
        # Try Gemini first (primary vision provider)
        if GEMINI_API_KEY:
            try:
                result = await _analyze_with_gemini(content, mime_type, user_message)
                await file.seek(0)  # Reset file pointer
                return result
            except Exception as gemini_error:
                print(f"⚠️ Gemini vision failed: {gemini_error}")
                log_api_call("gemini", "/chat/image", "vision", success=False, error=str(gemini_error))
                # Continue to fallback
        
        # Fallback to OpenRouter Gemma 3 27B (multimodal with vision)
        if OPENROUTER_API_KEY:
            try:
                print("ℹ️ Using OpenRouter Gemma 3 27B fallback for vision analysis")
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
