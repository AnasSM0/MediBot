"""
Test script to verify the hybrid API workflow
Tests both text-only and image upload endpoints
"""

import sys
import os

# Add parent directory to path to import api_monitor
sys.path.insert(0, os.path.dirname(__file__))

from api_monitor import get_usage_stats, print_usage_report

def test_workflow():
    """
    Run this after making some test requests to verify the workflow.
    
    Expected behavior:
    1. Text-only chats should use OpenRouter (or local fallback)
    2. Image uploads should use Gemini for vision + OpenRouter for reasoning
    3. Gemini should ONLY be called for vision tasks
    """
    
    print("\n" + "="*60)
    print("HYBRID API WORKFLOW VERIFICATION")
    print("="*60 + "\n")
    
    print("📋 Instructions:")
    print("1. Make some test requests to your API:")
    print("   - Send a few text-only chat messages")
    print("   - Upload 1-2 images with questions")
    print("2. Run this script to verify the workflow\n")
    
    stats = get_usage_stats(hours=1)  # Last hour
    
    if stats["total_calls"] == 0:
        print("⚠️  No API calls detected in the last hour.")
        print("   Make some test requests first, then run this script again.\n")
        return
    
    print_usage_report(hours=1)
    
    # Verification checks
    print("\n" + "="*60)
    print("VERIFICATION CHECKS")
    print("="*60 + "\n")
    
    gemini_calls = stats["by_provider"]["gemini"]
    openrouter_calls = stats["by_provider"]["openrouter"]
    local_calls = stats["by_provider"]["local"]
    vision_calls = stats["by_type"]["vision"]
    text_calls = stats["by_type"]["text"]
    reasoning_calls = stats["by_type"]["reasoning"]
    
    checks_passed = 0
    total_checks = 0
    
    # Check 1: Gemini should only be used for vision
    total_checks += 1
    print(f"Check 1: Gemini used only for vision tasks")
    if gemini_calls == vision_calls:
        print(f"  ✅ PASS - Gemini calls ({gemini_calls}) = Vision calls ({vision_calls})")
        checks_passed += 1
    elif gemini_calls == 0:
        print(f"  ℹ️  INFO - No Gemini calls (no images uploaded)")
        checks_passed += 1
    else:
        print(f"  ❌ FAIL - Gemini calls ({gemini_calls}) != Vision calls ({vision_calls})")
        print(f"     Gemini is being used for non-vision tasks!")
    
    # Check 2: OpenRouter should handle text reasoning
    total_checks += 1
    print(f"\nCheck 2: OpenRouter handles text reasoning")
    if openrouter_calls > 0 or local_calls > 0:
        print(f"  ✅ PASS - Text reasoning is handled by OpenRouter ({openrouter_calls}) or Local ({local_calls})")
        checks_passed += 1
    else:
        print(f"  ⚠️  WARN - No OpenRouter or Local calls detected")
    
    # Check 3: Image uploads should trigger both vision and reasoning
    total_checks += 1
    print(f"\nCheck 3: Image uploads trigger vision + reasoning")
    if vision_calls > 0:
        if reasoning_calls >= vision_calls:
            print(f"  ✅ PASS - Each vision call ({vision_calls}) has corresponding reasoning ({reasoning_calls})")
            checks_passed += 1
        else:
            print(f"  ⚠️  WARN - Vision calls ({vision_calls}) > Reasoning calls ({reasoning_calls})")
            print(f"     Some images may not have been processed for reasoning")
    else:
        print(f"  ℹ️  INFO - No images uploaded in this test period")
        checks_passed += 1
    
    # Check 4: API conservation
    total_checks += 1
    print(f"\nCheck 4: API request conservation")
    if gemini_calls <= vision_calls:
        print(f"  ✅ PASS - Gemini usage is minimized ({gemini_calls} calls)")
        checks_passed += 1
    else:
        print(f"  ❌ FAIL - Gemini usage is higher than expected")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY: {checks_passed}/{total_checks} checks passed")
    print(f"{'='*60}\n")
    
    if checks_passed == total_checks:
        print("🎉 All checks passed! Your hybrid API workflow is working correctly.")
    elif checks_passed >= total_checks - 1:
        print("✅ Workflow is mostly correct. Review warnings above.")
    else:
        print("⚠️  Issues detected. Please review the failed checks above.")
    
    print()

if __name__ == "__main__":
    test_workflow()
