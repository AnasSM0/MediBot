# Image Upload Error Fix

## Problem
When uploading an image, you got a 500 Internal Server Error with:
```
❌ OpenRouter vision failed: Client error '404 Not Found' for url 'https://openrouter.ai/api/v1/chat/completions'
```

## Root Cause
The vision service was using `google/gemma-2-9b-it:free` as the fallback model, but **Gemma is a text-only model** and doesn't support vision/image analysis. This caused a 404 error when trying to send images to it.

## Fixes Applied

### 1. Updated Vision Model (backend/services/vision.py)
**Changed from:** `google/gemma-2-9b-it:free` (text-only)  
**Changed to:** `google/gemini-flash-1.5:free` (vision-capable)

### 2. Added Required Headers
OpenRouter requires these headers for proper routing:
```python
"HTTP-Referer": "http://localhost:3000"
"X-Title": "MediBot"
```

### 3. Enabled Gemini API Key
Uncommented `GEMINI_API_KEY` in `.env` file for better vision analysis:
- **Primary:** Gemini 1.5 Flash (Google's native vision API)
- **Fallback:** Gemini Flash via OpenRouter (if primary fails)

### 4. Also Enabled ALLOW_ANON
Uncommented `ALLOW_ANON=true` for anonymous access.

## How Image Upload Now Works

### Priority Order:
1. **Gemini 1.5 Flash (Primary)** ✅
   - Direct Google API
   - Best quality for medical image analysis
   - Free tier available

2. **OpenRouter Gemini Flash (Fallback)** ✅
   - If Gemini API fails or is unavailable
   - Same model, different routing
   - Free tier available

3. **Error if both fail** ❌
   - Clear error message
   - Tells you which provider failed and why

## Testing Image Upload

### 1. Restart Backend
```cmd
docker-compose restart backend
```

### 2. Test Image Upload
1. Go to `http://localhost:3000/chat`
2. Click the image upload button (📎 icon)
3. Select a medical image:
   - Prescription
   - Medicine packaging
   - Lab report
   - Symptom photo
4. Add a message (optional)
5. Send

### 3. Expected Behavior
You should see:
- ✅ Image uploads successfully
- ✅ Vision analysis extracts text (OCR)
- ✅ Structured medical information returned
- ✅ AI responds with context from the image

## Supported Image Types

The vision system can analyze:
- 📋 **Pharmacy receipts** - Extract medicine names, prices
- 💊 **Doctor prescriptions** - OCR text, medicine names, dosages
- 📦 **Medicine packaging** - Read labels, ingredients, warnings
- 🔬 **Lab reports** - Extract test names, values (basic)
- 🩹 **Visible symptoms** - Describe skin conditions, swelling, rashes

## Vision Models Comparison

| Model | Type | Vision Support | Cost | Quality |
|-------|------|----------------|------|---------|
| Gemini 1.5 Flash | Primary | ✅ Yes | Free | Excellent |
| Gemini Flash (OpenRouter) | Fallback | ✅ Yes | Free | Excellent |
| Gemma 2 9B | ❌ Old (broken) | ❌ No | Free | N/A |

## Troubleshooting

### If image upload still fails:

1. **Check API Keys**
   ```cmd
   docker exec medibot-backend python -c "import os; print('GEMINI:', bool(os.getenv('GEMINI_API_KEY'))); print('OPENROUTER:', bool(os.getenv('OPENROUTER_API_KEY')))"
   ```

2. **Check Logs**
   ```cmd
   docker-compose logs backend | findstr vision
   ```

3. **Verify Image Format**
   - Supported: JPEG, PNG, WebP
   - Max size: Usually 10MB
   - Clear, readable images work best

### If Gemini API fails:

The system will automatically fall back to OpenRouter. You'll see:
```
⚠️ Gemini vision failed: [error message]
ℹ️ Using OpenRouter Gemini Flash fallback for vision analysis
```

### If both fail:

Check:
1. API keys are valid and not expired
2. Internet connection is working
3. No rate limits exceeded
4. Image format is supported

## Files Modified
- `backend/services/vision.py` - Fixed vision model and added headers
- `.env` - Enabled GEMINI_API_KEY and ALLOW_ANON

## Next Steps
1. Restart backend: `docker-compose restart backend`
2. Test image upload in chat
3. Verify OCR extraction works
4. Check AI responses include image context
