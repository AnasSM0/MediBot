import asyncio
import json
import os
import sys
import time
import logging
from typing import List, Dict, Any

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

def log(msg):
    print(msg)
    logging.info(msg)

log("SCRIPT START: Initializing...")

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
log("Loading env...")
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

log("Importing dependencies...")
from fastapi.testclient import TestClient

log("Importing main app (this might trigger startup logic)...")
try:
    from main import app  # Assuming main.py is in backend/ and creates 'app'
    log("Import main app SUCCESS")
except Exception as e:
    log(f"Import main app FAILED: {e}")
    sys.exit(1)

from evaluation.judge import GeminiJudge
from evaluation.metrics import compute_metrics
from jose import jwt

# Define Output Paths
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)
REPORT_PATH = os.path.join(RESULTS_DIR, "report.json")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "golden_dataset.json")

def create_mock_token(user_data: Dict[str, Any]) -> str:
    secret = os.getenv("NEXTAUTH_SECRET", "supersecret")
    return jwt.encode(user_data, secret, algorithm="HS256")

# Mock Auth Token
TEST_USER = {"sub": "eval_user_001", "email": "eval@medibot.local", "name": "Eval Bot", "provider": "test"}
try:
    TOKEN = create_mock_token(TEST_USER)
    log("Auth token created.")
except Exception as e:
    log(f"Auth token creation failed: {e}")
    TOKEN = "mock_token"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}"
}

def run_chat_and_capture(client: TestClient, message: str, mode: str):
    log(f"Running chat for: {message[:20]}...")
    # Force DEBUG_RAG=true for this process if not set
    os.environ["DEBUG_RAG"] = "true"
    
    response = client.post(
        "/chat",
        json={"message": message, "mode": mode},
        headers=HEADERS,
    )
    
    full_text = ""
    rag_chunks = []
    
    # Process SSE Stream
    for line in response.iter_lines():
        if line:
            if isinstance(line, bytes):
                line = line.decode('utf-8')
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    event_type = data.get("type")
                    
                    if event_type == "chunk":
                        full_text += data.get("content", "")
                    elif event_type == "debug":
                        content = json.loads(data.get("content", "{}"))
                        rag_chunks = content.get("retrieved_chunks", [])
                        
                except Exception as e:
                    pass 
                    
    return full_text, rag_chunks

async def main():
    log("🚀 Starting MediBot LLM-Judge Evaluation...")
    
    # Load Dataset
    with open(DATASET_PATH, "r") as f:
        dataset = json.load(f)
        
    judge = GeminiJudge()
    
    log("Initializing TestClient...")
    # This triggers startup events
    with TestClient(app) as client:
        log("TestClient initialized. Startup complete.")
        
        results = []
        log(f"📋 Loaded {len(dataset)} test cases.")

        for i, case in enumerate(dataset):
            log(f"[{i+1}/{len(dataset)}] Testing: {case['question'][:50]}...")
            
            start_time = time.time()
            
            try:
                response_text, rag_chunks = run_chat_and_capture(
                    client, 
                    case["question"], 
                    case.get("expected_mode", "normal")
                )
                
                log(f"   Response Length: {len(response_text)} chars")
                log(f"   RAG Chunks Captured: {len(rag_chunks)}")
                
                eval_result = await judge.evaluate(
                    question=case["question"],
                    context=rag_chunks,
                    response=response_text,
                    mode=case.get("expected_mode", "normal")
                )
                
                log(f"   Verdict: {eval_result.get('final_verdict')}")
                
                results.append({
                    "case": case,
                    "actual_response": response_text,
                    "retrieved_chunks": rag_chunks,
                    "evaluation": eval_result,
                    "latency": round(time.time() - start_time, 2)
                })
                
            except Exception as e:
                log(f"   ❌ Error: {e}")
                results.append({
                    "case": case,
                    "error": str(e)
                })

            # Add delay to avoid rate limits
            log("Waiting 5 seconds to avoid API rate limits...")
            time.sleep(5)

        # 3. Compute Metrics
        metrics = compute_metrics(results)
        
        final_report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "metrics": metrics,
            "results": results
        }
        
        # 4. Save Report
        with open(REPORT_PATH, "w") as f:
            json.dump(final_report, f, indent=2)
            
        log("EVALUATION COMPLETE")
        log(f"Report saved to: {REPORT_PATH}")

if __name__ == "__main__":
    asyncio.run(main())
