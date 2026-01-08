import logging
from typing import List, Optional
from dataclasses import dataclass
from services.faiss_search import get_search_service

logger = logging.getLogger("rag_retriever")
# Configure simple console logging if not already configured
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

@dataclass
class RetrievedChunk:
    text: str
    source: str
    score: float
    metadata: dict

def retrieve(query: str, k: int = 5) -> List[RetrievedChunk]:
    """
    Retrieve top_k chunks from FAISS index.
    """
    try:
        service = get_search_service()
        results = service.search(query, top_k=k)
        
        chunks = []
        log_results = []
        
        for res in results:
            text = res.get('text', '')
            score = res.get('score', 0.0)
            meta = res.get('metadata', {})
            source = meta.get('source', 'Unknown')
            
            chunk = RetrievedChunk(text=text, source=source, score=score, metadata=meta)
            chunks.append(chunk)
            
            log_results.append({
                "source": source,
                "score": score,
                "snippet": text[:100]
            })
            
        logger.info("RAG_RETRIEVAL", extra={
            "query": query,
            "top_k": k,
            "results": log_results
        })
        
        return chunks
    
    except Exception as e:
        logger.error(f"Error during RAG retrieval: {e}")
        return []
