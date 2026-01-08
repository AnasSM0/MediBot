import os
import re

# Base paths
BASE_KB_PATH = r"E:\work\MediBot\MediBot\backend\knowledge_base"

CATEGORIES = {
    "symptoms": os.path.join(BASE_KB_PATH, "symptoms"),
    "remedies": os.path.join(BASE_KB_PATH, "remedies"),
    "prevention": os.path.join(BASE_KB_PATH, "prevention"),
    "qa": os.path.join(BASE_KB_PATH, "qa")
}

def _build_keyword_map():
    """
    Builds a dictionary mapping keywords (from filenames) to their category and filename.
    Returns:
        dict: { keyword: { "category": str, "file": str } }
    """
    keyword_map = {}
    
    for category, path in CATEGORIES.items():
        if not os.path.exists(path):
            continue
            
        for filename in os.listdir(path):
            if filename.endswith(".json") and not filename.startswith("."):
                # Keyword is the filename without extension, snake_case parts treated as tokens
                # e.g., "heart_attack.json" -> "heart attack"
                base_name = filename[:-5]
                # Normalize: separate by space for simpler matching
                normalized_name = base_name.replace("_", " ")
                
                keyword_map[normalized_name] = {
                    "category": category,
                    "file": filename
                }
                
                # Also index individual significant words if needed, 
                # but "simple keyword matching based on filenames" typically implies the topic name.
                # Let's keep strict topic matching first to avoid noise.
    
    return keyword_map

# Global cache for the map (loaded on module import or first use)
_KEYWORD_MAP = None

def get_keyword_map():
    global _KEYWORD_MAP
    if _KEYWORD_MAP is None:
        _KEYWORD_MAP = _build_keyword_map()
    return _KEYWORD_MAP

def route_query(query: str) -> dict | None:
    """
    Routes a user query to a specific knowledge base file based on keyword matching.
    
    Args:
        query (str): The user's input query.
        
    Returns:
        dict | None: { "category": str, "file": str } if a match is found, else None.
    """
    normalized_query = query.lower()
    keyword_map = get_keyword_map()
    
    # Strategy: Find the longest matching keyword in the query.
    # We iterate through all known topics and check if they exist in the query.
    # This matches "heart attack" in "Tell me about heart attack symptoms".
    
    best_match = None
    longest_match_len = 0
    
    for keyword, data in keyword_map.items():
        # Check if the keyword (topic) appears in the query
        # Ensure boundary matching or simple substring?
        # Simple substring is risky ("rat" in "rate"). 
        # Better: check if keyword is in query with word boundaries.
        
        # Regex for exact phrase match
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, normalized_query):
            if len(keyword) > longest_match_len:
                longest_match_len = len(keyword)
                best_match = data
                
    return best_match
