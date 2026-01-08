from typing import List, Dict, Any
from .retriever import RetrievedChunk

MODE_CONFIG = {
    "normal": {
        "description": "normal",
        "rules": [
            "Provide helpful, concise medical information.",
            "Use layman terms.",
            "Disclaimer: This is not medical advice."
        ]
    },
    "doctor": {
        "description": "Doctor",
        "rules": [
             "Act as a clinical reasoning assistant.",
             "NEVER provide a definitive diagnosis. Use probabilistic language.",
             "Structure: Overview, Possible Causes, When to See a Doctor.",
             "Use medical terminology properly.",
             "Disclaimer: Not a diagnosis."
        ]
    },
    "deep_research": {
        "description": "Deep Research",
        "rules": [
            "Provide a long-form academic synthesis.",
            "Group findings by source.",
            "Include inline citations [Source: ...].",
            "Be exhaustive and objective."
        ]
    }
}

DEFAULT_RULES = [
    "Use ONLY the provided context",
    "If missing info, say 'Not found in knowledge base'"
]

def build_prompt(query: str, chunks: List[RetrievedChunk], mode: str = "normal") -> Dict[str, Any]:
    """
    Builds the final prompt string and returns metadata.
    """
    config = MODE_CONFIG.get(mode, MODE_CONFIG["normal"])
    
    # 1. Build Context String
    context_str = ""
    sources_metadata = []
    
    for chunk in chunks:
        # Format: [Document: SourceName] Content...
        src_name = chunk.source
        context_str += f"[Document: {src_name}]\n{chunk.text}\n\n"
        sources_metadata.append({
            "source": src_name,
            "score": chunk.score
        })

    if not context_str.strip():
        context_str = "No relevant documents found."

    # 2. Build Rules String
    rules_list = DEFAULT_RULES + config["rules"]
    rules_str = "\n".join([f"- {r}" for r in rules_list])

    # 3. Assemble Final Prompt
    prompt = f"""SYSTEM:
You are a medical AI operating in {config['description']} mode.

RULES:
{rules_str}

CONTEXT:
{context_str}

USER:
{query}
"""
    
    return {
        "prompt": prompt,
        "sources": sources_metadata
    }
