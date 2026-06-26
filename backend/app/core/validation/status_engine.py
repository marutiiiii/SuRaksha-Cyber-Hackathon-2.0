"""
Status engine for the ReguFlow validation engine.
Takes requirement matcher output and determines final compliance status,
confidence score, and professional audit reasoning using Qwen.
"""
import time
import logging
from typing import Dict, Any

logger = logging.getLogger("uvicorn.error")


def determine_compliance_status(
    matcher_output: Dict[str, Any], task_description: str
) -> Dict[str, Any]:
    """
    Determine final compliance status from requirement matcher results.

    Returns:
        {
          "status": "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
          "confidence": float,
          "reason": str
        }
    """
    from app.core.validation.timing_tracker import tracker

    # Fast-path: high-confidence keyword bypass
    if matcher_output.get("bypass_qwen"):
        return {
            "status": "COMPLETED",
            "confidence": matcher_output.get("confidence", 0.95),
            "reason": (
                f"Verification successfully completed via fast-path keyword and semantic matching "
                f"(Confidence: {matcher_output.get('confidence', 0.95) * 100:.1f}%)."
            ),
        }

    score = matcher_output.get("score", 0.0)
    matched = matcher_output.get("matched", [])
    missing = matcher_output.get("missing", [])

    # ── Deterministic status bounds ─────────────────────────────────────────────
    if score >= 0.95 and len(missing) == 0:
        proposed_status = "COMPLETED"
    elif score <= 0.05 or len(matched) == 0:
        proposed_status = "NOT_STARTED"
    else:
        proposed_status = "IN_PROGRESS"

    # ── Qwen LLM for professional rationale ────────────────────────────────────
    t_prompt = time.time()
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
1. Review the proposed compliance status. Adjust only if critical missing elements warrant it.
2. Determine a confidence score (float 0.0 to 1.0):
   - High (0.90+): Evidence clearly proves or disproves compliance.
   - Lower (<0.80): Evidence is blurry, partial, or hard to interpret.
3. Write a professional, user-facing reason (1-2 sentences) summarizing the evaluation.
   - COMPLETED: Confirm all requirements are satisfied.
   - IN_PROGRESS: Describe what has started and what is still missing.
   - NOT_STARTED: State that no relevant evidence was found.

Your response must be a JSON object:
{{
  "status": "NOT_STARTED|IN_PROGRESS|COMPLETED",
  "confidence": 0.95,
  "reason": "Clear explanation of status..."
}}
"""
    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
    tracker.add_prompt_generation(time.time() - t_prompt)

    result: Dict[str, Any] = {}
    try:
        from app.core.validation.qwen_service import run_qwen_json_inference, model_ready
        if model_ready:
            logger.info(f"[Validation] Generating compliance status (proposed: {proposed_status})...")
            result = run_qwen_json_inference(messages, max_tokens=500)
        else:
            logger.warning("[Validation] Qwen not ready, using deterministic status.")
    except Exception as e:
        logger.warning(f"[Validation] Status LLM failed: {e}")

    # ── Fallback to deterministic values ────────────────────────────────────────
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
            reason = "Implementation has started but some requirements are still incomplete."
        else:
            reason = "No evidence supporting implementation was found."

    return {"status": status, "confidence": confidence, "reason": reason}
