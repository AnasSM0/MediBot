import os
import xml.etree.ElementTree as ET
import json
import re
import html

# Provided path
path = r"E:\work\MediBot\MediBot\backend\DataSets\mplus_topics_2026-01-06.xml"

def clean_text(text):
    if not text:
        return ""
    # Decode HTML entities
    text = html.unescape(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_sentences_with_keywords(text, keywords):
    sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', text)
    matches = [s for s in sentences if any(k in s.lower() for k in keywords)]
    return " ".join(matches)

def parse_medline_xml():
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return

    base_output_dir = r"E:\work\MediBot\MediBot\backend\knowledge_base"
    
    count = 0
    for topic in root.findall('health-topic'):
        # Only process English topics
        if topic.get('language') != 'English':
            continue

        title = topic.get('title')
        topic_id = topic.get('id')
        full_summary_elem = topic.find('full-summary')
        
        full_summary_raw = full_summary_elem.text if full_summary_elem is not None else ""
        description = clean_text(full_summary_raw)
        
        # Heuristic extraction
        # Treatment keywords: treatment, therapy, surgery, medicine, medication, cure, heal
        treatment = extract_sentences_with_keywords(description, ["treatment", "therapy", "surgery", "medicine", "medication", "cure", "heal"])
        
        # Prevention keywords: prevention, prevent, avoid, risk factor
        prevention = extract_sentences_with_keywords(description, ["prevention", "prevent", "avoid"])

        # Create snake_case_id
        clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', title)
        snake_case_id = clean_title.lower().replace(' ', '_')

        data = {
            "id": snake_case_id,
            "name": title,
            "description": description,
            "treatment": treatment,
            "prevention": prevention,
            "source": "MedlinePlus"
        }

        # Routing Logic
        subfolder = "symptoms"
        if treatment:
            subfolder = "remedies"
        elif prevention:
            subfolder = "prevention"
        
        output_dir = os.path.join(base_output_dir, subfolder)
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, f"{snake_case_id}.json")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        count += 1

    print(f"Processed {count} topics.")

if __name__ == "__main__":
    parse_medline_xml()