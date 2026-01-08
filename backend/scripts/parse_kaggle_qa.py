
import csv
import json
import re
import os
import sys

# Increase CSV field size limit just in case
csv.field_size_limit(10 * 1024 * 1024)

INPUT_FILE = r"E:\work\MediBot\MediBot\backend\DataSets\kaggel QA.csv"
OUTPUT_DIR = r"E:\work\MediBot\MediBot\backend\knowledge_base\qa"

def clean_question(q):
    q = q.strip()
    # Remove trailing question marks and spaces
    while q.endswith('?') or q.endswith(' '):
        q = q[:-1]
    return q

def extract_topic(question):
    q = clean_question(question)
    
    # List of patterns to extract the topic
    # Capture group 1 is the topic
    patterns = [
        r"Who is at risk for (.*)",
        r"What are the symptoms of (.*)",
        r"How to diagnose (.*)",
        r"What are the treatments for (.*)",
        r"How to prevent (.*)",
        r"What is \(are\) (.*)",
        r"what are the signs and symptoms of (.*)",
        r"what is the risk for my pet for (.*)",
        r"what is the government doing about these diseases for (.*)",
        r"what else can be done to prevent these diseases for (.*)",
        r"what can i do to prevent poisoning by (.*)",
        r"how can these diseases be diagnosed for (.*)",
        r"how can these diseases be treated for (.*)",
        r"how common are these diseases for (.*)",
        r"how common is (.*)",
        r"are there complications from (.*)",
        r"how is (.*) diagnosed",
        r"how can (.*) be treated",
        r"how can (.*) be prevented",
        r"how is (.*) diagnosed",
        r"what is (.*)",
        r"what are (.*)",
    ]
    
    for pat in patterns:
        match = re.search(pat, q, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return q # Fallback: use the whole question

def to_snake_case(text):
    text = re.sub(r'[^a-zA-Z0-9\s-]', '', text)
    return text.lower().replace(' ', '_').replace('-', '_')

def process_qa():
    if not os.path.exists(INPUT_FILE):
        print(f"Input file not found: {INPUT_FILE}")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    topics_map = {} # topic_name -> list of {question, answer}

    try:
        with open(INPUT_FILE, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                q_text = row.get('Question', '').strip()
                a_text = row.get('Answer', '').strip()
                
                if not q_text:
                    continue

                topic = extract_topic(q_text)
                
                # Normalize topic key (for grouping)
                # We essentially want to group "Rabies" and "rabies" together.
                # But we need a display name.
                pass
                
                if topic not in topics_map:
                    topics_map[topic] = []
                
                topics_map[topic].append({
                    "question": q_text,
                    "answer": a_text
                })
                count += 1
                
        print(f"Processed {count} QA pairs.")
        print(f"Found {len(topics_map)} unique topics.")

        # Write to JSON
        for topic, qas in topics_map.items():
            snake_name = to_snake_case(topic)
            if not snake_name: 
                # Fallback if topic is empty or symbols
                snake_name = "uncategorized"
            
            # Sanitization for filename length
            if len(snake_name) > 100:
                snake_name = snake_name[:100]

            file_path = os.path.join(OUTPUT_DIR, f"{snake_name}.json")
            
            # If file already exists (collision from different casing or similar snake_case),
            # we should append or handle it? 
            # For this script, we'll assume the grouping above handled exact string matches.
            # But let's merge if the file exists from a previous run or case-insensitive collision?
            # Actually, let's just write. The grouping key is case-sensitive `topic`.
            # Wait, if we have "Rabies" and "rabies", they will be separate entries in map,
            # but might map to same "rabies.json". 
            # We should probably normalize the map key to lower case or similar?
            # Let's do a second pass to merge case-variants?
            pass 
        
        # Better approach: Group by snake_case ID
        final_groups = {}
        
        for topic, qas in topics_map.items():
            snake_name = to_snake_case(topic)
            if not snake_name: snake_name = "uncategorized"
            if len(snake_name) > 100: snake_name = snake_name[:100]
            
            if snake_name not in final_groups:
                final_groups[snake_name] = {
                    "topic": topic, # Keep the first capitalization we see
                    "qa": []
                }
            final_groups[snake_name]["qa"].extend(qas)

        # Write files
        for snake_name, data in final_groups.items():
            output_data = {
                "topic": data["topic"],
                "qa": data["qa"],
                "source": "Kaggle Medical QA"
            }
            
            file_path = os.path.join(OUTPUT_DIR, f"{snake_name}.json")
            with open(file_path, 'w', encoding='utf-8') as cleaning_f:
                json.dump(output_data, cleaning_f, indent=2)

        print(f"Written {len(final_groups)} JSON files.")

    except Exception as e:
        print(f"Error processing CSV: {e}")

if __name__ == "__main__":
    process_qa()
