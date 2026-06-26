import time
from typing import Dict, Any
from services.qwen_service import run_qwen_json_inference
from utils.timing_tracker import tracker

def determine_compliance_status(matcher_output: Dict[str, Any], task_description: str) -> Dict[str, Any]:
    """
    Take the output of requirement_matcher.py and determine the final status, confidence, and reason.
    """
    if matcher_output.get("bypass_qwen"):
        return {
            "status": "COMPLETED",
            "confidence": matcher_output.get("confidence", 0.95),
            "reason": f"Verification successfully completed via fast-path keyword and semantic matching (Confidence: {matcher_output.get('confidence', 0.95)*100:.1f}%)."
        }

    score = matcher_output.get("score", 0.0)
    matched = matcher_output.get("matched", [])
    missing = matcher_output.get("missing", [])
    
    # 1. Deterministic status bounds
    if score >= 0.95 and len(missing) == 0:
        proposed_status = "COMPLETED"
    elif score <= 0.05 or len(matched) == 0:
        proposed_status = "NOT_STARTED"
    else:
        proposed_status = "IN_PROGRESS"
        
    # 2. Call LLM to generate a professional rationale and refine confidence
    t_prompt_start = time.time()
    prompt = f"""You are a compliance audit system.
Based on the requirement matching audit results, evaluate the compliance status.

Task/Requirement:
"{task_description}"

Audit Matching Results:
- Compliance Score: {score}
- Matched Requirements: {matched}
- Missing Requirements: {missing}
- Proposed Status: {proposed_status}

Instructions:
1. Review the proposed compliance status. If it should be adjusted based on critical missing elements, you may adjust it.
2. Determine a confidence score (float between 0.0 and 1.0) indicating how reliable this audit decision is.
   - High confidence (0.90+) if evidence clearly proves or disproves compliance.
   - Lower confidence (<0.80) if evidence is blurry, partial, or hard to interpret.
3. Write a professional, user-facing reason (1-2 sentences) summarizing the compliance evaluation.
   - For COMPLETED: Confirm all requirements are satisfied.
   - For IN_PROGRESS: Describe what has been started and what is still missing.
   - For NOT_STARTED: State that no relevant evidence was found.

Your response must be a JSON object with this exact schema:
{{
  "status": "NOT_STARTED|IN_PROGRESS|COMPLETED",
  "confidence": 0.95,
  "reason": "Clear explanation of status..."
}}
"""

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt}
            ]
        }
    ]
    tracker.add_prompt_generation(time.time() - t_prompt_start)
    
    print(f"Generating compliance status decision (Proposed: {proposed_status})...")
    try:
        result = run_qwen_json_inference(messages, max_tokens=500)
    except Exception as e:
        print(f"Error calling status LLM: {e}")
        result = {}

        
    # Fallback to deterministic values if LLM failed
    status = result.get("status", proposed_status)
    if status not in ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]:
        status = proposed_status
        
    confidence = result.get("confidence")
    if confidence is None:
        confidence = 0.95 if status in ["NOT_STARTED", "COMPLETED"] else 0.85
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except (ValueError, TypeError):
        confidence = 0.90
        
    reason = result.get("reason")
    if not reason:
        if status == "COMPLETED":
            reason = "All requirements from the regulation have been satisfied."
        elif status == "IN_PROGRESS":
            reason = "Implementation has started but is incomplete."
        else:
            reason = "No evidence supporting implementation was found."
            
    return {
        "status": status,
        "confidence": confidence,
        "reason": reason
    }
