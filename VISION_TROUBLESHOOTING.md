# Vision API Troubleshooting Guide

## Current Status

Both Gemini and OpenRouter vision APIs are failing. Let's diagnose and fix this.

## Quick Diagnosis

Run this command to test both APIs:
```cmd
docker exec medibot-backend python test_vision_apis.py
```

This will show you:
- ✅ Which API keys are loaded
- ✅ Which APIs are working
- ❌ Exact error messages for failures

## Changes Made

### 1. Added Debug Logging
- Shows which API keys are loaded at startup
- Shows API key previews (first 20 characters)
- Logs detailed error responses from OpenRouter

### 2. Updated to Gemma 3
- Model: `google/gemma-3-27b-it:free`
- Gemma 3 has vision support (Gemma 2 doesn't)

### 3. Better Error Handling
- Catches and logs HTTP status codes
- Shows full error responses
- Distinguishes between different error types

## Common Issues & Fixes

### Issue 1: API Keys Not Loading

**Symptoms:**
- Logs show "❌ NOT SET" for API keys
- Backend goes straight to fallback

**Fix:**
1. Check `.env` file location: `e:\work\MediBot\.env`
2. Verify keys are uncommented:
   ```env
   GEMINI_API_KEY=AIzaSyCHsTrIBQn-r1ePLvvd1pGYwgArA9KL7gs
   OPENROUTER_API_KEY=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
   ```
3. Rebuild backend:
   ```cmd
   docker-compose up --build -d backend
   ```

### Issue 2: Gemini API Failing

**Possible Causes:**
1. **Invalid API Key** - Key expired or incorrect
2. **Quota Exceeded** - Free tier limit reached
3. **Model Not Available** - `gemini-1.5-flash` not accessible
4. **Network/Firewall** - Blocking Google APIs

**Fix:**
1. Test Gemini key manually:
   ```cmd
   docker exec medibot-backend python -c "import google.generativeai as genai; genai.configure(api_key='YOUR_KEY'); print('OK')"
   ```

2. Try a different model:
   - Change `gemini-1.5-flash` to `gemini-1.5-pro` or `gemini-2.0-flash-exp`

3. Get a new API key:
   - Go to: https://aistudio.google.com/app/apikey
   - Create new key
   - Update `.env` file

### Issue 3: OpenRouter 404 Error

**Symptoms:**
```
❌ OpenRouter vision failed: Client error '404 Not Found'
```

**Possible Causes:**
1. **Wrong Model Name** - Model doesn't exist
2. **Missing Headers** - HTTP-Referer or X-Title missing
3. **Invalid API Key** - Key incorrect or expired
4. **Model Not Available** - Free tier model removed

**Fix:**
1. Verify model exists on OpenRouter:
   - Visit: https://openrouter.ai/models
   - Search for: `google/gemma-3-27b-it:free`
   - Check if it's available

2. Try alternative models:
   ```python
   # In vision.py, line 123:
   "model": "qwen/qwen-2-vl-7b-instruct:free"  # Alternative vision model
   # OR
   "model": "google/gemini-flash-1.5"  # Non-free but reliable
   ```

3. Test OpenRouter manually:
   ```cmd
   curl -X POST https://openrouter.ai/api/v1/chat/completions \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"google/gemma-3-27b-it:free","messages":[{"role":"user","content":"test"}]}'
   ```

### Issue 4: Both APIs Failing

**If both fail, try this:**

1. **Use a different OpenRouter model** (non-vision as last resort):
   ```python
   # Fallback to text-only analysis
   "model": "meta-llama/llama-3.2-3b-instruct:free"
   ```

2. **Disable vision temporarily**:
   - Comment out image upload feature
   - Or return a placeholder response

3. **Check network connectivity**:
   ```cmd
   docker exec medibot-backend ping -c 3 google.com
   docker exec medibot-backend ping -c 3 openrouter.ai
   ```

## Testing Steps

### Step 1: Check API Keys
```cmd
docker exec medibot-backend python -c "import os; print('GEMINI:', bool(os.getenv('GEMINI_API_KEY'))); print('OPENROUTER:', bool(os.getenv('OPENROUTER_API_KEY')))"
```

### Step 2: Run Diagnostic Test
```cmd
docker exec medibot-backend python test_vision_apis.py
```

### Step 3: Check Startup Logs
```cmd
docker-compose logs backend | findstr "Vision API Keys"
```

You should see:
```
🔑 Vision API Keys Status:
  - GEMINI_API_KEY: ✅ SET
  - OPENROUTER_API_KEY: ✅ SET
  - Gemini Key Preview: AIzaSyCHsTrIBQn-r1e...
  - OpenRouter Key Preview: sk-or-v1-5d6f4546e50...
```

### Step 4: Test Image Upload
1. Upload a test image
2. Check logs for detailed error:
   ```cmd
   docker-compose logs backend --tail 50
   ```

## Alternative Solutions

### Option A: Use Only Gemini (No Fallback)
If OpenRouter keeps failing, just use Gemini:
1. Make sure `GEMINI_API_KEY` is set
2. Remove OpenRouter fallback logic
3. Return error if Gemini fails

### Option B: Use Only OpenRouter
If Gemini keeps failing:
1. Remove Gemini primary logic
2. Use OpenRouter as primary
3. Try different models if one fails

### Option C: Disable Vision Feature
If nothing works:
1. Return a message: "Image analysis temporarily unavailable"
2. Still accept text messages
3. Fix vision APIs later

## Files Modified
- `backend/services/vision.py` - Added debug logging and error handling
- `backend/test_vision_apis.py` - New diagnostic script

## Next Steps

1. **Rebuild backend** to load new code:
   ```cmd
   docker-compose up --build -d backend
   ```

2. **Check startup logs** for API key status:
   ```cmd
   docker-compose logs backend | findstr "Vision API"
   ```

3. **Run diagnostic test**:
   ```cmd
   docker exec medibot-backend python test_vision_apis.py
   ```

4. **Try uploading an image** and check detailed error logs

5. **Based on the error**, apply the appropriate fix from above

## Expected Output (When Working)

```
🔑 Vision API Keys Status:
  - GEMINI_API_KEY: ✅ SET
  - OPENROUTER_API_KEY: ✅ SET

[Image upload attempt]
✅ Gemini vision analysis successful
```

OR (if Gemini fails):

```
⚠️ Gemini vision error details: [error details]
ℹ️ Using OpenRouter Gemma 3 27B fallback for vision analysis
📡 OpenRouter Response Status: 200
✅ OpenRouter vision analysis successful
```
