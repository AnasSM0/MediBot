from typing import List, Dict, Any
from .retriever import RetrievedChunk

def inspect(prompt: str, chunks: List[RetrievedChunk]) -> Dict[str, Any]:
    """
    Returns inspection data for RAG debugging.
    """
    chunk_data = []
    for c in chunks:
        chunk_data.append({
            "source": c.source,
            "score": c.score,
            "preview": c.text[:300] if c.text else ""
        })
        
    return {
        "prompt": prompt,
        "chunks": chunk_data
    }
