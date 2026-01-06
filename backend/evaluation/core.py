import sys
import os
import json
import asyncio
import time
from typing import List, Dict, Any

# Ensure backend modules can be imported
# Assuming this script is run from project root or backend usually
# We add the parent of 'evaluation' (which is 'backend') and its parent to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(backend_dir)

sys.path.append(backend_dir)
sys.path.append(root_dir)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from services.ai import stream_response, detect_severity
from evaluation.scorer import (
    calculate_keyword_score,
    check_severity_accuracy,
    check_safety_violations,
    check_emergency_handling
)

async def run_single_case(case: Dict[str, Any]) -> Dict[str, Any]:
    user_input = case["user_input"]
    expected_severity = case["expected_severity"]
    expected_keywords = case["expected_keywords"]
    must_not_include = case.get("must_not_include", [])
    emergency_expected = case.get("emergency_expected", False)

    print(f"Running Case {case['id']}: {user_input[:30]}...")

    # 1. Get Response
    full_response = ""
    start_time = time.time()
    try:
        async for chunk in stream_response(user_input):
            full_response += chunk
    except Exception as e:
        full_response = f"Error: {str(e)}"
    duration = time.time() - start_time

    # 2. Detect Severity (Triage simulation)
    detected_severity_level = detect_severity(user_input, full_response)

    # 3. Score
    kw_score = calculate_keyword_score(full_response, expected_keywords)
    severity_match = check_severity_accuracy(detected_severity_level, expected_severity)
    safety_violations = check_safety_violations(full_response, must_not_include)
    emergency_handled = check_emergency_handling(full_response, emergency_expected)

    # 4. Consistency Check (Simple Run 2)
    # Only run consistency check if request didn't fail
    consistency_score = 1.0
    if "Error" not in full_response:
        response_2 = ""
        async for chunk in stream_response(user_input):
            response_2 += chunk
        
        # Simple similarity: Jaccard or just length/keyword match
        # We'll use a rough ratio of length and significant keyword overlap
        # Validating if output is roughly same logic
        consistency_score = calculate_keyword_score(response_2, expected_keywords)
        # If score varies wildly, consistency is low. Here we just report the score of run 2 relative to expected. 
        # Ideally we compare response_1 and response_2 content. 
        # For now, let's keep it simple: consistency = 1.0 if Keyword Score is similar
        if abs(kw_score - consistency_score) > 0.3:
            consistency_score = 0.5 
        else:
            consistency_score = 1.0

    return {
        "id": case["id"],
        "input": user_input,
        "response": full_response,
        "detected_severity": detected_severity_level,
        "metrics": {
            "keyword_match": kw_score,
            "severity_accuracy": 1.0 if severity_match else 0.0,
            "safety_compliance": 1.0 if not safety_violations else 0.0,
            "emergency_handling": 1.0 if emergency_handled else 0.0,
            "consistency_score": consistency_score,
            "latency": duration
        },
        "violations": safety_violations
    }

async def run_evaluation(cases_path: str):
    with open(cases_path, 'r') as f:
        cases = json.load(f)

    results = []
    print(f"Starting Evaluation on {len(cases)} cases...")
    
    for case in cases:
        result = await run_single_case(case)
        results.append(result)

    # Aggregate
    total_score = 0
    total_safety = 0
    total_severity = 0
    total_emergency = 0
    
    for r in results:
        m = r["metrics"]
        total_score += m["keyword_match"]
        total_safety += m["safety_compliance"]
        total_severity += m["severity_accuracy"]
        total_emergency += m["emergency_handling"]

    count = len(results)
    summary = {
        "overall_accuracy": round(total_score / count, 2),
        "safety_compliance": round((total_safety / count) * 100, 1),
        "severity_accuracy": round((total_severity / count) * 100, 1),
        "emergency_handling": round((total_emergency / count) * 100, 1),
        "total_cases": count,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    return summary, results
