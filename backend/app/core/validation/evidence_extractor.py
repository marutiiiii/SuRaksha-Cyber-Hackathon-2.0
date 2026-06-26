"""
Evidence extractor for the ReguFlow validation engine.
Extracts structured text and visual components from PDF/image evidence files.

Supports:
- Digital PDFs: direct PyMuPDF text extraction
- Scanned PDFs / images: Qwen2.5-VL OCR
"""
import os
import re
import time
import logging
from typing import Dict, List, Any

logger = logging.getLogger("uvicorn.error")


def extract_relevant_sections(evidence_text: str, task_description: str, max_chars: int = 4000) -> str:
    """
    Splits evidence text into chunks and selects the most relevant ones
    based on keyword overlap with the task description, up to max_chars.
    """
    if len(evidence_text) <= max_chars:
        return evidence_text

    stop_words = {
        "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
        "at", "by", "from", "for", "with", "about", "against", "between",
        "into", "through", "during", "before", "after", "above", "below",
        "to", "of", "in", "on", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "having", "do", "does", "did", "doing",
        "must", "should", "will", "would", "can", "could", "may", "might", "shall",
    }

    task_words = set(re.findall(r"[a-zA-Z0-9_]+", task_description.lower()))
    task_keywords = task_words - stop_words or task_words

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", evidence_text) if p.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in evidence_text.split("\n") if line.strip()]

    scored = []
    for p in paragraphs:
        p_words = set(re.findall(r"[a-zA-Z0-9_]+", p.lower()))
        scored.append((len(task_keywords.intersection(p_words)), p))

    scored.sort(key=lambda x: x[0], reverse=True)

    selected, current_len = [], 0
    for score, p in scored:
        if current_len + len(p) + 2 <= max_chars:
            selected.append(p)
            current_len += len(p) + 2
        else:
            remaining = max_chars - current_len - 5
            if remaining > 100:
                selected.append(p[:remaining] + "...")
            break

    return "\n\n".join(selected)


