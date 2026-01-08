import os
import pickle
import numpy as np
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import faiss

def chunk_text(text: str, max_tokens: int = 400, overlap: int = 50) -> List[str]:
    """
    Split text into overlapping chunks.
    
    Args:
        text: Input text to chunk
        max_tokens: Maximum tokens per chunk (approximated by words)
        overlap: Number of overlapping words between chunks
    
    Returns:
        List of text chunks
    """
    words = text.split()
    chunks = []
    
    if len(words) <= max_tokens:
        return [text]
    
    start = 0
    while start < len(words):
        end = min(start + max_tokens, len(words))
        chunk = ' '.join(words[start:end])
        chunks.append(chunk)
        
        if end >= len(words):
            break
        
        start = end - overlap
    
    return chunks

def build_faiss_index(documents: List[Dict[str, Any]], output_dir: str, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
    """
    Build FAISS index from documents.
    
    Args:
        documents: List of documents with 'text' and 'metadata' keys
        output_dir: Directory to save index and metadata
        model_name: Sentence transformer model name
    """
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)
    
    # Chunk all documents
    chunked_docs = []
    chunk_metadata = []
    
    print("Chunking documents...")
    for doc in documents:
        chunks = chunk_text(doc['text'], max_tokens=400, overlap=50)
        
        for chunk in chunks:
            chunked_docs.append(chunk)
            chunk_metadata.append({
                **doc['metadata'],
                'chunk_text': chunk
            })
    
    print(f"Total chunks: {len(chunked_docs)}")
    
    # Generate embeddings
    print("Generating embeddings...")
    embeddings = model.encode(chunked_docs, show_progress_bar=True, convert_to_numpy=True)
    
    # Normalize embeddings for cosine similarity (IndexFlatIP)
    faiss.normalize_L2(embeddings)
    
    # Build FAISS index
    print("Building FAISS index...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)
    
    # Save index
    index_path = os.path.join(output_dir, "faiss_index.bin")
    faiss.write_index(index, index_path)
    print(f"Saved FAISS index to {index_path}")
    
    # Save metadata
    metadata_path = os.path.join(output_dir, "metadata.pkl")
    with open(metadata_path, 'wb') as f:
        pickle.dump(chunk_metadata, f)
    print(f"Saved metadata to {metadata_path}")
    
    # Save model name for consistency
    config_path = os.path.join(output_dir, "config.json")
    import json
    with open(config_path, 'w') as f:
        json.dump({
            "model_name": model_name,
            "num_chunks": len(chunked_docs),
            "dimension": dimension
        }, f, indent=2)
    
    print("FAISS index build complete!")
    return index, chunk_metadata

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    from services.document_loader import load_all_documents
    
    # Get base path
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Load documents
    print("Loading documents...")
    documents = load_all_documents(base_path)
    
    if not documents:
        print("No documents loaded. Exiting.")
        sys.exit(1)
    
    # Build index
    output_dir = os.path.join(base_path, "faiss_indexes")
    build_faiss_index(documents, output_dir)
