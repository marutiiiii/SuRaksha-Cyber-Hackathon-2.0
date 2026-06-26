from typing import Dict, Any
import time
import traceback
from models.db import (
    db_get_task,
    db_get_regulation,
    db_get_evidence,
    db_add_verification_report,
    db_get_verification_report,
    db_update_report_progress,
    db_update_report_final
)
from evidence_extractor import extract_evidence_details
from requirement_matcher import match_requirements
from status_engine import determine_compliance_status
from utils.timing_tracker import tracker

def analyze_evidence(regulation_text: str, task_description: str, uploaded_file_path: str) -> Dict[str, Any]:
    """
    Core function required by the system.
    Inputs:
      regulation_text
      task_description
      uploaded_file_path
    Returns:
      {
        "status": "NOT_STARTED | IN_PROGRESS | COMPLETED",
        "confidence": 0.0,
        "evidence_found": [],
        "missing_requirements": [],
        "reason": ""
      }
    """
    print(f"Starting analysis of evidence file: {uploaded_file_path}")
    
    # Step 1: Extract details from the evidence (PDF/Image) using vision LLM or PyMuPDF
    extracted_evidence = extract_evidence_details(uploaded_file_path, task_description)
    
    # Step 2: Match extracted evidence against task requirement
    # We pass the task description and regulation text context
    matcher_input = f"Task: {task_description}\nRegulation Context: {regulation_text}"
    match_result = match_requirements(task_description, extracted_evidence)
    
    # Step 3: Determine compliance status, confidence, and rationale
    status_result = determine_compliance_status(match_result, task_description)
    
    # Format and return the final report matching user spec
    return {
        "status": status_result["status"],
        "confidence": status_result["confidence"],
        "evidence_found": match_result["matched"],
        "missing_requirements": match_result["missing"],
        "reason": status_result["reason"]
    }

def verify_compliance(task_id: int, evidence_id: int) -> Dict[str, Any]:
    """
    Runs the full compliance pipeline synchronously (backward compatibility).
    """
    # 1. Fetch task and evidence details from DB
    task = db_get_task(task_id)
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")
        
    evidence = db_get_evidence(evidence_id)
    if not evidence:
        raise ValueError(f"Evidence with ID {evidence_id} not found.")
        
    # 2. Fetch parent regulation to get regulation text context
    regulation = db_get_regulation(task["regulation_id"])
    regulation_text = regulation["content"] if regulation else ""
    
    # 3. Perform AI analysis
    report_data = analyze_evidence(
        regulation_text=regulation_text,
        task_description=task["description"],
        uploaded_file_path=evidence["file_path"]
    )
    
    # 4. Save verification report and update task status in DB
    report_id = db_add_verification_report(
        task_id=task_id,
        evidence_id=evidence_id,
        department=task["department"],
        status=report_data["status"],
        confidence=report_data["confidence"],
        evidence_found=report_data["evidence_found"],
        missing_requirements=report_data["missing_requirements"],
        reason=report_data["reason"]
    )
    
    # 5. Retrieve and return the saved report
    report_data["id"] = report_id
    report_data["task_id"] = task_id
    report_data["evidence_id"] = evidence_id
    report_data["department"] = task["department"]
    
    return report_data

def verify_compliance_task(report_id: int):
    """
    Asynchronous background task runner for evidence verification.
    """
    tracker.reset()
    t_total_start = time.time()
    
    try:
        # Fetch report details
        report = db_get_verification_report(report_id)
        if not report:
            print(f"Error: Verification report with ID {report_id} not found in database.")
            return
            
        task_id = report["task_id"]
        evidence_id = report["evidence_id"]
        
        task = db_get_task(task_id)
        if not task:
            raise ValueError(f"Task with ID {task_id} not found.")
            
        evidence = db_get_evidence(evidence_id)
        if not evidence:
            raise ValueError(f"Evidence with ID {evidence_id} not found.")
            
        regulation = db_get_regulation(task["regulation_id"])
        regulation_text = regulation["content"] if regulation else ""
        
        # --- Stage 20% (Extracting PDF) ---
        print(f"[{report_id}] Stage 20%: Extracting evidence...")
        db_update_report_progress(report_id, "PROCESSING", "20%", "Extracting text from evidence document...")
        
        extracted_evidence = extract_evidence_details(evidence["file_path"], task["description"])
        
        # --- Stage 40% (Building Prompt) ---
        print(f"[{report_id}] Stage 40%: Building prompt...")
        db_update_report_progress(report_id, "PROCESSING", "40%", "Analyzing document and matching compliance requirements...")
        
        # --- Stage 70% (Running Verification) ---
        print(f"[{report_id}] Stage 70%: Running verification...")
        db_update_report_progress(report_id, "PROCESSING", "70%", "Running compliance model verification...")
        
        match_result = match_requirements(task["description"], extracted_evidence)
        status_result = determine_compliance_status(match_result, task["description"])
        
        # --- Stage 90% (Saving Results) ---
        print(f"[{report_id}] Stage 90%: Saving results...")
        db_update_report_progress(report_id, "PROCESSING", "90%", "Finalizing compliance status and generating report...")
        
        # Update final report results (sets progress to 100%)
        db_update_report_final(
            report_id=report_id,
            status=status_result["status"],
            confidence=status_result["confidence"],
            score=match_result["score"],
            evidence_found=match_result["matched"],
            missing_requirements=match_result["missing"],
            reason=status_result["reason"]
        )
        print(f"[{report_id}] Stage 100%: Completed. Status = {status_result['status']}")
        
        # --- Print Timing Logs ---
        timings = tracker.get_timings()
        evidence_text_len = sum(len(line) for line in extracted_evidence.get("text", []))
        pages = extracted_evidence.get("num_pages", 1)
        
        # Guess prompt length or sum up if we generated one
        # Let's count characters of prompt in Qwen call or keep it 0 if bypassed
        prompt_len = 0
        
        print("\n================== TIMING REPORT ==================")
        print(f"Pages: {pages}")
        print(f"Evidence text length: {evidence_text_len}")
        print(f"PDF extraction time: {timings['pdf_extraction_time']:.4f} sec")
        print(f"Image conversion time: {timings['image_conversion_time']:.4f} sec")
        print(f"Prompt generation time: {timings['prompt_generation_time']:.4f} sec")
        print(f"Model inference time: {timings['model_inference_time']:.4f} sec")
        print(f"Total verification time: {timings['total_verification_time']:.4f} sec")
        print("===================================================\n")
        
    except Exception as e:
        print(f"[{report_id}] Background task failed: {e}")
        traceback.print_exc()
        try:
            db_update_report_progress(
                report_id, 
                "FAILED", 
                "100%", 
                f"Verification failed: {str(e)}"
            )
        except Exception as db_err:
            print(f"Failed to save error status to database: {db_err}")