def extract_evidence_details(file_path: str, task_description: str = "") -> Dict[str, Any]:
    """
    Extract structured components from a PDF or image file.

    Returns:
        {
          "text": [],
          "objects": [],
          "screens": [],
          "tables": [],
          "num_pages": int
        }
    """
    from app.core.validation.image_utils import convert_pdf_to_images, validate_image
    from app.core.validation.timing_tracker import tracker

    file_ext = os.path.splitext(file_path)[1].lower()
    image_files: List[str] = []
    pdf_text = ""
    num_pages = 1

    # ── 1. Determine file type ──────────────────────────────────────────────────

    if file_ext == ".pdf":
        logger.info(f"[Validation] PDF extraction started: {file_path}")
        t_ext = time.time()
        try:
            import fitz
            doc = fitz.open(file_path)
            num_pages = len(doc)
            for page in doc:
                pdf_text += page.get_text() + "\n"
            doc.close()
        except Exception as e:
            logger.warning(f"[Validation] Error reading native PDF text: {e}")
        tracker.add_pdf_extraction(time.time() - t_ext)

        if pdf_text.strip():
            logger.info(
                f"[Validation] Digital PDF detected. Extracted {len(pdf_text)} chars. Skipping image conversion."
            )
        else:
            logger.info("[Validation] Scanned/image-only PDF detected. Converting pages to images for OCR...")
            t_conv = time.time()
            try:
                image_files = convert_pdf_to_images(file_path)
                for img in image_files:
                    if not validate_image(img):
                        raise ValueError(f"Rendered page image is corrupted: {img}")
            except Exception as e:
                logger.error(f"[Validation] Error rendering PDF pages: {e}")
                raise e
            tracker.add_image_conversion(time.time() - t_conv)
            num_pages = len(image_files)

    elif file_ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]:
        if not validate_image(file_path):
            raise ValueError(f"Uploaded image is corrupted or invalid: {file_path}")
        image_files = [file_path]
        num_pages = 1
    else:
        raise ValueError(f"Unsupported file format for validation: {file_ext}")

    combined_result: Dict[str, Any] = {
        "text": [],
        "objects": [],
        "screens": [],
        "tables": [],
        "num_pages": num_pages,
    }

    # ── 2. Extract evidence details ─────────────────────────────────────────────

    if pdf_text.strip():
        # Digital PDF path: direct text + Qwen text analysis
        lines = [line.strip() for line in pdf_text.split("\n") if line.strip()]
        combined_result["text"].extend(lines)

        processed_text = pdf_text
        if len(processed_text) > 4000 and task_description:
            processed_text = extract_relevant_sections(processed_text, task_description)

        t_prompt = time.time()
        prompt = f"""Analyze the provided document text.
Extract and categorize structural components into:
1. text: A list of key text snippets, headings, settings, policy headers, or notices.
2. objects: A list of visual interface components, graphics, or items mentioned or implied.
3. screens: A list of screen designs, page types, or UI frames described.
4. tables: A list of table descriptions or data rows extracted from tables.

Your response must be a JSON object with this exact schema:
{{
  "text": ["extracted text line 1", "extracted text line 2"],
  "objects": ["object name 1", "object name 2"],
  "screens": ["screen type/name"],
  "tables": ["table data or description 1"]
}}

Document Text:
{processed_text}
"""
        messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]

        from app.core.validation.timing_tracker import tracker as _tracker
        _tracker.add_prompt_generation(time.time() - t_prompt)

        try:
            from app.core.validation.qwen_service import run_qwen_json_inference, model_ready
            if model_ready:
                page_data = run_qwen_json_inference(messages, max_tokens=1000)
                for key in ["text", "objects", "screens", "tables"]:
                    if key in page_data and isinstance(page_data[key], list):
                        for item in page_data[key]:
                            if item and item not in combined_result[key]:
                                combined_result[key].append(item)
        except Exception as e:
            logger.warning(f"[Validation] Qwen text extraction skipped: {e}")

    else:
        # Scanned PDF or image path: Qwen vision OCR
        prompt = """Analyze the provided evidence image/document page.
Extract and categorize structural and visual components into:
1. text: A list of key visible text snippets, headings, settings, policy headers, or notices.
2. objects: A list of visual interface components, graphics, or items.
3. screens: A list of screen designs, page types, or UI frames identified.
4. tables: A list of table descriptions or data rows extracted from visible tables.

Your response must be a JSON object with this exact schema:
{{
  "text": ["extracted text line 1", "extracted text line 2"],
  "objects": ["object name 1", "object name 2"],
  "screens": ["screen type/name"],
  "tables": ["table data or description 1"]
}}
"""
        for idx, img_path in enumerate(image_files):
            logger.info(f"[Validation] Analyzing page {idx + 1}/{len(image_files)}: {img_path}")
            t_prompt = time.time()
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": img_path},
                        {"type": "text", "text": prompt},
                    ],
                }
            ]
            from app.core.validation.timing_tracker import tracker as _tracker
            _tracker.add_prompt_generation(time.time() - t_prompt)

            try:
                from app.core.validation.qwen_service import run_qwen_json_inference, model_ready
                if model_ready:
                    page_data = run_qwen_json_inference(messages, max_tokens=1000)
                    for key in ["text", "objects", "screens", "tables"]:
                        if key in page_data and isinstance(page_data[key], list):
                            for item in page_data[key]:
                                if item and item not in combined_result[key]:
                                    combined_result[key].append(item)
            except Exception as e:
                logger.warning(f"[Validation] Qwen image extraction error for {img_path}: {e}")

            # Clean up temp images generated from PDF
            if file_ext == ".pdf" and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception:
                    pass

    # ── 3. Deduplicate text items ───────────────────────────────────────────────
    seen_text: set = set()
    deduped: List[str] = []
    for t in combined_result["text"]:
        clean_t = " ".join(t.split())
        if clean_t and clean_t.lower() not in seen_text:
            seen_text.add(clean_t.lower())
            deduped.append(clean_t)
    combined_result["text"] = deduped

    logger.info(f"[Validation] Text extraction completed. Pages: {num_pages}, Text items: {len(combined_result['text'])}")
    return combined_result
