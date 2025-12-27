"""
Quick test script to diagnose vision API issues
Run this inside the backend container to test both APIs
"""
import os
import asyncio
import base64
import httpx
import google.generativeai as genai

# Load API keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print("=" * 60)
print("VISION API DIAGNOSTIC TEST")
print("=" * 60)

# Check API keys
print("\n1. API Keys Status:")
print(f"   GEMINI_API_KEY: {'✅ SET' if GEMINI_API_KEY else '❌ NOT SET'}")
if GEMINI_API_KEY:
    print(f"   Preview: {GEMINI_API_KEY[:20]}...")
print(f"   OPENROUTER_API_KEY: {'✅ SET' if OPENROUTER_API_KEY else '❌ NOT SET'}")
if OPENROUTER_API_KEY:
    print(f"   Preview: {OPENROUTER_API_KEY[:20]}...")

# Create a simple test image (1x1 red pixel PNG)
test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
test_image_bytes = base64.b64decode(test_image_base64)

async def test_gemini():
    """Test Gemini Vision API"""
    print("\n2. Testing Gemini Vision API...")
    if not GEMINI_API_KEY:
        print("   ❌ SKIPPED: No API key")
        return False
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        image_part = {
            "mime_type": "image/png",
            "data": test_image_bytes
        }
        
        response = await model.generate_content_async(
            ["Describe this image briefly.", image_part]
        )
        
        print(f"   ✅ SUCCESS: {response.text[:100]}...")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {type(e).__name__}: {str(e)}")
        return False

async def test_openrouter():
    """Test OpenRouter Vision API"""
    print("\n3. Testing OpenRouter Vision API...")
    if not OPENROUTER_API_KEY:
        print("   ❌ SKIPPED: No API key")
        return False
    
    try:
        image_url = f"data:image/png;base64,{test_image_base64}"
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "MediBot-Test",
        }
        
        body = {
            "model": "google/gemma-3-27b-it:free",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image briefly."},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }
            ]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=body,
                headers=headers
            )
            
            print(f"   📡 Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"   ❌ Error Response: {response.text}")
                return False
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            print(f"   ✅ SUCCESS: {content[:100]}...")
            return True
    except Exception as e:
        print(f"   ❌ FAILED: {type(e).__name__}: {str(e)}")
        return False

async def main():
    gemini_ok = await test_gemini()
    openrouter_ok = await test_openrouter()
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print("=" * 60)
    print(f"Gemini Vision:     {'✅ WORKING' if gemini_ok else '❌ FAILED'}")
    print(f"OpenRouter Vision: {'✅ WORKING' if openrouter_ok else '❌ FAILED'}")
    
    if not gemini_ok and not openrouter_ok:
        print("\n⚠️  BOTH APIs FAILED - Image upload will not work!")
        print("\nTroubleshooting:")
        print("1. Check API keys are valid and not expired")
        print("2. Check internet connectivity")
        print("3. Check for rate limits")
        print("4. Try regenerating API keys")
    elif gemini_ok:
        print("\n✅ Gemini is working - Image upload should work!")
    elif openrouter_ok:
        print("\n✅ OpenRouter is working - Image upload should work (via fallback)!")
    
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
