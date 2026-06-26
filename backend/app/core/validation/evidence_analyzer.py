"""
Evidence analyzer — main orchestrator for the ReguFlow validation pipeline.

This module is the single entry point called by the maps endpoint.
It runs evidence extraction → requirement matching → status determination,
then writes results back to the Evidence record and auto-approves/fails
based on AI confidence.

Auto-approval rules:
  - AI status == "COMPLETED" AND confidence >= AUTO_APPROVE_THRESHOLD
      → validation_status = "Passed", MAP advances to requested_status
  - AI status == "NOT_STARTED"
      → validation_status = "Failed", MAP reverts to previous_status
  - AI status == "IN_PROGRESS" or low confidence
      → validation_status stays "Pending" (admin manual review)
"""
import json
import logging
import time
import traceback
from typing import Dict, Any
from uuid import UUID

logger = logging.getLogger("uvicorn.error")

# Confidence threshold for auto-approval (85%)
AUTO_APPROVE_THRESHOLD = 0.85


def analyze_evidence(
    task_description: str,
    uploaded_file_path: str,
) -> Dict[str, Any]:
    """
    Core analysis pipeline.

    Returns:
        {
          "status": "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
          "confidence": float,
          "evidence_found": [...],
          "missing_requirements": [...],
          "reason": str
        }
    """
    from app.core.validation.evidence_extractor import extract_evidence_details
    from app.core.validation.requirement_matcher import match_requirements
    from app.core.validation.status_engine import determine_compliance_status

    logger.info(f"[Validation] Starting analysis of: {uploaded_file_path}")

    # Step 1: Extract evidence details
    extracted = extract_evidence_details(uploaded_file_path, task_description)

    # Step 2: Match against task requirements
    match_result = match_requirements(task_description, extracted)

    # Step 3: Determine compliance status
    status_result = determine_compliance_status(match_result, task_description)

    return {
        "status": status_result["status"],
        "confidence": status_result["confidence"],
        "evidence_found": match_result["matched"],
        "missing_requirements": match_result["missing"],
        "reason": status_result["reason"],
    }


def run_evidence_verification(
    evidence_id: UUID,
    map_description: str,
    file_path: str,
    requested_status: str,
    previous_status: str,
) -> None:
    """
    Background task: verify evidence and auto-approve/fail based on AI result.

    Called from the maps endpoint via FastAPI BackgroundTasks.

    Args:
        evidence_id:       UUID of the Evidence record
        map_description:   Title/description of the MAP (used as compliance requirement)
        file_path:         Absolute path to the uploaded evidence file
        requested_status:  The MAP status the user is trying to achieve
        previous_status:   The MAP status before this evidence upload
    """
    from app.core.database import SessionLocal
    from app.models.models import Evidence, Map
    from app.core.validation.timing_tracker import tracker

    tracker.reset()
    t_total = time.time()

    db = SessionLocal()
    try:
        # Fetch evidence and MAP records
        evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not evidence:
            logger.error(f"[Validation] Evidence {evidence_id} not found in DB.")
            return

        map_task = db.query(Map).filter(Map.id == evidence.map_id).first()
        if not map_task:
            logger.error(f"[Validation] MAP {evidence.map_id} not found in DB.")
            return

        logger.info(
            f"[Validation] Running AI verification for evidence {evidence_id}, "
            f"MAP: '{map_description[:60]}'"
        )

        # ── Run the full analysis pipeline ─────────────────────────────────────
        try:
            report = analyze_evidence(
                task_description=map_description,
                uploaded_file_path=file_path,
            )
        except Exception as analysis_err:
            logger.error(f"[Validation] Analysis pipeline failed: {analysis_err}")
            traceback.print_exc()
            # Store failure notes and leave for manual review
            evidence.ai_notes = json.dumps({
                "status": "ANALYSIS_FAILED",
                "confidence": 0.0,
                "reason": f"AI analysis encountered an error: {str(analysis_err)}. Manual review required.",
                "evidence_found": [],
                "missing_requirements": [],
            }, ensure_ascii=False)
            db.commit()
            return

        ai_status = report["status"]
        confidence = report["confidence"]

        # ── Persist AI notes ────────────────────────────────────────────────────
        evidence.ai_notes = json.dumps({
            "status": ai_status,
            "confidence": round(confidence, 4),
            "reason": report["reason"],
            "evidence_found": report["evidence_found"],
            "missing_requirements": report["missing_requirements"],
        }, ensure_ascii=False)

        # ── Auto-approve / auto-fail logic ──────────────────────────────────────
        if ai_status == "COMPLETED" and confidence >= AUTO_APPROVE_THRESHOLD:
            logger.info(
                f"[Validation] AUTO-APPROVED evidence {evidence_id}. "
                f"Confidence: {confidence:.2%}. Advancing MAP to '{requested_status}'."
            )
            evidence.validation_status = "Passed"
            map_task.status = requested_status

        elif ai_status == "NOT_STARTED":
            logger.info(
                f"[Validation] AUTO-FAILED evidence {evidence_id}. "
                f"AI found no relevant evidence. Reverting MAP to '{previous_status}'."
            )
            evidence.validation_status = "Failed"
            evidence.rejection_reason = report["reason"]
            map_task.status = previous_status

        else:
            # IN_PROGRESS or low confidence → leave Pending for manual review
            logger.info(
                f"[Validation] Evidence {evidence_id} left for MANUAL REVIEW. "
                f"AI status: {ai_status}, confidence: {confidence:.2%}."
            )
            # validation_status stays "Pending", MAP stays "Awaiting Validation"

        db.commit()

        # ── Timing report ────────────────────────────────────────────────────────
        tracker.set_total(time.time() - t_total)
        timings = tracker.get_timings()
        logger.info(
            f"[Validation] Timing report for evidence {evidence_id}: "
            f"PDF={timings['pdf_extraction_time']:.2f}s, "
            f"ImgConv={timings['image_conversion_time']:.2f}s, "
            f"Inference={timings['model_inference_time']:.2f}s, "
            f"Total={timings['total_verification_time']:.2f}s"
        )

    except Exception as e:
        logger.error(f"[Validation] Background verification failed for evidence {evidence_id}: {e}")
        traceback.print_exc()
        try:
            evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
            if evidence and not evidence.ai_notes:
                evidence.ai_notes = json.dumps({
                    "status": "SYSTEM_ERROR",
                    "confidence": 0.0,
                    "reason": f"Verification system error: {str(e)}. Manual review required.",
                    "evidence_found": [],
                    "missing_requirements": [],
                }, ensure_ascii=False)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
