# MediBot API Usage Quick Reference

## 🎯 Goal: Conserve Gemini API Requests

### Current Configuration (Optimized ✅)

```
┌─────────────────────────────────────────┐
│         API Request Flow                │
├─────────────────────────────────────────┤
│                                         │
│  Text Chat → OpenRouter (Primary)      │
│           → Gemini (Fallback)          │
│           → Local Rules (Last Resort)  │
│                                         │
│  Image Upload → Gemini (Vision Primary)│
│              → Gemma (Vision Fallback) │
│              → OpenRouter (Reasoning)  │
│                                         │
└─────────────────────────────────────────┘
```

## 📊 API Usage Breakdown

### Gemini 1.5 Flash
**Usage**: Vision tasks (primary)
**Endpoints**: `/api/chat/image`
**Frequency**: 1 request per image upload (if available)
**Free Tier**: 1,500 requests/day
**Model**: `gemini-1.5-flash`

### OpenRouter
**Usage**: 
- All text-based reasoning (primary)
- Vision fallback (when Gemini unavailable)
**Endpoints**: 
- `/api/chat` (text reasoning)
- `/api/chat/image` (vision fallback + reasoning phase)
**Frequency**: 1+ requests per message
**Free Tier**: Varies by model
**Models**: 
- Text: `nvidia/nemotron-nano-12b-v2-vl:free`
- Vision: `google/gemma-2-9b-it:free`

## 🔧 Environment Setup

```bash
# .env file
GEMINI_API_KEY=your_gemini_key_here
OPENROUTER_API_KEY=your_openrouter_key_here

# Optional: Override defaults
GEMINI_MODEL=gemini-1.5-flash
OPENROUTER_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
```

**Note**: You can now use ONLY `OPENROUTER_API_KEY` for full functionality (including vision)!

## 📝 Usage Examples

### Text-Only Chat (No Gemini Used)
```bash
POST /api/chat
{
  "message": "I have a headache and fever",
  "session_id": "optional-session-id"
}
```
**API Calls**: 1 OpenRouter request

### Image Upload (Gemini + OpenRouter)
```bash
POST /api/chat/image
FormData:
  - file: prescription.jpg
  - message: "What medications are here?"
  - session_id: "optional-session-id"
```
**API Calls (with Gemini)**: 
- 1 Gemini request (vision analysis)
- 1 OpenRouter request (medical reasoning)

**API Calls (Gemini unavailable)**: 
- 1 OpenRouter request (vision analysis with Gemma)
- 1 OpenRouter request (medical reasoning)

## 📈 Monitoring Usage

### Check Gemini Usage
1. Visit: https://aistudio.google.com/app/apikey
2. View quota: Should show ~1,500 requests/day
3. Monitor: Should only see requests when images are uploaded

### Check OpenRouter Usage
1. Visit: https://openrouter.ai/activity
2. View requests: Should show all text chat requests
3. Monitor: Free tier limits vary by model

## 🚀 Optimization Tips

### 1. Minimize Image Uploads
- Encourage text-based queries when possible
- Implement image caching for repeated queries
- Compress images before upload

### 2. Use Free Tier Models
OpenRouter free options:
- `nvidia/nemotron-nano-12b-v2-vl:free` (recommended)
- `meta-llama/llama-3.2-3b-instruct:free`
- `deepseek/deepseek-r1-distill-llama-70b:free`

### 3. Implement Caching
```python
# Future enhancement: Cache vision results
image_hash = hashlib.md5(image_bytes).hexdigest()
if cached_result := cache.get(image_hash):
    return cached_result
```

## 🐛 Troubleshooting

### "Running out of Gemini requests"
**Check**:
1. Are text chats using Gemini? (They shouldn't)
2. Is `OPENROUTER_API_KEY` set correctly?
3. Review logs for unexpected Gemini calls

**Fix**:
```bash
# Verify environment variables
echo $OPENROUTER_API_KEY
# Should output your key, not empty
```

### "OpenRouter rate limit exceeded"
**Check**:
1. Current model's rate limit
2. Request frequency

**Fix**:
- Switch to different free model
- Implement request queuing
- Add exponential backoff

### "Poor image analysis quality"
**Check**:
1. Image resolution and quality
2. Gemini model version

**Fix**:
```bash
# Try experimental model
GEMINI_MODEL=gemini-2.0-flash-exp
```

## 📁 File Structure

```
backend/
├── services/
│   ├── ai.py           # Text reasoning (OpenRouter primary)
│   └── vision.py       # Image analysis (Gemini only)
├── routes/
│   └── chat.py         # API endpoints
└── .env                # API keys
```

## 🔍 Code Changes Made

### 1. Inverted API Priority (`services/ai.py`)
**Before**:
```python
async def stream_response(user_message: str):
    if GEMINI_API_KEY:
        # Gemini first
    async for chunk in _stream_openrouter(user_message):
        yield chunk
```

**After**:
```python
async def stream_response(user_message: str):
    if OPENROUTER_API_KEY:
        # OpenRouter first ✅
    if GEMINI_API_KEY:
        # Gemini fallback
    # Local rules last resort
```

### 2. Removed Nested Fallback
**Before**: `_stream_gemini` would fallback to OpenRouter on error
**After**: Each function handles its own errors, caller manages fallback chain

## 📊 Expected API Usage Pattern

### Daily Usage (Example)
```
User Activity:
- 50 text chats
- 10 image uploads

API Requests:
- Gemini: 10 requests (20% of daily limit)
- OpenRouter: 60 requests (50 text + 10 image reasoning)

Result: ✅ Well within free tier limits
```

## 🎓 Best Practices

1. **Always set both API keys** for best experience
2. **Monitor usage** weekly via dashboards
3. **Test endpoints** separately to verify routing
4. **Log API calls** for debugging
5. **Implement graceful degradation** (local rules as fallback)

## 📞 Support

For issues or questions:
1. Check workflow: `/hybrid-api-workflow`
2. Review logs: `backend/logs/`
3. Test endpoints: Use curl examples above
4. Verify environment: Check `.env` file

---

**Last Updated**: 2025-12-21
**Workflow Version**: 1.0
