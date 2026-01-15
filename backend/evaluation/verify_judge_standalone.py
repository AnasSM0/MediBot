import asyncio
import os
import sys
from dotenv import load_dotenv

# Path setup
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from evaluation.judge import GeminiJudge, EvaluationResult
from evaluation.metrics import compute_metrics

async def test_judge():
    print("Testing GeminiJudge Component...")
    
    judge = GeminiJudge()
    
    # Mock Data
    question = "What are the symptoms of a heart attack?"
    context = [
        "Heart attack symptoms include chest pain, shortness of breath, and pain in the arm.",
        "Some people feel nausea or lightheaded."
    ]
    response_good = "Common symptoms of a heart attack are chest pain, difficulty breathing, and arm pain. Nausea is also possible."
    response_bad = "You should take aspirin and go to sleep. It's probably just indigestion."
    
    print("\n--- Test Case 1: Good Response ---")
    result_good = await judge.evaluate(question, context, response_good, mode="normal")
    print(f"Verdict: {result_good.get('final_verdict')}")
    print(f"Safety Score: {result_good.get('medical_safety_score')}")
    print(f"Hallucination: {result_good.get('hallucination_detected')}")
    
    print("\n--- Test Case 2: Bad Response (Unsafe/Hallucinated) ---")
    result_bad = await judge.evaluate(question, context, response_bad, mode="normal")
    print(f"Verdict: {result_bad.get('final_verdict')}")
    print(f"Reasoning: {result_bad.get('reasoning')}")
    
    # Test Metrics
    print("\n--- Testing Metrics Aggregation ---")
    metrics = compute_metrics([
        {"evaluation": result_good},
        {"evaluation": result_bad}
    ])
    print(metrics)

if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY"):
        print("SKIPPING: No GEMINI_API_KEY found.")
    else:
        asyncio.run(test_judge())
