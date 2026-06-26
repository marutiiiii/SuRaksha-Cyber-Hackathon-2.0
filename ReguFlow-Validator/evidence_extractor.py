import os
import re
import fitz  # PyMuPDF
import time
from typing import Dict, List, Any
from services.qwen_service import run_qwen_json_inference
from utils.image_utils import convert_pdf_to_images, validate_image
from utils.timing_tracker import tracker

def extract_relevant_sections(evidence_text: str, task_description: str, max_chars: int = 4000) -> str:
    """
    Splits the evidence text into chunks and selects the most relevant chunks 
    based on overlap with the task description until the max_chars limit is reached.
    """
    if len(evidence_text) <= max_chars:
        return evidence_text
        
    stop_words = {"the", "a", "an", "and", "or", "but", "if", "then", "else", "when", 
                  "at", "by", "from", "for", "with", "about", "against", "between", 
                  "into", "through", "during", "before", "after", "above", "below", 
                  "to", "of", "in", "on", "is", "are", "was", "were", "be", "been", 
                  "being", "have", "has", "had", "having", "do", "does", "did", "doing",
                  "must", "should", "will", "would", "can", "could", "may", "might", "shall"}
                  
    task_words = set(re.findall(r'[a-zA-Z0-9_]+', task_description.lower()))
    task_keywords = task_words - stop_words
    if not task_keywords:
        task_keywords = task_words
        
    # Split by paragraphs or single lines
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', evidence_text) if p.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in evidence_text.split('\n') if line.strip()]
        
    scored_paragraphs = []
    for p in paragraphs:
        p_words = set(re.findall(r'[a-zA-Z0-9_]+', p.lower()))
        match_count = len(task_keywords.intersection(p_words))
        scored_paragraphs.append((match_count, p))
        
    scored_paragraphs.sort(key=lambda x: x[0], reverse=True)
    
    selected_chunks = []
    current_len = 0
    for score, p in scored_paragraphs:
        if current_len + len(p) + 2 <= max_chars:
            selected_chunks.append(p)
            current_len += len(p) + 2
        else:
            remaining_room = max_chars - current_len - 5
            if remaining_room > 100:
                selected_chunks.append(p[:remaining_room] + "...")
            break
            
    return "\n\n".join(selected_chunks)

def extract_evidence_details(file_path: str, task_description: str = "") -> Dict[str, Any]:
    """
    Extract structured components from a PDF or image file:
    {
      "text": [],
      "objects": [],
      "screens": [],
      "tables": []
    }
    """
    file_ext = os.path.splitext(file_path)[1].lower()
    image_files = []
    pdf_text = ""
    num_pages = 1
    
    # 1. Determine file type and get text/image frames
    if file_ext == ".pdf":
        print("PDF extraction started")
        t_ext_start = time.time()
        try:
            doc = fitz.open(file_path)
            num_pages = len(doc)
            for page in doc:
                pdf_text += page.get_text() + "\n"
            doc.close()
        except Exception as e:
            print(f"Error reading native PDF text: {e}")
        tracker.add_pdf_extraction(time.time() - t_ext_start)
            
        # Check if native text was extracted
        if pdf_text.strip():
            print(f"Digital PDF detected. Extracted {len(pdf_text)} characters of text directly. Skipping image conversion.")
        else:
            print("Scanned or image-only PDF detected. Converting pages to images for OCR...")
            t_conv_start = time.time()
            try:
                image_files = convert_pdf_to_images(file_path)
                for img in image_files:
                    if not validate_image(img):
                        raise ValueError(f"Rendered page image is corrupted or invalid: {img}")
            except Exception as e:
                print(f"Error rendering PDF pages: {e}")
                raise e
            tracker.add_image_conversion(time.time() - t_conv_start)
            num_pages = len(image_files)
    elif file_ext in [".png", ".jpg", ".jpeg", ".bmp"]:
        if not validate_image(file_path):
            raise ValueError(f"Uploaded image is corrupted or invalid: {file_path}")
        image_files = [file_path]
        num_pages = 1
    else:
        raise ValueError(f"Unsupported file format: {file_ext}")
        
    combined_result = {
        "text": [],
        "objects": [],
        "screens": [],
        "tables": []
    }
    
    # 2. Extract visual/textual information
    if pdf_text.strip():
        # Clean native PDF text lines
        lines = [line.strip() for line in pdf_text.split("\n") if line.strip()]
        combined_result["text"].extend(lines)
        
        # Handle large document chunking for prompt
        processed_text = pdf_text
        if len(processed_text) > 4000 and task_description:
            processed_text = extract_relevant_sections(processed_text, task_description)
            
        t_prompt_start = time.time()
        prompt = f"""Analyze the provided document text.
Extract and categorize structural components into:
1. text: A list of key text snippets, headings, settings, policy headers, or notices.
2. objects: A list of visual interface components, graphics, or items mentioned or implied (e.g., "cyber awareness banner", "submit button", "bank logo", "checkbox").
3. screens: A list of screen designs, page types, or UI frames described (e.g., "Login Page", "Dashboard", "Compliance Certificate").
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
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt}
                ]
            }
        ]
        tracker.add_prompt_generation(time.time() - t_prompt_start)
        
        try:
            page_data = run_qwen_json_inference(messages, max_tokens=1000)
            for key in ["text", "objects", "screens", "tables"]:
                if key in page_data and isinstance(page_data[key], list):
                    for item in page_data[key]:
                        if item and item not in combined_result[key]:
                            combined_result[key].append(item)
        except Exception as e:
            print(f"Error calling text-only Qwen extraction: {e}")
            
    else:
        # Scanned PDF or Image page-by-page Vision OCR
        prompt = """Analyze the provided evidence image/document page.
Extract and categorize structural and visual components into:
1. text: A list of key visible text snippets, headings, settings, policy headers, or notices.
2. objects: A list of visual interface components, graphics, or items (e.g., "cyber awareness banner", "submit button", "bank logo", "checkbox").
3. screens: A list of screen designs, page types, or UI frames identified (e.g., "Login Page", "Dashboard", "Compliance Certificate").
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
            print(f"Analyzing evidence page/image {idx+1}/{len(image_files)}: {img_path}")
            
            t_prompt_start = time.time()
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": img_path},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            tracker.add_prompt_generation(time.time() - t_prompt_start)
            
            try:
                page_data = run_qwen_json_inference(messages, max_tokens=1000)
                for key in ["text", "objects", "screens", "tables"]:
                    if key in page_data and isinstance(page_data[key], list):
                        for item in page_data[key]:
                            if item and item not in combined_result[key]:
                                combined_result[key].append(item)
            except Exception as e:
                print(f"Error extracting evidence details from {img_path}: {e}")
                
            # Clean up temporary page image files (only if we generated them from a PDF)
            if file_ext == ".pdf" and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception as ce:
                    print(f"Error cleaning up temporary file {img_path}: {ce}")
                    
    # Deduplicate text items while maintaining order
    seen_text = set()
    deduped_text = []
    for t in combined_result["text"]:
        clean_t = " ".join(t.split())
        if clean_t and clean_t.lower() not in seen_text:
            seen_text.add(clean_t.lower())
            deduped_text.append(clean_t)
    combined_result["text"] = deduped_text
    
    print(f"Text extraction completed. Pages processed: {num_pages}")
    return combined_result

