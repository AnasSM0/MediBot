"""
FAISS Demo - Understanding How It Works
========================================

This script demonstrates the core concepts of FAISS and embeddings
in a simplified way to help you understand the MediBot system.
"""

import numpy as np
from sentence_transformers import SentenceTransformer
import faiss

def demo_embeddings():
    """Demonstrate how text is converted to embeddings."""
    print("=" * 60)
    print("DEMO 1: Text to Embeddings")
    print("=" * 60)
    
    # Load the same model used in MediBot
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    
    # Sample medical texts
    texts = [
        "Diabetes is a chronic disease that affects blood sugar levels.",
        "Heart attack symptoms include chest pain and shortness of breath.",
        "High blood sugar is a symptom of diabetes.",
        "Myocardial infarction is the medical term for heart attack.",
        "The weather is sunny today."  # Unrelated text
    ]
    
    print("\nConverting texts to embeddings...\n")
    
    # Convert to embeddings
    embeddings = model.encode(texts)
    
    for i, text in enumerate(texts):
        print(f"Text {i+1}: {text}")
        print(f"Embedding shape: {embeddings[i].shape}")
        print(f"First 5 values: {embeddings[i][:5]}")
        print()
    
    return embeddings, texts

def demo_similarity():
    """Demonstrate similarity calculation."""
    print("=" * 60)
    print("DEMO 2: Similarity Calculation")
    print("=" * 60)
    
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    
    # Sample texts
    text1 = "Diabetes affects blood sugar"
    text2 = "High blood sugar is a diabetes symptom"
    text3 = "Heart attack causes chest pain"
    
    # Get embeddings
    emb1 = model.encode([text1])[0]
    emb2 = model.encode([text2])[0]
    emb3 = model.encode([text3])[0]
    
    # Calculate cosine similarity
    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    sim_1_2 = cosine_similarity(emb1, emb2)
    sim_1_3 = cosine_similarity(emb1, emb3)
    
    print(f"\nText 1: {text1}")
    print(f"Text 2: {text2}")
    print(f"Text 3: {text3}\n")
    
    print(f"Similarity between Text 1 and Text 2 (both about diabetes): {sim_1_2:.4f}")
    print(f"Similarity between Text 1 and Text 3 (different topics): {sim_1_3:.4f}")
    print("\nNotice: Related texts have higher similarity scores!")

def demo_faiss_search():
    """Demonstrate FAISS search."""
    print("\n" + "=" * 60)
    print("DEMO 3: FAISS Search")
    print("=" * 60)
    
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    
    # Knowledge base documents
    documents = [
        "Diabetes is a chronic disease affecting blood sugar regulation.",
        "Type 2 diabetes is the most common form of diabetes.",
        "Diabetes symptoms include increased thirst and frequent urination.",
        "Heart attack symptoms include chest pain and arm pain.",
        "High blood pressure increases heart attack risk.",
        "Regular exercise helps prevent diabetes.",
        "Insulin is used to treat diabetes.",
        "Aspirin may help prevent heart attacks.",
    ]
    
    print(f"\nKnowledge Base ({len(documents)} documents):")
    for i, doc in enumerate(documents):
        print(f"  {i+1}. {doc}")
    
    # Create embeddings
    print("\nBuilding FAISS index...")
    embeddings = model.encode(documents, convert_to_numpy=True)
    
    # Normalize for cosine similarity
    faiss.normalize_L2(embeddings)
    
    # Build FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # Inner Product (cosine after normalization)
    index.add(embeddings)
    
    print(f"✓ Index built with {index.ntotal} vectors of dimension {dimension}")
    
    # Search queries
    queries = [
        "What are diabetes symptoms?",
        "How to prevent heart attack?",
        "Treatment for high blood sugar"
    ]
    
    for query in queries:
        print(f"\n{'─' * 60}")
        print(f"Query: '{query}'")
        print(f"{'─' * 60}")
        
        # Convert query to embedding
        query_embedding = model.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(query_embedding)
        
        # Search
        k = 3  # Top 3 results
        scores, indices = index.search(query_embedding, k)
        
        print(f"\nTop {k} Results:")
        for rank, (score, idx) in enumerate(zip(scores[0], indices[0]), 1):
            print(f"  {rank}. [Score: {score:.4f}] {documents[idx]}")

def demo_chunking():
    """Demonstrate text chunking."""
    print("\n" + "=" * 60)
    print("DEMO 4: Text Chunking")
    print("=" * 60)
    
    # Long document
    long_text = """
    Diabetes is a chronic disease that occurs when the pancreas is no longer 
    able to make insulin, or when the body cannot make good use of the insulin 
    it produces. Insulin is a hormone made by the pancreas that acts like a key 
    to let glucose from the food we eat pass from the bloodstream into the cells 
    in the body to produce energy. All carbohydrate foods are broken down into 
    glucose in the blood. Insulin helps glucose get into the cells. Not being 
    able to produce insulin or use it effectively leads to raised glucose levels 
    in the blood known as hyperglycemia. Over the long-term high glucose levels 
    are associated with damage to the body and failure of various organs and tissues.
    """
    
    words = long_text.split()
    print(f"\nOriginal document: {len(words)} words")
    print(f"Text: {' '.join(words[:50])}...\n")
    
    # Chunk with overlap
    max_tokens = 30
    overlap = 10
    
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_tokens, len(words))
        chunk = ' '.join(words[start:end])
        chunks.append(chunk)
        
        if end >= len(words):
            break
        start = end - overlap
    
    print(f"Chunked into {len(chunks)} chunks (max {max_tokens} words, {overlap} word overlap):\n")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"Chunk {i}:")
        print(f"  {chunk}")
        print()

def main():
    """Run all demos."""
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "FAISS & Embeddings Demo - MediBot" + " " * 15 + "║")
    print("╚" + "═" * 58 + "╝")
    print()
    
    try:
        # Demo 1: Embeddings
        demo_embeddings()
        
        # Demo 2: Similarity
        demo_similarity()
        
        # Demo 3: FAISS Search
        demo_faiss_search()
        
        # Demo 4: Chunking
        demo_chunking()
        
        print("\n" + "=" * 60)
        print("Demo Complete!")
        print("=" * 60)
        print("\nKey Takeaways:")
        print("1. Text is converted to numerical vectors (embeddings)")
        print("2. Similar texts have similar embeddings (high cosine similarity)")
        print("3. FAISS quickly finds the most similar documents to a query")
        print("4. Chunking breaks long documents into searchable pieces")
        print("\nThis is exactly how MediBot's RAG system works! 🚀")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure you have installed the required packages:")
        print("  pip install sentence-transformers faiss-cpu numpy")

if __name__ == "__main__":
    main()
