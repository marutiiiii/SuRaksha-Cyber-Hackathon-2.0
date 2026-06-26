import os
import json
import time
import traceback
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.models import Evidence, Map
from app.core.config import settings
from app.core.evidence_extractor import extract_evidence_details
from app.core.requirement_matcher import match_requirements
from app.core.status_engine import determine_compliance_status
from app.core.timing_tracker import tracker

def verify_evidence_background(evidence_id: UUID, db: Session):
    """
    Asynchronous background task runner to analyze compliance evidence.
    Runs extraction, requirement matching, and status evaluation,
    updating the Evidence record progress/results and Map status.
    """
    tracker.reset()
    t_total_start = time.time()
    
    try:
        # 1. Fetch evidence details from database
        ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not ev:
            print(f"Error: Evidence with ID {evidence_id} not found in database.")
            return
            
        map_task = db.query(Map).filter(Map.id == ev.map_id).first()
        if not map_task:
            print(f"Error: Associated MAP task not found for evidence {evidence_id}.")
            return
            
        # Get physical path of the file
        filename = os.path.basename(ev.file_path)
        full_file_path = os.path.join(settings.STORAGE_PATH, "evidence", filename)
        
        # --- Stage 20% (Extracting PDF/Image) ---
        print(f"[{evidence_id}] Stage 20%: Extracting evidence from {filename}...")
        ev.progress = "20%"
        ev.ai_notes = "Extracting text and visual components from evidence..."
        db.commit()
        
        extracted_evidence = extract_evidence_details(full_file_path, map_task.description or map_task.title)
        
        # --- Stage 40% (Analyzing document & building prompt) ---
        print(f"[{evidence_id}] Stage 40%: Matching requirements...")
        ev.progress = "40%"
        ev.ai_notes = "Analyzing evidence content and matching requirements..."
        db.commit()
        
        # --- Stage 70% (Running Verification) ---
        print(f"[{evidence_id}] Stage 70%: Evaluating compliance status...")
        ev.progress = "70%"
        ev.ai_notes = "Running compliance verification rules..."
        db.commit()
        
        match_result = match_requirements(map_task.description or map_task.title, extracted_evidence)
        status_result = determine_compliance_status(match_result, map_task.description or map_task.title)
        
        # --- Stage 90% (Finalizing Results) ---
        print(f"[{evidence_id}] Stage 90%: Saving results...")
        ev.progress = "90%"
        ev.ai_notes = "Finalizing verification report..."
        db.commit()
        
        # --- Stage 100%: Complete ---
        ev.progress = "100%"
        ev.confidence = status_result["confidence"]
        ev.score = match_result["score"]
        ev.evidence_found = json.dumps(match_result["matched"])
        ev.missing_requirements = json.dumps(match_result["missing"])
        ev.ai_notes = status_result["reason"]
        
        # Determine status transition
        if status_result["status"] == "COMPLETED":
            ev.validation_status = "Passed"
            ev.rejection_reason = None
            map_task.status = ev.requested_status
            print(f"[{evidence_id}] Compliance verified successfully. Transitioning MAP status to {ev.requested_status}.")
        else:
            ev.validation_status = "Failed"
            ev.rejection_reason = status_result["reason"]
            map_task.status = ev.previous_status
            print(f"[{evidence_id}] Compliance verification failed. Reverting MAP status to {ev.previous_status}.")
            
        db.commit()
        print(f"[{evidence_id}] Background task finished successfully.")
        
        # Print timings to uvicorn log
        timings = tracker.get_timings()
        print("\n================== TIMING REPORT ==================")
        print(f"Evidence file: {filename}")
        print(f"PDF extraction time: {timings['pdf_extraction_time']:.4f} sec")
        print(f"Image conversion time: {timings['image_conversion_time']:.4f} sec")
        print(f"Prompt generation time: {timings['prompt_generation_time']:.4f} sec")
        print(f"Model inference time: {timings['model_inference_time']:.4f} sec")
        print(f"Total verification time: {timings['total_verification_time']:.4f} sec")
        print("===================================================\n")
        
    except Exception as e:
        print(f"[{evidence_id}] Background task failed: {e}")
        traceback.print_exc()
        try:
            ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
            if ev:
                ev.progress = "100%"
                ev.validation_status = "Failed"
                ev.rejection_reason = f"Verification engine error: {str(e)}"
                ev.ai_notes = f"An unexpected error occurred during analysis: {str(e)}"
                
                # Revert map status if possible
                map_task = db.query(Map).filter(Map.id == ev.map_id).first()
                if map_task:
                    map_task.status = ev.previous_status
                    
                db.commit()
        except Exception as db_err:
            print(f"Failed to update error status in DB: {db_err}")
