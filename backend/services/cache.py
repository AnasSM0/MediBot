import os
import json
import numpy as np
from typing import Optional, List
from sentence_transformers import SentenceTransformer
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery
from redisvl.schema import IndexSchema

class SemanticCache:
    def __init__(self, redis_url: str = "redis://redis:6379", threshold: float = 0.90):
        self.redis_url = redis_url
        self.threshold = threshold
        # Use the same model as RAG for consistency and memory efficiency
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        self.index_name = "medibot_cache"
        self.index = self._initialize_index()

    def _initialize_index(self) -> SearchIndex:
        # Define schema for the cache
        schema = IndexSchema.from_dict({
            "index": {
                "name": self.index_name,
                "prefix": "cache",
                "storage_type": "hash",
            },
            "fields": [
                {"name": "query_text", "type": "text"},
                {"name": "response_text", "type": "text"},
                {
                    "name": "query_vector",
                    "type": "vector",
                    "attrs": {
                        "dims": 384,  # user-query embedding dimension (all-MiniLM-L6-v2)
                        "distance_metric": "cosine",
                        "algorithm": "flat",  # Flat for exact/best precision on small cache
                        "datatype": "float32"
                    }
                }
            ]
        })
        
        index = SearchIndex(schema, redis_url=self.redis_url)
        
        try:
           index.create(overwrite=False)
           print(f"Redis Semantic Cache index '{self.index_name}' initialized.")
        except Exception as e:
           print(f"Redis index creation (or connection) note: {e}")
           
        return index

    def _get_embedding(self, text: str) -> List[float]:
        return self.model.encode([text])[0].tolist()

    def check(self, query: str) -> Optional[str]:
        """
        Check cache for a semantically similar query.
        Returns the cached response if found and score >= threshold.
        """
        try:
            vector = self._get_embedding(query)
            
            # Construct vector query
            # We want specific distance threshold. 
            # In redisvl, cosine distance = 1 - cosine_similarity.
            # If threshold is 0.9 similarity, then distance < 0.1.
            # But 'flat' index usually returns distance.
            # Let's query top 1.
            
            v_query = VectorQuery(
                vector=vector,
                vector_field_name="query_vector",
                return_fields=["response_text", "vector_distance"],
                num_results=1
            )
            
            results = self.index.query(v_query)
            
            if not results:
                return None
            
            match = results[0]
            # distance is cosine distance (0 to 2 for normalized). 
            # similarity = 1 - distance
            distance = float(match.get("vector_distance", 1.0))
            similarity = 1.0 - distance
            
            if similarity >= self.threshold:
                print(f"WAIT: Semantic Cache HIT! Similarity: {similarity:.4f} >= {self.threshold}")
                return match.get("response_text")
                
            return None
            
        except Exception as e:
            print(f"Cache check failed: {e}")
            return None

    def store(self, query: str, response: str):
        """Store query and response in the cache."""
        try:
            vector = self._get_embedding(query)
            data = {
                "query_text": query,
                "response_text": response,
                "query_vector": vector
            }
            # RedisVL handles key generation if not provided, or we can set it
            self.index.load([data])
            print("Stored response in Semantic Cache.")
        except Exception as e:
            print(f"Cache usage failed: {e}")

_cache_instance = None

def get_cache() -> SemanticCache:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SemanticCache()
    return _cache_instance
