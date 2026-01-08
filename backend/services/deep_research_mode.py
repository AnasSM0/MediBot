from typing import AsyncGenerator, Dict, List
from services.faiss_search import get_search_service

MEDICAL_DISCLAIMER = """
⚠️ **Academic Disclaimer**: This research summary is compiled from medical literature for educational purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical decisions.
"""

RESEARCH_SYSTEM_PROMPT = """You are MediBot in Deep Research Mode.
INSTRUCTIONS:
1.  **Format**: Provide a Long-form, academic synthesis.
2.  **Structure**:
    *   **Abstract**: Brief summary.
    *   **Detailed Analysis**: Synthesize the evidence from different sources.
    *   **Source-Specific Insights**: Group findings by source (e.g., what MedlinePlus says vs Kaggle QA).
    *   **References**: Cite specific sources (e.g., [Source: MedlinePlus - Diabetes]).
3.  **Citation**: You MUST include inline citations to the provided context.
4.  **Tone**: Professional, objective, and exhaustive.
"""

async def generate_deep_research_response(query: str, ai_service_func, history: list = []) -> AsyncGenerator[str, None]:
    """
    Generate deep research response with extensive FAISS retrieval (top 12).
    """
    search_service = get_search_service()
    try:
        results = search_service.search(query, top_k=12)
    except Exception as e:
        print(f"Error in FAISS search: {e}")
        results = []

    # Group by source for the prompt context
    # (The AI will handle the final grouping in output, but we present it organized)
    grouped_sources: Dict[str, List[str]] = {}
    citations_metadata = []

    if results:
        for res in results:
            source = res['metadata'].get('source', 'Unknown')
            title = res['metadata'].get('title') or res['metadata'].get('name', 'Untitled')
            text = res['text'][:500].replace('\n', ' ')
            
            if source not in grouped_sources:
                grouped_sources[source] = []
            grouped_sources[source].append(f"Title: {title}\nContent: {text}")
            
            citations_metadata.append(f"{source}: {title}")

    # Build Context String
    context_str = ""
    if grouped_sources:
        context_str += "**Retrieved Research Material:**\n"
        for source, texts in grouped_sources.items():
            context_str += f"\n--- Source: {source} ---\n"
            for i, txt in enumerate(texts, 1):
                context_str += f"[{i}] {txt}\n"
    else:
        context_str = "No medical literature found in knowledge base."

    # Build Prompt
    full_prompt = f"""{RESEARCH_SYSTEM_PROMPT}

**Research Query:** {query}

**Research Material:**
{context_str}

**Comprehensive Synthesis:**"""

    # Stream Response
    async for chunk in ai_service_func(full_prompt, history, mode="deep_research"):
        yield chunk

    # Add Disclaimer
    yield f"\n\n{MEDICAL_DISCLAIMER}"

