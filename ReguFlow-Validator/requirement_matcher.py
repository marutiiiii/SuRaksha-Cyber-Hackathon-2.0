import re
import time
from typing import Dict, Any, List
from services.qwen_service import run_qwen_json_inference
from utils.timing_tracker import tracker

def match_requirements(task_description: str, extracted_evidence: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Compare the extracted evidence (text, objects, screens, tables) against the task requirement.
    Uses a hybrid pipeline:
    1. Keyword matching & semantic similarity calculation.
    2. If confidence >= 85%, verify compliance without Qwen.
    3. If confidence < 85%, fall back to Qwen inference.
    """
    # 1. Prepare and clean text words (ignoring stop words, digits, dates and metadata)
    stop_words = {"the", "a", "an", "and", "or", "but", "if", "then", "else", "when", 
                  "at", "by", "from", "for", "with", "about", "against", "between", 
                  "into", "through", "during", "before", "after", "above", "below", 
                  "to", "of", "in", "on", "is", "are", "was", "were", "be", "been", 
                  "being", "have", "has", "had", "having", "do", "does", "did", "doing",
                  "must", "should", "will", "would", "can", "could", "may", "might", "shall",
                  "their", "his", "her", "its", "our", "us", "we", "they", "them", "you", "your"}
                  
    metadata_words = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
                      "2024", "2025", "2026", "2027", "2028", "2029", "2030", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
                      "deadline", "department", "task", "requirement", "assigned", "compliance", "regulation", "proof", "evidence", "implementation", "status"}
    
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
        # Extract alphanumeric words, excluding pure digits and metadata terms
        raw_words = re.findall(r'[a-zA-Z0-9_]+', text.lower())
        result = []
        for w in raw_words:
            if w in stop_words or w in metadata_words:
                continue
            if w.isdigit():
                continue
            result.append(stem_word(w))
        return result

    # Combine all evidence sources
    evidence_text_combined = " ".join(extracted_evidence.get("text", [])) + " " + \
                             " ".join(extracted_evidence.get("objects", [])) + " " + \
                             " ".join(extracted_evidence.get("screens", [])) + " " + \
                             " ".join(extracted_evidence.get("tables", []))
                             
    task_clean = clean_words(task_description)
    evidence_clean = clean_words(evidence_text_combined)
    
    task_words_set = set(task_clean)
    evidence_words_set = set(evidence_clean)
    
    # Calculate Keyword Matching Score
    if not task_words_set:
        keyword_score = 0.0
    else:
        keyword_score = len(task_words_set.intersection(evidence_words_set)) / len(task_words_set)
        
    # Calculate Cosine Similarity & Containment
    task_tf = {}
    for w in task_clean:
        task_tf[w] = task_tf.get(w, 0) + 1
        
    evidence_tf = {}
    for w in evidence_clean:
        if w in task_words_set:
            evidence_tf[w] = evidence_tf.get(w, 0) + 1
            
    # Cosine Similarity
    dot_product = sum(task_tf[w] * evidence_tf.get(w, 0) for w in task_words_set)
    task_norm = sum(tf ** 2 for tf in task_tf.values()) ** 0.5
    evidence_norm = sum(tf ** 2 for tf in evidence_tf.values()) ** 0.5
    
    if task_norm > 0 and evidence_norm > 0:
        cosine_sim = dot_product / (task_norm * evidence_norm)
    else:
        cosine_sim = 0.0
        
    # Containment (Token-occurrence level match)
    total_task_occ = sum(task_tf.values())
    matched_task_occ = sum(min(task_tf[w], evidence_tf.get(w, 0)) for w in task_words_set)
    containment_score = matched_task_occ / total_task_occ if total_task_occ > 0 else 0.0
    
    # Final confidence score
    confidence_score = (keyword_score * 0.4) + (cosine_sim * 0.3) + (containment_score * 0.3)
    
    print(f"Hybrid pipeline confidence evaluation:")
    print(f"  - Keyword match score: {keyword_score:.4f}")
    print(f"  - Cosine similarity: {cosine_sim:.4f}")
    print(f"  - Containment score: {containment_score:.4f}")
    print(f"  - Combined confidence: {confidence_score:.4f}")
    
    # Check if we can bypass Qwen
    if confidence_score >= 0.85:
        print(f"Confidence score ({confidence_score:.4f}) >= 85%. Bypassing Qwen model inference!")
        matched_items = [f"Found keyword '{item}' matching task requirement" for item in task_words_set.intersection(evidence_words_set)]
        return {
            "matched": matched_items,
            "missing": [],
            "score": 1.0,
            "confidence": confidence_score,
            "bypass_qwen": True
        }
        
    # If confidence < 85%, fall back to Qwen for reasoning
    print(f"Confidence score ({confidence_score:.4f}) < 85%. Calling Qwen for reasoning...")
    
    # Format the extracted evidence for the Qwen prompt
    text_sample = "\n".join(extracted_evidence.get("text", []))[:2000] # Cap text length
    objects = ", ".join(extracted_evidence.get("objects", []))
    screens = ", ".join(extracted_evidence.get("screens", []))
    tables = "\n".join(extracted_evidence.get("tables", []))
    
    t_prompt_start = time.time()
    prompt = f"""You are a compliance auditing expert.
Your job is to match compliance requirements against details extracted from uploaded evidence (text and visual objects).

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
3. Compute a compliance score (a float between 0.0 and 1.0) representing the percentage of the task that has been implemented:
   - 1.0: Everything is fully implemented and verified by the evidence.
   - 0.1 to 0.9: Partially implemented (some elements exist, others are missing).
   - 0.0: No relevant evidence exists, or the evidence is completely unrelated.

Your response must be a JSON object with this exact schema:
{{
  "matched": ["Item A implemented", "Item B implemented"],
  "missing": ["Item C not shown in evidence"],
  "score": 0.85
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
    
    result = run_qwen_json_inference(messages, max_tokens=800)
    
    # Ensure keys exist
    if "matched" not in result:
        result["matched"] = []
    if "missing" not in result:
        result["missing"] = []
    if "score" not in result:
        if result["matched"] and not result["missing"]:
            result["score"] = 1.0
        elif not result["matched"]:
            result["score"] = 0.0
        else:
            result["score"] = 0.5
            
    # Clamp score between 0.0 and 1.0
    try:
        result["score"] = max(0.0, min(1.0, float(result["score"])))
    except (ValueError, TypeError):
        result["score"] = 0.0
        
    result["confidence"] = confidence_score
    result["bypass_qwen"] = False
    return result

