import os
import pickle
import json
import numpy as np
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import faiss

class FAISSSearchService:
    """FAISS-based semantic search service for medical documents."""
    
    def __init__(self, index_dir: str):
        """
        Initialize FAISS search service.
        
        Args:
            index_dir: Directory containing faiss_index.bin and metadata.pkl
        """
        self.index_dir = index_dir
        self.index = None
        self.metadata = None
        self.model = None
        self.config = None
        
        self._load_index()
    
    def _load_index(self):
        """Load FAISS index, metadata, and embedding model."""
        index_path = os.path.join(self.index_dir, "faiss_index.bin")
        metadata_path = os.path.join(self.index_dir, "metadata.pkl")
        config_path = os.path.join(self.index_dir, "config.json")
        
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"FAISS index not found at {index_path}. Run faiss_builder.py first.")
        
        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Metadata not found at {metadata_path}")
        
        # Load config
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = {"model_name": "sentence-transformers/all-MiniLM-L6-v2"}
        
        # Load FAISS index
        self.index = faiss.read_index(index_path)
        
        # Load metadata
        with open(metadata_path, 'rb') as f:
            self.metadata = pickle.load(f)
        
        # Load embedding model
        model_name = self.config.get("model_name", "sentence-transformers/all-MiniLM-L6-v2")
        self.model = SentenceTransformer(model_name)
        
        print(f"Loaded FAISS index with {self.index.ntotal} vectors")
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for relevant documents using semantic similarity.
        
        Args:
            query: User query string
            top_k: Number of top results to return
        
        Returns:
            List of relevant documents with metadata and scores
        """
        if not self.index or not self.model:
            raise RuntimeError("FAISS index not loaded")
        
        # Generate query embedding
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.index.search(query_embedding, top_k)
        
        # Format results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.metadata):
                result = {
                    "score": float(score),
                    "text": self.metadata[idx].get('chunk_text', ''),
                    "metadata": {k: v for k, v in self.metadata[idx].items() if k != 'chunk_text'}
                }
                results.append(result)
        
        return results
    
    def search_with_filter(self, query: str, category: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search with optional category filtering.
        
        Args:
            query: User query string
            category: Optional category filter (symptoms, remedies, prevention, qa)
            top_k: Number of results to return
        
        Returns:
            Filtered search results
        """
        # Get more results initially for filtering
        initial_k = top_k * 3 if category else top_k
        results = self.search(query, top_k=initial_k)
        
        if category:
            results = [r for r in results if r['metadata'].get('category') == category or r['metadata'].get('type') == category]
        
        return results[:top_k]

# Global instance (lazy loaded, or explicitly initialized)
_search_service: Optional[FAISSSearchService] = None

def initialize_faiss_service(index_dir: Optional[str] = None):
    """Explicitly initialize the FAISS service (e.g., at app startup)."""
    global _search_service
    if _search_service is None:
        if index_dir is None:
            # Default to backend/faiss_indexes
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            index_dir = os.path.join(base_path, "faiss_indexes")
        print(f"Initializing FAISS service from {index_dir}...")
        try:
            _search_service = FAISSSearchService(index_dir)
            print("FAISS service initialized successfully.")
        except Exception as e:
            print(f"Failed to initialize FAISS service: {e}")
            # Non-fatal if index doesn't exist yet, but search will fail
            pass

def get_search_service(index_dir: Optional[str] = None) -> FAISSSearchService:
    """
    Get or create FAISS search service instance.
    
    Args:
        index_dir: Optional custom index directory
    
    Returns:
        FAISSSearchService instance
    """
    global _search_service
    
    if _search_service is None:
        initialize_faiss_service(index_dir)
    
    if _search_service is None:
        # Fallback if initialization failed
        raise RuntimeError("FAISS service is not initialized. Check logs or build the index.")
    
    return _search_service

def search_medical_documents(query: str, top_k: int = 5, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Convenience function for searching medical documents.
    
    Args:
        query: User query
        top_k: Number of results
        category: Optional category filter
    
    Returns:
        List of relevant documents
    """
    service = get_search_service()
    
    if category:
        return service.search_with_filter(query, category, top_k)
    else:
        return service.search(query, top_k)
