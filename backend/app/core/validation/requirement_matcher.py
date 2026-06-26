"""
Requirement matcher for the ReguFlow validation engine.
Hybrid pipeline:
  1. Keyword matching + cosine similarity
  2. If confidence >= 85%, bypass Qwen and return immediately
  3. If confidence < 85%, call Qwen for reasoning
"""
import re
import time
import logging
from typing import Dict, Any, List

logger = logging.getLogger("uvicorn.error")


def match_requirements(task_description: str, extracted_evidence: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Compare extracted evidence against the task requirement.

    Returns:
        {
          "matched": [...],
          "missing": [...],
          "score": float,
          "confidence": float,
          "bypass_qwen": bool
        }
    """
    from app.core.validation.timing_tracker import tracker

    stop_words = {
        "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
        "at", "by", "from", "for", "with", "about", "against", "between",
        "into", "through", "during", "before", "after", "above", "below",
        "to", "of", "in", "on", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "having", "do", "does", "did", "doing",
        "must", "should", "will", "would", "can", "could", "may", "might", "shall",
        "their", "his", "her", "its", "our", "us", "we", "they", "them", "you", "your",
    }

    metadata_words = {
        "january", "february", "march", "april", "may", "june", "july", "august",
        "september", "october", "november", "december",
        "2024", "2025", "2026", "2027", "2028", "monday", "tuesday", "wednesday",
        "thursday", "friday", "saturday", "sunday",
        "deadline", "department", "task", "requirement", "assigned", "compliance",
        "regulation", "proof", "evidence", "implementation", "status",
    }

    def stem_word(w: str) -> str:
        if len(w) <= 3:
            return w
        if w.endswith("ing"):
            w = w[:-3]
        elif w.endswith("ed"):
            w = w[:-2]
            if w.endswith("i"):
                w = w[:-1] + "y"
        elif w.endswith("es"):
            w = w[:-2]
        elif w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        elif w.endswith("tion") or w.endswith("sion"):
            w = w[:-4]
        elif w.endswith("ly"):
            w = w[:-2]
        return w

    def clean_words(text: str) -> List[str]:
        raw = re.findall(r"[a-zA-Z0-9_]+", text.lower())
        result = []
        for w in raw:
            if w in stop_words or w in metadata_words or w.isdigit():
                continue
            result.append(stem_word(w))
        return result

    # Combine all evidence sources
    evidence_combined = (
        " ".join(extracted_evidence.get("text", []))
        + " "
        + " ".join(extracted_evidence.get("objects", []))
        + " "
        + " ".join(extracted_evidence.get("screens", []))
        + " "
        + " ".join(extracted_evidence.get("tables", []))
    )

    task_clean = clean_words(task_description)
    evidence_clean = clean_words(evidence_combined)

    task_set = set(task_clean)
    evidence_set = set(evidence_clean)

    # ── Keyword matching score ──────────────────────────────────────────────────
    keyword_score = (
        len(task_set.intersection(evidence_set)) / len(task_set) if task_set else 0.0
    )

    # ── Cosine similarity ───────────────────────────────────────────────────────
    task_tf: Dict[str, int] = {}
    for w in task_clean:
        task_tf[w] = task_tf.get(w, 0) + 1

    evidence_tf: Dict[str, int] = {}
    for w in evidence_clean:
        if w in task_set:
            evidence_tf[w] = evidence_tf.get(w, 0) + 1

    dot = sum(task_tf[w] * evidence_tf.get(w, 0) for w in task_set)
    task_norm = sum(tf ** 2 for tf in task_tf.values()) ** 0.5
    evidence_norm = sum(tf ** 2 for tf in evidence_tf.values()) ** 0.5
    cosine_sim = (dot / (task_norm * evidence_norm)) if task_norm > 0 and evidence_norm > 0 else 0.0

    # ── Containment score ───────────────────────────────────────────────────────
    total_task_occ = sum(task_tf.values())
    matched_occ = sum(min(task_tf[w], evidence_tf.get(w, 0)) for w in task_set)
    containment = matched_occ / total_task_occ if total_task_occ > 0 else 0.0

    # ── Combined confidence ─────────────────────────────────────────────────────
    confidence_score = (keyword_score * 0.4) + (cosine_sim * 0.3) + (containment * 0.3)

    logger.info(
        f"[Validation] Hybrid scores → keyword: {keyword_score:.3f}, "
        f"cosine: {cosine_sim:.3f}, containment: {containment:.3f}, "
        f"combined: {confidence_score:.3f}"
    )

    # ── Fast-path: bypass Qwen if confidence is high ────────────────────────────
    if confidence_score >= 0.85:
        logger.info(f"[Validation] Confidence {confidence_score:.3f} >= 85%. Bypassing Qwen.")
        matched_items = [
            f"Found keyword '{item}' matching task requirement"
            for item in task_set.intersection(evidence_set)
        ]
        return {
            "matched": matched_items,
            "missing": [],
            "score": 1.0,
            "confidence": confidence_score,
            "bypass_qwen": True,
        }

    # ── Qwen fallback ───────────────────────────────────────────────────────────
    logger.info(f"[Validation] Confidence {confidence_score:.3f} < 85%. Calling Qwen for reasoning...")

    text_sample = "\n".join(extracted_evidence.get("text", []))[:2000]
    objects = ", ".join(extracted_evidence.get("objects", []))
    screens = ", ".join(extracted_evidence.get("screens", []))
    tables = "\n".join(extracted_evidence.get("tables", []))

    t_prompt = time.time()
    prompt = f"""You are a compliance auditing expert.
Your job is to match compliance requirements against details extracted from uploaded evidence.

Task/Requirement:
"{task_description}"

Extracted Evidence details:
- Visible Text:
{text_sample if text_sample else "(No visible text extracted)"}

- Visual Objects Found:
{objects if objects else "(No visual objects found)"}

- Screen/Document Types Identified:
{screens if screens else "(No screen/document types identified)"}

- Tables Found:
{tables if tables else "(No tables found)"}

Instructions:
1. Identify which sub-requirements or elements of the task are satisfied ("matched").
2. Identify which elements are still missing or not demonstrated by the evidence ("missing").
3. Compute a compliance score (float 0.0 to 1.0):
   - 1.0: Everything fully implemented and verified.
   - 0.1-0.9: Partially implemented.
   - 0.0: No relevant evidence or completely unrelated.

Your response must be a JSON object with this exact schema:
{{
  "matched": ["Item A implemented", "Item B implemented"],
  "missing": ["Item C not shown in evidence"],
  "score": 0.85
}}
"""
    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
    tracker.add_prompt_generation(time.time() - t_prompt)

    result: Dict[str, Any] = {}
    try:
        from app.core.validation.qwen_service import run_qwen_json_inference, model_ready
        if model_ready:
            result = run_qwen_json_inference(messages, max_tokens=800)
        else:
            logger.warning("[Validation] Qwen not ready, using keyword-only results.")
    except Exception as e:
        logger.warning(f"[Validation] Qwen matching failed: {e}")

    # Ensure required keys
    result.setdefault("matched", [])
    result.setdefault("missing", [])
    if "score" not in result:
        if result["matched"] and not result["missing"]:
            result["score"] = 1.0
        elif not result["matched"]:
            result["score"] = 0.0
        else:
            result["score"] = 0.5

    try:
        result["score"] = max(0.0, min(1.0, float(result["score"])))
    except (ValueError, TypeError):
        result["score"] = 0.0

    result["confidence"] = confidence_score
    result["bypass_qwen"] = False
    return result
