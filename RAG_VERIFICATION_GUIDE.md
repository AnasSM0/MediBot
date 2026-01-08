# RAG & FAISS Verification Guide

## 🔍 How to Verify Your RAG Pipeline

### 1. Enable RAG Debugging

Add this to your `.env` file:
```bash
DEBUG_RAG=true
```

### 2. Verify FAISS Index Exists

Check if your FAISS index files are present:
```bash
# Should see these files:
backend/faiss_indexes/medical_index.faiss
backend/faiss_indexes/medical_metadata.json
```

### 3. Test FAISS Search Directly

Run this Python script to test FAISS:

```python
# test_faiss.py
import sys
sys.path.append('backend')

from services.faiss_search import get_search_service

# Initialize service
service = get_search_service()

# Test query
query = "What are the symptoms of diabetes?"
results = service.search(query, top_k=5)

print(f"\n🔍 Query: {query}")
print(f"📊 Found {len(results)} results\n")

for i, result in enumerate(results, 1):
    print(f"Result {i}:")
    print(f"  Score: {result['score']:.4f}")
    print(f"  Source: {result['metadata'].get('source', 'Unknown')}")
    print(f"  Text: {result['text'][:200]}...")
    print()
```

### 4. Monitor RAG in Real-Time

#### A. Check Backend Logs
When `DEBUG_RAG=true`, you'll see:
- Retrieved chunks count
- Similarity scores
- Final prompt length
- Source documents used

#### B. Use the Debug Endpoint
After sending a message, call:
```bash
GET http://localhost:8000/debug/rag
```

Response shows:
```json
{
  "mode": "normal",
  "last_prompt": "Full prompt sent to Gemini...",
  "retrieved_chunks": [
    {
      "text": "Medical knowledge chunk...",
      "source": "medical_textbook.pdf",
      "score": 0.89,
      "metadata": {...}
    }
  ]
}
```

#### C. Frontend RAG Inspector
Your frontend already has `<RAGInspector>` component!
- It displays retrieved chunks in the UI
- Shows similarity scores
- Displays source documents

### 5. Verify Prompt Quality

#### Check what's sent to Gemini:

1. **Enable DEBUG_RAG=true**
2. **Send a test message**: "What are symptoms of diabetes?"
3. **Check logs** for:
   ```
   RAG_DEBUG: Prompt built (2847 chars).
   ```
4. **Call debug endpoint**:
   ```bash
   curl http://localhost:8000/debug/rag
   ```
5. **Inspect `last_prompt`** field - this is EXACTLY what Gemini receives

### 6. Accuracy Testing Checklist

#### ✅ FAISS is Working If:
- [ ] Index files exist in `backend/faiss_indexes/`
- [ ] Backend logs show: "Loaded X vectors from FAISS index"
- [ ] Debug endpoint returns retrieved chunks
- [ ] Chunks have similarity scores > 0.7
- [ ] Source metadata is present

#### ✅ RAG is Working If:
- [ ] Retrieved chunks appear in debug output
- [ ] Final prompt includes context from chunks
- [ ] Bot responses reference medical knowledge
- [ ] Responses are more detailed than without RAG

#### ✅ Chatbot is Accurate If:
- [ ] Responses cite medical sources
- [ ] Severity detection works (mild/moderate/severe)
- [ ] Responses avoid making diagnoses
- [ ] Medical terminology is correct
- [ ] Responses match retrieved knowledge

### 7. Common Issues & Fixes

#### Issue: No chunks retrieved
**Fix**: 
- Rebuild FAISS index: `python backend/services/faiss_builder.py`
- Check if index files exist
- Verify embedding model is working

#### Issue: Low similarity scores (< 0.5)
**Fix**:
- Query might be too vague
- Index might need more diverse data
- Try "doctor" or "deep_research" mode

#### Issue: Responses don't use RAG context
**Fix**:
- Check if `final_prompt` includes chunks
- Verify prompt template in `backend/rag/prompt_builder.py`
- Ensure mode is not "normal" (normal mode uses cache, not RAG)

### 8. Performance Metrics

Monitor these in logs:
```json
{
  "event": "api_call",
  "provider": "gemini",
  "success": true,
  "metadata": {
    "model": "gemini-2.0-flash-exp",
    "mode": "doctor"
  }
}
```

### 9. Quick Verification Commands

```bash
# 1. Check FAISS index size
ls -lh backend/faiss_indexes/

# 2. Test FAISS directly
python test_faiss.py

# 3. Enable debugging
echo "DEBUG_RAG=true" >> .env

# 4. Start backend and watch logs
cd backend
..\venv\Scripts\activate
uvicorn main:app --reload

# 5. Send test message via API
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are diabetes symptoms?", "mode": "doctor"}'

# 6. Check debug output
curl http://localhost:8000/debug/rag
```

### 10. Expected Behavior

**Good RAG Response Example:**
```
User: "What are the symptoms of diabetes?"

Retrieved Chunks: 3 chunks, avg score: 0.85
Sources: medical_textbook.pdf, diabetes_guide.pdf

Response: "Based on medical literature, common symptoms of 
diabetes include increased thirst, frequent urination, 
unexplained weight loss, and fatigue. These symptoms occur 
because..."
```

**Bad RAG Response (needs fixing):**
```
Retrieved Chunks: 0 chunks
Response: "I'm not sure about that."
```

## 🎯 Recommended Testing Flow

1. **Enable DEBUG_RAG=true**
2. **Start backend** with `start.bat`
3. **Open frontend** at http://localhost:3000
4. **Send test message** in "Doctor Mode"
5. **Check RAG Inspector** in UI (shows chunks)
6. **Verify debug endpoint** for full prompt
7. **Compare response** with retrieved chunks

Your system is production-ready if all checks pass! ✅
