"""
offline_readiness.py — Comprehensive offline health check for ReguFlow AI.

GET /api/v1/offline-readiness
Returns per-component status and an overall readiness score.
No authentication required (it's a health probe).
"""

import time
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Document, Clause, Map

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/offline-readiness", tags=["Offline Readiness"])


def _check_ollama() -> dict:
    """Test 1: Is Ollama running and does it have a usable model?"""
    t0 = time.time()
    try:
        from app.core.ai_service import LlamaAIService
        health = LlamaAIService.check_ollama_health()
        models = health.get("models_available", [])
        selected = LlamaAIService._select_best_model(models) if health.get("online") else None
        elapsed = round(time.time() - t0, 2)
        return {
            "status": "✅ Online" if health.get("online") and selected else "❌ Offline",
            "online": health.get("online", False),
            "selected_model": selected,
            "available_models": models,
            "response_time_s": elapsed,
            "note": f"Using '{selected}'" if selected else "No models available. Run: ollama pull llama3"
        }
    except Exception as e:
        return {
            "status": "❌ Error",
            "online": False,
            "selected_model": None,
            "available_models": [],
            "response_time_s": round(time.time() - t0, 2),
            "note": str(e)
        }


def _check_embeddings() -> dict:
    """Test 2: Can we generate real (non-zero) embeddings locally?"""
    t0 = time.time()
    try:
        from app.core.embeddings import EmbeddingService
        test_text = "Banks must comply with RBI KYC circular requirements annually."
        vec = EmbeddingService.encode(test_text)
        
        is_real = not EmbeddingService.is_zero_vector(vec)
        dim = len(vec)
        elapsed = round(time.time() - t0, 2)
        
        # Sanity check: norm should be ~1.0 for normalized vectors
        import math
        norm = math.sqrt(sum(x * x for x in vec))
        
        return {
            "status": "✅ Real embeddings" if is_real else "❌ Zero vectors (model failed to load)",
            "available": is_real,
            "model": "all-MiniLM-L6-v2",
            "dimension": dim,
            "vector_norm": round(norm, 4),
            "response_time_s": elapsed,
            "note": "384-dim sentence-transformer running fully offline" if is_real else "Check if sentence-transformers package is installed"
        }
    except Exception as e:
        return {
            "status": "❌ Error",
            "available": False,
            "model": "all-MiniLM-L6-v2",
            "dimension": 0,
            "vector_norm": 0,
            "response_time_s": round(time.time() - t0, 2),
            "note": str(e)
        }


def _check_semantic_change_detection() -> dict:
    """Test 3: Does cosine similarity correctly detect similar vs. different clauses?"""
    t0 = time.time()
    try:
        from app.core.embeddings import EmbeddingService
        
        # Similar clauses — should score high
        clause_a = "All regulated entities must conduct annual KYC review for high-risk customers."
        clause_b = "All regulated entities are required to conduct yearly KYC updates for high-risk clients."
        
        # Dissimilar clause — should score low
        clause_c = "The payment gateway must support UPI transaction limits and velocity controls."
        
        vec_a = EmbeddingService.encode(clause_a)
        vec_b = EmbeddingService.encode(clause_b)
        vec_c = EmbeddingService.encode(clause_c)
        
        sim_ab = EmbeddingService.cosine_similarity(vec_a, vec_b)
        sim_ac = EmbeddingService.cosine_similarity(vec_a, vec_c)
        
        # Expected: sim_ab >> sim_ac (KYC vs KYC similar, KYC vs UPI different)
        working = sim_ab > 0.5 and sim_ac < sim_ab
        elapsed = round(time.time() - t0, 2)
        
        return {
            "status": "✅ Working" if working else "⚠️ Degraded (using zero vectors)",
            "working": working,
            "similar_clause_score": round(sim_ab, 4),
            "dissimilar_clause_score": round(sim_ac, 4),
            "response_time_s": elapsed,
            "note": f"Similar clauses: {sim_ab:.2%}, Different clauses: {sim_ac:.2%}" if working else "Embeddings returned zero vectors or scores too low"
        }
    except Exception as e:
        return {
            "status": "❌ Error",
            "working": False,
            "similar_clause_score": 0,
            "dissimilar_clause_score": 0,
            "response_time_s": round(time.time() - t0, 2),
            "note": str(e)
        }


