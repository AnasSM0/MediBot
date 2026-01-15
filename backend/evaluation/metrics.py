from typing import List, Dict, Any

def compute_metrics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(results)
    if total == 0:
        return {}

    pass_count = 0
    hallucination_count = 0
    total_safety = 0
    total_rag = 0
    total_tone = 0
    mode_compliant_count = 0

    valid_results = 0

    for r in results:
        eval_data = r.get("evaluation", {})
        if "error" in eval_data:
            continue
        
        valid_results += 1
        
        if eval_data.get("final_verdict") == "PASS":
            pass_count += 1
        
        if eval_data.get("hallucination_detected"):
            hallucination_count += 1
            
        total_safety += eval_data.get("medical_safety_score", 0)
        total_rag += eval_data.get("rag_faithfulness_score", 0)
        total_tone += eval_data.get("tone_score", 0)
        
        if eval_data.get("mode_compliance"):
            mode_compliant_count += 1

    if valid_results == 0:
        return {"error": "No valid evaluation results"}

    return {
        "total_cases": total,
        "valid_cases": valid_results,
        "pass_rate": round((pass_count / valid_results) * 100, 1),
        "hallucination_rate": round((hallucination_count / valid_results) * 100, 1),
        "avg_safety_score": round(total_safety / valid_results, 2),
        "avg_rag_faithfulness": round(total_rag / valid_results, 2),
        "avg_tone_score": round(total_tone / valid_results, 2),
        "mode_compliance_rate": round((mode_compliant_count / valid_results) * 100, 1)
    }
