from typing import AsyncGenerator
from services.faiss_search import get_search_service

MEDICAL_DISCLAIMER = """
⚠️ **Medical Disclaimer**: This information is provided by a medical AI assistant for educational purposes only. It is NOT a diagnosis. Always consult with a qualified healthcare professional for proper medical evaluation and treatment.
"""

DOCTOR_SYSTEM_PROMPT = """You are MediBot in Doctor Mode.
INSTRUCTIONS:
1.  **Role**: Act as a clinical reasoning assistant.
2.  **Safety**: NEVER provide a definitive diagnosis. Use strict probabilistic language (e.g., "features are consistent with...", "differential diagnosis includes...").
3.  **Structure**: Your response MUST follow this structure exactly:
    *   **Overview**: Clinical summary of the query.
    *   **Possible Causes**: List of potential etiologies based on the context.
    *   **When to See a Doctor**: Clear red flags and urgency indicators.
    *   **Disclaimer**: (I will add this automatically, but you should imply uncertainty).
4.  **Context**: Use the provided FAISS Search Results as evidence.
"""

async def generate_doctor_response(query: str, ai_service_func, history: list = []) -> AsyncGenerator[str, None]:
    """
    Generate doctor mode response with FAISS retrieval (top 5).
    """
    # 1. FAISS Retrieval (Top 5)
    search_service = get_search_service()
    try:
        results = search_service.search(query, top_k=5)
    except Exception as e:
        print(f"Error in FAISS search: {e}")
        results = []

    # 2. Format Context
    context_str = "No medical literature found."
    if results:
        context_str = "**Relevant Medical Literature (FAISS):**\n"
        for i, res in enumerate(results, 1):
            source = res['metadata'].get('source', 'Unknown')
            text = res['text'][:400].replace('\n', ' ')
            context_str += f"{i}. [{source}] {text}\n"

    # 3. Build Prompt
    full_prompt = f"""{DOCTOR_SYSTEM_PROMPT}

**User Query:** {query}

**Evidence Context:**
{context_str}

**Response:**"""

    # 4. Stream Response
    # We pass mode="doctor" to ai_service_func, but we override the prompt here.
    # The ai_service might add its own prompt, but our instructions should take precedence if close to the input.
    async for chunk in ai_service_func(full_prompt, history, mode="doctor"):
        # We can optionally filter chunks to enforce JSON if strictly required, but Markdown is safer for chat.
        yield chunk

    # 5. Add Disclaimer
    yield f"\n\n{MEDICAL_DISCLAIMER}"

