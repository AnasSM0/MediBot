"""
FAISS Index Testing Script
Run this to verify your FAISS index is working correctly
"""

import sys
import os

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Add backend to path
BACKEND_DIR = os.path.join(SCRIPT_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)

def test_faiss():
    print("=" * 60)
    print("🔍 FAISS Index Verification Test")
    print("=" * 60)
    print()
    
    # 1. Check if index files exist
    print("1️⃣ Checking index files...")
    
    # Use dynamic paths
    faiss_indexes_dir = os.path.join(BACKEND_DIR, "faiss_indexes")
    index_path = os.path.join(faiss_indexes_dir, "faiss_index.bin")
    metadata_path = os.path.join(faiss_indexes_dir, "metadata.pkl")
    config_path = os.path.join(faiss_indexes_dir, "config.json")
    
    if os.path.exists(index_path):
        size_mb = os.path.getsize(index_path) / (1024 * 1024)
        print(f"   ✅ Index file found: {size_mb:.2f} MB")
    else:
        print(f"   ❌ Index file NOT found at {index_path}")
        print(f"   Run: python {os.path.join(BACKEND_DIR, 'build_faiss_index.py')}")
        return
    
    if os.path.exists(metadata_path):
        size_mb = os.path.getsize(metadata_path) / (1024 * 1024)
        print(f"   ✅ Metadata file found: {size_mb:.2f} MB")
    else:
        print(f"   ❌ Metadata file NOT found")
        return
    
    if os.path.exists(config_path):
        print(f"   ✅ Config file found")
    else:
        print(f"   ⚠️  Config file NOT found (optional)")
    
    print()
    
    # 2. Initialize FAISS service
    print("2️⃣ Initializing FAISS service...")
    try:
        from services.faiss_search import get_search_service
        service = get_search_service(index_dir=faiss_indexes_dir)
        print(f"   ✅ Service initialized successfully")
        print(f"   📊 Index contains {service.index.ntotal} vectors")
    except Exception as e:
        print(f"   ❌ Failed to initialize: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print()
    
    # 3. Test queries
    print("3️⃣ Testing search queries...")
    test_queries = [
        "What are the symptoms of diabetes?",
        "How to treat high blood pressure?",
        "What causes headaches?",
        "Symptoms of heart disease",
        "How to prevent flu?"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n   Query {i}: '{query}'")
        try:
            results = service.search(query, top_k=3)
            print(f"   📊 Retrieved {len(results)} chunks")
            
            if results:
                for j, result in enumerate(results, 1):
                    score = result.get('score', 0)
                    source = result.get('metadata', {}).get('source', 'Unknown')
                    text_preview = result.get('text', '')[:100]
                    
                    print(f"      Result {j}:")
                    print(f"         Score: {score:.4f}")
                    print(f"         Source: {source}")
                    print(f"         Preview: {text_preview}...")
                    
                    # Quality check
                    if score < 0.5:
                        print(f"         ⚠️  Low similarity score")
                    elif score > 0.8:
                        print(f"         ✅ Excellent match")
            else:
                print(f"      ⚠️  No results found")
                
        except Exception as e:
            print(f"      ❌ Search failed: {e}")
    
    print()
    print("=" * 60)
    print("✅ FAISS Test Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. If scores are low (< 0.5), consider rebuilding index with more data")
    print("2. If no results found, verify your index has medical content")
    print("3. Enable DEBUG_RAG=true in .env to see RAG in action")
    print()

if __name__ == "__main__":
    test_faiss()
