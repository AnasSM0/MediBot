"""
API Usage Monitor for MediBot
Tracks and logs API calls to Gemini and OpenRouter
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Literal

# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

API_USAGE_LOG = LOGS_DIR / "api_usage.jsonl"

from utils.logger import setup_logger

logger = setup_logger("api_monitor")

def log_api_call(
    provider: Literal["gemini", "openrouter", "local"],
    endpoint: str,
    request_type: Literal["text", "vision", "reasoning"],
    success: bool = True,
    error: str | None = None,
    metadata: dict | None = None
):
    """
    Log an API call for monitoring and debugging.
    
    Args:
        provider: API provider (gemini, openrouter, local)
        endpoint: API endpoint called (e.g., /chat, /chat/image)
        request_type: Type of request (text, vision, reasoning)
        success: Whether the request succeeded
        error: Error message if failed
        metadata: Additional metadata (e.g., model name, session_id)
    """
    log_data = {
        "event": "api_call",
        "provider": provider,
        "endpoint": endpoint,
        "request_type": request_type,
        "success": success,
        "error": error, 
        "metadata": metadata or {}
    }
    
    if success:
        logger.info(json.dumps(log_data))
    else:
        logger.error(json.dumps(log_data))

    # Append to JSONL file (keeping legacy file log for stats command)
    try:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            **log_data
        }
        with open(API_USAGE_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write to API usage log: {e}")

def get_usage_stats(hours: int = 24) -> dict:
    """
    Get API usage statistics for the last N hours.
    
    Args:
        hours: Number of hours to look back
        
    Returns:
        Dictionary with usage statistics
    """
    if not API_USAGE_LOG.exists():
        return {
            "total_calls": 0,
            "by_provider": {},
            "by_type": {},
            "errors": 0
        }
    
    from datetime import timedelta
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    stats = {
        "total_calls": 0,
        "by_provider": {"gemini": 0, "openrouter": 0, "local": 0},
        "by_type": {"text": 0, "vision": 0, "reasoning": 0},
        "errors": 0,
        "success_rate": 0.0
    }
    
    with open(API_USAGE_LOG, "r", encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line.strip())
                entry_time = datetime.fromisoformat(entry["timestamp"])
                
                if entry_time >= cutoff_time:
                    stats["total_calls"] += 1
                    stats["by_provider"][entry["provider"]] += 1
                    stats["by_type"][entry["request_type"]] += 1
                    if not entry["success"]:
                        stats["errors"] += 1
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
    
    if stats["total_calls"] > 0:
        stats["success_rate"] = (stats["total_calls"] - stats["errors"]) / stats["total_calls"] * 100
    
    return stats

def print_usage_report(hours: int = 24):
    """Print a formatted usage report."""
    stats = get_usage_stats(hours)
    
    print(f"\n{'='*50}")
    print(f"MediBot API Usage Report (Last {hours} hours)")
    print(f"{'='*50}\n")
    
    print(f"Total API Calls: {stats['total_calls']}")
    print(f"Success Rate: {stats['success_rate']:.1f}%")
    print(f"Errors: {stats['errors']}\n")
    
    print("By Provider:")
    print(f"  Gemini:     {stats['by_provider']['gemini']:>5} calls")
    print(f"  OpenRouter: {stats['by_provider']['openrouter']:>5} calls")
    print(f"  Local:      {stats['by_provider']['local']:>5} calls\n")
    
    print("By Request Type:")
    print(f"  Text:       {stats['by_type']['text']:>5} calls")
    print(f"  Vision:     {stats['by_type']['vision']:>5} calls")
    print(f"  Reasoning:  {stats['by_type']['reasoning']:>5} calls\n")
    
    # Calculate efficiency
    gemini_calls = stats['by_provider']['gemini']
    vision_calls = stats['by_type']['vision']
    
    print("Efficiency Analysis:")
    if vision_calls > 0:
        efficiency = (gemini_calls / vision_calls) * 100
        print(f"  Gemini calls per vision request: {gemini_calls / vision_calls:.2f}")
        if efficiency > 110:
            print("  ⚠️  WARNING: Gemini usage higher than expected!")
            print("     Check if text chats are using Gemini.")
        else:
            print("  ✅ Gemini usage is optimized (vision only)")
    else:
        if gemini_calls > 0:
            print("  ⚠️  WARNING: Gemini calls detected with no vision requests!")
            print("     Text chats should use OpenRouter, not Gemini.")
        else:
            print("  ✅ No Gemini calls (no images uploaded)")
    
    print(f"\n{'='*50}\n")

if __name__ == "__main__":
    import sys
    
    # Allow custom time range via command line
    hours = int(sys.argv[1]) if len(sys.argv) > 1 else 24
    print_usage_report(hours)