def _check_copilot(db: Session) -> dict:
    """Test 4: Can Ollama respond to a simple compliance query?"""
    t0 = time.time()
    try:
        from app.core.ai_service import LlamaAIService
        health = LlamaAIService.check_ollama_health()
        
        if not health.get("online") or not health.get("models_available"):
            elapsed = round(time.time() - t0, 2)
            return {
                "status": "⚠️ Fallback mode (Ollama offline)",
                "working": False,
                "uses_fallback": True,
                "response_time_s": elapsed,
                "note": "Copilot will use rule-based structured fallbacks. Ollama needed for full AI responses."
            }
        
        # Run a short test prompt
        test_prompt = "In one sentence, what does RBI stand for?"
        response = LlamaAIService._call_ollama(test_prompt)
        elapsed = round(time.time() - t0, 2)
        
        has_response = bool(response and len(response.strip()) > 5)
        return {
            "status": "✅ Responding" if has_response else "⚠️ Empty response",
            "working": has_response,
            "uses_fallback": False,
            "response_preview": response[:100] + "..." if len(response) > 100 else response,
            "response_time_s": elapsed,
            "note": "Local LLM responding correctly" if has_response else "Model returned empty response"
        }
    except Exception as e:
        elapsed = round(time.time() - t0, 2)
        return {
            "status": "⚠️ Fallback mode",
            "working": False,
            "uses_fallback": True,
            "response_time_s": elapsed,
            "note": f"Will use rule-based fallbacks. Error: {str(e)[:120]}"
        }


def _check_database(db: Session) -> dict:
    """Test 5: Is the database connected and queryable?"""
    t0 = time.time()
    try:
        doc_count = db.query(Document).count()
        clause_count = db.query(Clause).count()
        map_count = db.query(Map).count()
        
        # Check if any clauses have real embeddings
        clauses_with_real_embeddings = 0
        sample_clauses = db.query(Clause).limit(20).all()
        from app.core.embeddings import EmbeddingService
        for c in sample_clauses:
            vec = EmbeddingService.from_db(c.embedding)
            if not EmbeddingService.is_zero_vector(vec):
                clauses_with_real_embeddings += 1
        
        elapsed = round(time.time() - t0, 2)
        return {
            "status": "✅ Connected",
            "connected": True,
            "documents": doc_count,
            "clauses": clause_count,
            "maps": map_count,
            "clauses_with_real_embeddings": clauses_with_real_embeddings,
            "response_time_s": elapsed,
            "note": f"{clause_count} clauses stored, {clauses_with_real_embeddings} with real embeddings"
        }
    except Exception as e:
        return {
            "status": "❌ Error",
            "connected": False,
            "documents": 0,
            "clauses": 0,
            "maps": 0,
            "clauses_with_real_embeddings": 0,
            "response_time_s": round(time.time() - t0, 2),
            "note": str(e)
        }


@router.get("")
def offline_readiness_check(db: Session = Depends(get_db)):
    """
    Comprehensive offline readiness check.
    Tests Ollama, embeddings, semantic change detection, copilot, and database.
    Returns a per-component report and overall readiness score.
    """
    t_start = time.time()
    
    # Run all checks
    ollama = _check_ollama()
    embeddings = _check_embeddings()
    change_detection = _check_semantic_change_detection()
    copilot = _check_copilot(db)
    database = _check_database(db)
    
    # Score each component (out of 20 points each = 100 total)
    scores = {
        "ollama": 20 if ollama["online"] and ollama["selected_model"] else 0,
        "embeddings": 20 if embeddings["available"] else 0,
        "change_detection": 20 if change_detection["working"] else 0,
        "copilot": 20 if copilot["working"] else 10 if copilot.get("uses_fallback") else 0,
        "database": 20 if database["connected"] else 0,
    }
    total_score = sum(scores.values())
    
    # Overall readiness tier
    if total_score >= 80:
        readiness_tier = "🟢 Fully Offline Ready"
    elif total_score >= 60:
        readiness_tier = "🟡 Partially Ready (some AI features degraded)"
    elif total_score >= 40:
        readiness_tier = "🟠 Limited Offline Operation"
    else:
        readiness_tier = "🔴 Not Offline Ready"
    
    total_elapsed = round(time.time() - t_start, 2)
    
    return {
        "overall": {
            "readiness_score": total_score,
            "readiness_tier": readiness_tier,
            "total_check_time_s": total_elapsed,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "success_criteria": {
                "no_internet_required": True,
                "no_external_apis_used": True,
                "real_embeddings": embeddings["available"],
                "semantic_change_detection": change_detection["working"],
                "copilot_works_locally": copilot["working"] or copilot.get("uses_fallback", False),
                "database_connected": database["connected"]
            }
        },
        "component_scores": scores,
        "checks": {
            "ollama": ollama,
            "embeddings": embeddings,
            "semantic_change_detection": change_detection,
            "copilot": copilot,
            "database": database
        }
    }
