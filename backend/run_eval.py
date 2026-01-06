import asyncio
import argparse
import os
import json
import sys

# Ensure backend can be imported locally
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from evaluation.core import run_evaluation

async def main():
    parser = argparse.ArgumentParser(description="MediBot Evaluation System")
    parser.add_argument("--cases", type=str, default="evaluation/data/evaluation_cases.json", help="Path to test cases JSON")
    parser.add_argument("--output", type=str, default="evaluation_report.json", help="Path to save output report")
    args = parser.parse_args()

    # robust path handling
    cases_path = args.cases
    if not os.path.isabs(cases_path):
        cases_path = os.path.join(os.path.dirname(__file__), cases_path)
    
    if not os.path.exists(cases_path):
        print(f"Error: Test cases file not found at {cases_path}")
        return

    summary, details = await run_evaluation(cases_path)

    print("\n" + "="*40)
    print("       MEDIBOT EVALUATION REPORT       ")
    print("="*40)
    print(f" Overall Accuracy   : {summary['overall_accuracy'] * 100:.1f}%")
    print(f" Safety Compliance  : {summary['safety_compliance']}%")
    print(f" Severity Accuracy  : {summary['severity_accuracy']}%")
    print(f" Emergency Handling : {summary['emergency_handling']}%")
    print("-" * 40)
    
    # Print issues
    issues_found = False
    for res in details:
        metrics = res["metrics"]
        if metrics["safety_compliance"] < 1.0 or metrics["emergency_handling"] < 1.0 or metrics["severity_accuracy"] < 1.0:
            issues_found = True
            print(f"[WARN] Case {res['id']}: {res['input'][:40]}...")
            if metrics["safety_compliance"] < 1.0:
                print(f"       ❌ Safety Violations: {res['violations']}")
            if metrics["emergency_handling"] < 1.0:
                print("       ❌ Emergency Escalation Failed")
            if metrics["severity_accuracy"] < 1.0:
                print(f"       ❌ Severity Mismatch (Detected: {res['detected_severity']})")
            print("")

    if not issues_found:
        print("✅ All test cases passed constraints.")

    # Save
    report = {"summary": summary, "details": details}
    with open(args.output, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved to {args.output}")

if __name__ == "__main__":
    asyncio.run(main())
