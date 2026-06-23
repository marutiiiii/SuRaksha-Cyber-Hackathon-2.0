from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from app.core.security import get_current_user
from app.core.ai_service import LlamaAIService

router = APIRouter(prefix="/ai", tags=["Local Llama 3 AI Support"])

@router.get("/health")
def get_ai_health(current_user: dict = Depends(get_current_user)):
    """
    Checks the local Ollama connection health and active model states.
    """
    try:
        health_info = LlamaAIService.check_ollama_health()
        return {
            "success": True,
            "ollama_status": "online" if health_info["online"] else "offline",
            "details": health_info
        }
    except Exception as e:
        return {
            "success": False,
            "ollama_status": "offline",
            "error": str(e)
        }

@router.post("/test-process")
def test_regulatory_text_processing(
    text: str = Body(..., embed=True),
    title: Optional[str] = Body("Test RBI Notice", embed=True),
    source: Optional[str] = Body("RBI", embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Tests text parsing using the local Llama 3 service, returning structured obligation clauses.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text block cannot be empty")
        
    try:
        # Run regulation understanding
        summary_result = LlamaAIService.analyze_regulation(title, source, text)
        
        # Run clause analysis extraction
        clauses_result = LlamaAIService.extract_clauses(title, source, text)
        
        # Run MAP task generation based on extracted clauses
        maps_result = LlamaAIService.generate_maps(clauses_result.get("clauses", []))
        
        return {
            "success": True,
            "analysis": summary_result,
            "clauses": clauses_result.get("clauses", []),
            "generated_maps": maps_result.get("maps", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Local model text processing verification failed: {str(e)}"
        )
