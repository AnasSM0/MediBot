#!/usr/bin/env python3
"""
Build FAISS index from medical knowledge base.
Run this script to initialize or rebuild the semantic search index.

Usage:
    python build_faiss_index.py
"""

import os
import sys

# Add backend to path
backend_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_path)

from services.document_loader import load_all_documents
from services.faiss_builder import build_faiss_index

def main():
    print("=" * 60)
    print("MediBot FAISS Index Builder")
    print("=" * 60)
    
    # Load documents
    print("\n[1/2] Loading medical documents...")
    documents = load_all_documents(backend_path)
    
    if not documents:
        print("❌ No documents loaded. Please ensure:")
        print("   - DataSets/mplus_topics_2026-01-06.xml exists")
        print("   - DataSets/kaggel QA.csv exists")
        print("   - knowledge_base/ folders contain JSON files")
        sys.exit(1)
    
    print(f"✓ Loaded {len(documents)} documents")
    
    # Build index
    print("\n[2/2] Building FAISS index...")
    output_dir = os.path.join(backend_path, "faiss_indexes")
    
    try:
        build_faiss_index(documents, output_dir)
        print("\n" + "=" * 60)
        print("✓ FAISS index built successfully!")
        print(f"✓ Index saved to: {output_dir}")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error building index: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
