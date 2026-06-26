import os
import fitz  # PyMuPDF
from typing import Dict, Any
from services.qwen_service import run_qwen_json_inference

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract all text from a PDF file using PyMuPDF (fitz).
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")
        
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text.strip()

def extract_regulation_details(text_or_path: str) -> Dict[str, Any]:
    """
    Extract structured regulation details and task definitions using Qwen2.5-VL-3B-Instruct.
    Input can be a plain text string or a path to a PDF file.
    """
    # 1. Extract text
    if os.path.isfile(text_or_path) and text_or_path.lower().endswith(".pdf"):
        print(f"Extracting text from PDF file: {text_or_path}")
        regulation_text = extract_text_from_pdf(text_or_path)
    else:
        regulation_text = text_or_path
        
    if not regulation_text.strip():
        return {
            "title": "Empty Regulation",
            "changes": [],
            "tasks": [],
            "affected_entities": [],
            "summary": "No content provided."
        }
        
    # 2. Build LLM prompt
    prompt = f"""You are a regulatory compliance AI assistant.
Analyze the following regulation text and extract:
1. Title: A concise, descriptive title for the regulation.
2. Changes: A list of main policy/regulatory changes introduced.
3. Affected Entities: Which types of organizations or parties must comply (e.g., Banks, Payment Gateways, Compliance Officers, etc.).
4. Summary: A short summary (2-3 sentences) of the regulation.
5. Tasks: A list of actionable compliance tasks that different departments must execute to comply with this regulation.
   For each task, assign:
   - task: A clear, actionable description of the task.
   - department: The department responsible. Choose the most appropriate from: IT, Security, Compliance, Operations, Legal, HR.
   - deadline: The specific compliance deadline (format: YYYY-MM-DD). If no deadline is specified in the text, attempt to infer it or return "None".

Regulation Text:
---
{regulation_text}
---

Your response must be a JSON object with this exact schema:
{{
  "title": "Title string",
  "changes": ["Change description 1", "Change description 2"],
  "tasks": [
    {{
      "task": "Task description here",
      "department": "IT|Security|Compliance|Operations|Legal|HR",
      "deadline": "YYYY-MM-DD or None"
    }}
  ],
  "affected_entities": ["Entity A", "Entity B"],
  "summary": "Summary string"
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
    
    # 3. Call Qwen
    print("Task extraction started")
    try:
        result = run_qwen_json_inference(messages, max_tokens=1500)
        print("Tasks generated successfully")
    except Exception as e:
        print(f"Error during task extraction: {e}")
        raise e
    
    # Ensure expected keys exist
    expected_keys = ["title", "changes", "tasks", "affected_entities", "summary"]
    for key in expected_keys:
        if key not in result:
            result[key] = [] if key in ["changes", "tasks", "affected_entities"] else ""
            
    return result
