import os
import pickle
import json
import numpy as np
import threading
import logging
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import faiss

# Configure simple string logger for now (Phase 5 will do structlog)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("faiss_service")

class FAISSSearchService:
    """FAISS-based semantic search service with Singleton safety."""
    
    _instance = None
    _lock = threading.Lock()
    _initialized = False
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(FAISSSearchService, cls).__new__(cls)
        return cls._instance

    def __init__(self, index_dir: Optional[str] = None):
        """
        Initialize FAISS service. Idempotent.
        """
        if self._initialized:
            return
            
        with self._lock:
            if self._initialized:
                return

            # Default path if not provided
            if not index_dir:
                 base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                 index_dir = os.path.join(base_path, "faiss_indexes")
            
            self.index_dir = index_dir
            self.index = None
            self.metadata = None
            self.model = None
            self.config = None
            
            try:
                self._load_index()
                self._initialized = True
            except Exception as e:
                logger.error(f"Failed to initialize FAISS: {e}")
                # We do not raise here to allow app to boot if RAG is optional,
                # BUT Phase 3 check_config will fail-fast if index is strictly required.
                # Here we just leave _initialized as False so it retries or fails on usage.
                # However, CheckConfig runs first.
                pass
    
    def _load_index(self):
        """Load FAISS index, metadata, and embedding model."""
        index_path = os.path.join(self.index_dir, "faiss_index.bin")
        metadata_path = os.path.join(self.index_dir, "metadata.pkl")
        config_path = os.path.join(self.index_dir, "config.json")
        
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"FAISS index not found at {index_path}.")
        
        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Metadata not found at {metadata_path}")
        
        # Load config
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = {"model_name": "sentence-transformers/all-MiniLM-L6-v2"}
        
        logger.info(f"Loading FAISS from {self.index_dir}...")
        
        # Load FAISS index
        self.index = faiss.read_index(index_path)
        
        # Load metadata
        with open(metadata_path, 'rb') as f:
            self.metadata = pickle.load(f)
        
        # Load embedding model
        model_name = self.config.get("model_name", "sentence-transformers/all-MiniLM-L6-v2")
        self.model = SentenceTransformer(model_name)
        
        # Memory / Stats Audit
        logger.info(f"FAISS Loaded Successfully. Vectors: {self.index.ntotal}. Metadata Entries: {len(self.metadata)}")
        
        # Basic safeguard: Check if metadata matches index size
        if self.index.ntotal != len(self.metadata):
             logger.warning(f"MISMATCH: Index has {self.index.ntotal} vectors but metadata has {len(self.metadata)} entries!")

    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self._initialized or not self.index:
            logger.error("Attempted search on uninitialized FAISS service.")
            return []
        
        try:
            # Generate query embedding
            query_embedding = self.model.encode([query], convert_to_numpy=True)
            faiss.normalize_L2(query_embedding)
            
            # Search
            scores, indices = self.index.search(query_embedding, top_k)
            
            # Format results
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(self.metadata):
                    meta = self.metadata[idx]
                    result = {
                        "score": float(score),
                        "text": meta.get('chunk_text', ''),
                        "metadata": {k: v for k, v in meta.items() if k != 'chunk_text'}
                    }
                    results.append(result)
            
            return results
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def search_with_filter(self, query: str, category: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        # Get more results initially for filtering
        initial_k = top_k * 3 if category else top_k
        results = self.search(query, top_k=initial_k)
        
        if category:
            results = [r for r in results if r['metadata'].get('category') == category or r['metadata'].get('type') == category]
        
        return results[:top_k]

# Explicit Initializer
def initialize_faiss_service(index_dir: Optional[str] = None):
    """
    Called by main.py startup. Ensures singleton is ready.
    """
    FAISSSearchService(index_dir)

# Accessor
def get_search_service(index_dir: Optional[str] = None) -> FAISSSearchService:
    return FAISSSearchService(index_dir)

def search_medical_documents(query: str, top_k: int = 5, category: Optional[str] = None) -> List[Dict[str, Any]]:
    svc = get_search_service()
    if category:
        return svc.search_with_filter(query, category, top_k)
    return svc.search(query, top_k)
