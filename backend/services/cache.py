import os
from typing import Optional

class SemanticCache:
    """
    No-op semantic cache implementation.
    Redis has been disabled to simplify deployment.
    This class maintains the same interface but doesn't actually cache anything.
    """
    def __init__(self, redis_url: str = None, threshold: float = 0.90):
        print("Semantic cache disabled - responses will be generated fresh each time.")
        
    def check(self, query: str) -> Optional[str]:
        """
        Check cache for a semantically similar query.
        Always returns None since caching is disabled.
        """
        return None
    
    def store(self, query: str, response: str):
        """
        Store query and response in the cache.
        No-op since caching is disabled.
        """
        pass

_cache_instance = None

def get_cache() -> SemanticCache:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SemanticCache()
    return _cache_instance
