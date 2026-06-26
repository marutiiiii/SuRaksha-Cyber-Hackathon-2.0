import time
from typing import Dict, Any
from app.core.qwen_service import run_qwen_json_inference
from app.core.timing_tracker import tracker

def determine_compliance_status(matcher_output: Dict[str, Any], task_description: str) -> Dict[str, Any]:
    """
    Take the output of requirement_matcher.py and determine the final status, confidence, and reason.
    Bypasses Qwen calls entirely to run locally and instantly.
    """
    score = matcher_output.get("score", 0.0)
    matched = matcher_output.get("matched", [])
    missing = matcher_output.get("missing", [])
    
    # User status rules:
    # - 100% completed: status = COMPLETED
    # - 0% completed: status = Pending (reverts)
    # - More than 0% and less than 100%: status = IN_PROGRESS
    if score >= 1.0 or len(missing) == 0:
        status = "COMPLETED"
        reason = f"All compliance requirements satisfied: {', '.join(matched)}."
    elif score <= 0.0 or len(matched) == 0:
        status = "NOT_STARTED"
        reason = f"Compliance verification failed: 0% requirements met. Missing requirements: {', '.join(missing)}."
    else:
        status = "IN_PROGRESS"
        reason = f"Partial compliance matched {len(matched)}/{len(matched) + len(missing)} requirements ({int(score * 100)}%). Matched: {', '.join(matched)}. Missing: {', '.join(missing)}."
        
    return {
        "status": status,
        "confidence": matcher_output.get("confidence", 0.95),
        "reason": reason
    }
