import os
import json
import xml.etree.ElementTree as ET
import csv
import re
import html
from typing import List, Dict, Any

def clean_text(text: str) -> str:
    """Remove HTML tags and excessive whitespace."""
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def load_medlineplus_xml(xml_path: str) -> List[Dict[str, Any]]:
    """
    Parse MedlinePlus Health Topic XML and extract structured data.
    
    Returns:
        List of documents with metadata
    """
    documents = []
    
    if not os.path.exists(xml_path):
        print(f"Warning: MedlinePlus XML not found at {xml_path}")
        return documents
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        for topic in root.findall('health-topic'):
            if topic.get('language') != 'English':
                continue
            
            title = topic.get('title', '')
            topic_id = topic.get('id', '')
            
            full_summary_elem = topic.find('full-summary')
            full_summary = clean_text(full_summary_elem.text if full_summary_elem is not None else "")
            
            # Extract treatment and prevention info from summary
            treatment = ""
            prevention = ""
            
            if "treatment" in full_summary.lower() or "therapy" in full_summary.lower():
                sentences = full_summary.split('.')
                treatment = '. '.join([s for s in sentences if any(kw in s.lower() for kw in ['treatment', 'therapy', 'medication', 'medicine'])])
            
            if "prevent" in full_summary.lower():
                sentences = full_summary.split('.')
                prevention = '. '.join([s for s in sentences if 'prevent' in s.lower()])
            
            # Create document
            doc_text = f"Title: {title}\n\n{full_summary}"
            if treatment:
                doc_text += f"\n\nTreatment: {treatment}"
            if prevention:
                doc_text += f"\n\nPrevention: {prevention}"
            
            documents.append({
                "text": doc_text,
                "metadata": {
                    "source": "MedlinePlus",
                    "title": title,
                    "id": topic_id,
                    "type": "health_topic"
                }
            })
    
    except Exception as e:
        print(f"Error parsing MedlinePlus XML: {e}")
    
    return documents

def load_kaggle_qa_csv(csv_path: str) -> List[Dict[str, Any]]:
    """
    Load Kaggle Medical Q&A CSV dataset.
    
    Returns:
        List of Q&A documents with metadata
    """
    documents = []
    
    if not os.path.exists(csv_path):
        print(f"Warning: Kaggle CSV not found at {csv_path}")
        return documents
    
    try:
        csv.field_size_limit(10 * 1024 * 1024)
        
        with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                question = row.get('Question', '').strip()
                answer = row.get('Answer', '').strip()
                qtype = row.get('qtype', 'general').strip()
                
                if not question or not answer:
                    continue
                
                doc_text = f"Q: {question}\n\nA: {answer}"
                
                documents.append({
                    "text": doc_text,
                    "metadata": {
                        "source": "Kaggle Medical QA",
                        "question": question,
                        "answer": answer,
                        "type": qtype
                    }
                })
    
    except Exception as e:
        print(f"Error loading Kaggle CSV: {e}")
    
    return documents

def load_knowledge_base_json(kb_dir: str) -> List[Dict[str, Any]]:
    """
    Load pre-processed JSON files from knowledge_base directory.
    
    Returns:
        List of documents from all categories
    """
    documents = []
    categories = ['symptoms', 'remedies', 'prevention', 'qa']
    
    for category in categories:
        category_path = os.path.join(kb_dir, category)
        
        if not os.path.exists(category_path):
            continue
        
        for filename in os.listdir(category_path):
            if not filename.endswith('.json') or filename.startswith('.'):
                continue
            
            filepath = os.path.join(category_path, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Handle different JSON structures
                if category == 'qa':
                    # QA format
                    topic = data.get('topic', '')
                    qa_pairs = data.get('qa', [])
                    
                    for qa in qa_pairs:
                        doc_text = f"Q: {qa.get('question', '')}\n\nA: {qa.get('answer', '')}"
                        documents.append({
                            "text": doc_text,
                            "metadata": {
                                "source": data.get('source', 'Knowledge Base'),
                                "category": category,
                                "topic": topic,
                                "type": "qa"
                            }
                        })
                else:
                    # Symptoms/Remedies/Prevention format
                    name = data.get('name', '')
                    description = data.get('description', '')
                    treatment = data.get('treatment', '')
                    prevention = data.get('prevention', '')
                    
                    doc_text = f"Topic: {name}\n\n{description}"
                    if treatment:
                        doc_text += f"\n\nTreatment: {treatment}"
                    if prevention:
                        doc_text += f"\n\nPrevention: {prevention}"
                    
                    documents.append({
                        "text": doc_text,
                        "metadata": {
                            "source": data.get('source', 'Knowledge Base'),
                            "category": category,
                            "name": name,
                            "type": category
                        }
                    })
            
            except Exception as e:
                print(f"Error loading {filepath}: {e}")
    
    return documents

def load_all_documents(base_path: str) -> List[Dict[str, Any]]:
    """
    Load all medical documents from various sources.
    
    Args:
        base_path: Base directory path (backend/)
    
    Returns:
        Combined list of all documents
    """
    all_documents = []
    
    # Load MedlinePlus XML
    xml_path = os.path.join(base_path, "DataSets", "mplus_topics_2026-01-06.xml")
    medline_docs = load_medlineplus_xml(xml_path)
    all_documents.extend(medline_docs)
    print(f"Loaded {len(medline_docs)} MedlinePlus documents")
    
    # Load Kaggle CSV
    csv_path = os.path.join(base_path, "DataSets", "kaggel QA.csv")
    kaggle_docs = load_kaggle_qa_csv(csv_path)
    all_documents.extend(kaggle_docs)
    print(f"Loaded {len(kaggle_docs)} Kaggle Q&A documents")
    
    # Load Knowledge Base JSON files
    kb_path = os.path.join(base_path, "knowledge_base")
    kb_docs = load_knowledge_base_json(kb_path)
    all_documents.extend(kb_docs)
    print(f"Loaded {len(kb_docs)} Knowledge Base documents")
    
    print(f"Total documents loaded: {len(all_documents)}")
    return all_documents
