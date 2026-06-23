import os
import json
import uuid
from datetime import datetime, date, timedelta
from difflib import SequenceMatcher
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Document, Clause, Comparison, Map, ImpactAnalysis
from app.schemas.schemas import ComparisonRequest
from app.core.config import settings
from app.core.embeddings import EmbeddingService

router = APIRouter(prefix="/comparisons", tags=["Document Comparisons"])

DEPARTMENTS = ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"]

# Semantic similarity thresholds
_SIM_UNCHANGED = 0.85   # >= this: clauses are functionally identical
_SIM_MODIFIED  = 0.40   # >= this but < UNCHANGED: clause was modified
# below _SIM_MODIFIED: treated as removed/added (completely new content)

STOP_WORDS = {
    "the", "shall", "to", "be", "of", "and", "a", "in", "that", "is", "for", "it", 
    "with", "as", "by", "on", "or", "any", "at", "an", "this", "are", "will", 
    "from", "been", "has", "have", "such", "compliance", "regulation", "obligation"
}

def _text_similarity(a: str, b: str) -> float:
    """Fallback: character-level SequenceMatcher ratio."""
    return SequenceMatcher(None, a, b).ratio()

def _semantic_similarity(oc: Clause, nc: Clause) -> tuple[float, str]:
    """
    Compute cosine similarity between two clauses using stored embeddings.
    Returns (score, method) where method is 'semantic' or 'textual'.
    Falls back to SequenceMatcher if embeddings are zero vectors (old placeholders).
    """
    # Cache parsed embeddings on the Clause objects to avoid parsing in nested loops
    if not hasattr(oc, "_parsed_emb"):
        oc._parsed_emb = EmbeddingService.from_db(oc.embedding)
    if not hasattr(nc, "_parsed_emb"):
        nc._parsed_emb = EmbeddingService.from_db(nc.embedding)
        
    vec_a = oc._parsed_emb
    vec_b = nc._parsed_emb
    
    if EmbeddingService.is_zero_vector(vec_a) or EmbeddingService.is_zero_vector(vec_b):
        text_a = oc.text or ""
        text_b = nc.text or ""
        if text_a == text_b:
            return 1.0, "textual"
            
        # Cache lowercase word tokens on Clause objects
        if not hasattr(oc, "_parsed_words"):
            oc._parsed_words = {w for w in text_a.lower().split() if w not in STOP_WORDS}
        if not hasattr(nc, "_parsed_words"):
            nc._parsed_words = {w for w in text_b.lower().split() if w not in STOP_WORDS}
            
        words_a = oc._parsed_words
        words_b = nc._parsed_words
        
        if not words_a or not words_b:
            return 0.0, "textual"
            
        intersection = len(words_a.intersection(words_b))
        union = len(words_a.union(words_b))
        jaccard = intersection / union
        
        # If very different, return Jaccard immediately
        if jaccard < 0.25:
            return jaccard, "textual"
            
        # Run SequenceMatcher only for high-overlap candidates
        score = _text_similarity(text_a, text_b)
        return score, "textual"
    
    score = EmbeddingService.cosine_similarity(vec_a, vec_b)
    return score, "semantic"

def _change_reason(score: float, method: str, old_text: str, new_text: str) -> str:
    """Generate a brief human-readable reason for the detected change."""
    if method == "semantic":
        if score >= _SIM_UNCHANGED:
            return "Semantically identical — no substantive change."
        elif score >= 0.70:
            return f"Minor wording adjustment (similarity {score:.0%}). Core obligation unchanged."
        elif score >= _SIM_MODIFIED:
            return f"Moderate change detected (similarity {score:.0%}). Obligation scope may have shifted."
        else:
            return f"Significant semantic divergence (similarity {score:.0%}). Treat as new obligation."
    else:
        return f"Text similarity {score:.0%} (semantic embeddings unavailable — used character diff)."


@router.get("")
def list_comparisons(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import aliased
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    
    DocumentOld = aliased(Document)
    DocumentNew = aliased(Document)
    
    comparisons = db.query(
        Comparison.id,
        Comparison.old_document_id,
        Comparison.new_document_id,
        Comparison.created_at,
        Comparison.result_json['counts'].label('counts'),
        DocumentOld.title.label('old_title'),
        DocumentNew.title.label('new_title')
    ).outerjoin(
        DocumentOld, Comparison.old_document_id == DocumentOld.id
    ).outerjoin(
        DocumentNew, Comparison.new_document_id == DocumentNew.id
    ).filter(
        Comparison.user_id == user_id,
        Comparison.copilot_mode == copilot_mode
    ).order_by(Comparison.created_at.desc()).all()
    
    res = []
    for cmp in comparisons:
        res.append({
            "comparisonId": str(cmp.id),
            "oldDocumentId": str(cmp.old_document_id),
            "newDocumentId": str(cmp.new_document_id),
            "oldDocumentTitle": cmp.old_title or "Unknown",
            "newDocumentTitle": cmp.new_title or "Unknown",
            "created_at": cmp.created_at.isoformat(),
            "counts": cmp.counts if cmp.counts else {}
        })
    return res

@router.get("/impact/history")
def list_impact_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    
    history = db.query(ImpactAnalysis).options(
        joinedload(ImpactAnalysis.comparison).joinedload(Comparison.old_document),
        joinedload(ImpactAnalysis.comparison).joinedload(Comparison.new_document)
    ).join(Comparison).filter(
        ImpactAnalysis.user_id == user_id,
        Comparison.copilot_mode == copilot_mode
    ).order_by(ImpactAnalysis.created_at.desc()).all()
    
    res = []
    for imp in history:
        cmp = imp.comparison
        res.append({
            "id": str(imp.id),
            "comparisonId": str(imp.comparison_id),
            "oldDocumentTitle": cmp.old_document.title if cmp and cmp.old_document else "Unknown",
            "newDocumentTitle": cmp.new_document.title if cmp and cmp.new_document else "Unknown",
            "riskLevel": imp.risk_level,
            "departments": imp.departments,
            "services": imp.services,
            "created_at": imp.created_at.isoformat(),
            "matrix": imp.matrix_json,
            "perClause": imp.detail_json
        })
    return res

@router.get("/{comparison_id}")
def get_comparison(
    comparison_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload
    user_id = current_user.get("id")
    cmp = db.query(Comparison).options(
        joinedload(Comparison.old_document).joinedload(Document.clauses),
        joinedload(Comparison.new_document).joinedload(Document.clauses)
    ).filter(Comparison.id == comparison_id, Comparison.user_id == user_id).first()
    
    if not cmp:
        raise HTTPException(status_code=404, detail="Comparison not found")
        
    old_doc = cmp.old_document
    new_doc = cmp.new_document
    
    old_clauses = sorted(old_doc.clauses, key=lambda c: c.clause_id) if old_doc else []
    new_clauses = sorted(new_doc.clauses, key=lambda c: c.clause_id) if new_doc else []
    
    res_added = {c["id"]: c for c in cmp.result_json.get("added", [])}
    res_removed = {c["id"]: c for c in cmp.result_json.get("removed", [])}
    res_modified_new = {c["id"]: c for c in cmp.result_json.get("modified", [])}
    res_modified_old = {c.get("old_id", c["id"]): c for c in cmp.result_json.get("modified", [])}
    
    old_aligned = []
    for oc in old_clauses:
        line_type = "unchanged"
        severity = "Low"
        dept = oc.category or "Compliance"
        
        if oc.clause_id in res_removed:
            line_type = "removed"
            severity = "High"
        elif oc.clause_id in res_modified_old:
            line_type = "modified"
            severity = res_modified_old[oc.clause_id].get("severity", "Medium")
            dept = res_modified_old[oc.clause_id].get("category", dept)
            
        old_aligned.append({
            "type": line_type,
            "text": oc.text,
            "clauseId": oc.clause_id,
            "severity": severity,
            "department": dept
        })
        
    new_aligned = []
    for nc in new_clauses:
        line_type = "unchanged"
        severity = "Low"
        dept = nc.category or "Compliance"
        
        if nc.clause_id in res_added:
            line_type = "added"
            severity = res_added[nc.clause_id].get("severity", "Medium")
            dept = res_added[nc.clause_id].get("category", dept)
        elif nc.clause_id in res_modified_new:
            line_type = "modified"
            severity = res_modified_new[nc.clause_id].get("severity", "Medium")
            dept = res_modified_new[nc.clause_id].get("category", dept)
            
        new_aligned.append({
            "type": line_type,
            "text": nc.text,
            "clauseId": nc.clause_id,
            "severity": severity,
            "department": dept
        })
        
    return {
        "comparisonId": cmp.id,
        "oldDocumentId": cmp.old_document_id,
        "newDocumentId": cmp.new_document_id,
        "oldDocumentTitle": old_doc.title if old_doc else "Old Version",
        "newDocumentTitle": new_doc.title if new_doc else "New Version",
        "added": cmp.result_json.get("added", []),
        "removed": cmp.result_json.get("removed", []),
        "modified": cmp.result_json.get("modified", []),
        "counts": cmp.result_json.get("counts", {}),
        "oldAligned": old_aligned,
        "newAligned": new_aligned
    }

@router.post("")
def compare_documents(
    schema: ComparisonRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    
    from sqlalchemy.orm import joinedload
    docs = db.query(Document).options(joinedload(Document.clauses)).filter(
        Document.id.in_([schema.oldDocumentId, schema.newDocumentId]),
        Document.user_id == user_id
    ).all()
    
    old_doc = next((d for d in docs if d.id == schema.oldDocumentId), None)
    new_doc = next((d for d in docs if d.id == schema.newDocumentId), None)
    
    if not old_doc or not new_doc:
        raise HTTPException(status_code=404, detail="One or both documents not found")
        
    old_clauses = old_doc.clauses
    new_clauses = new_doc.clauses
    
    if not old_clauses or not new_clauses:
        raise HTTPException(status_code=400, detail="Both documents must have extracted clauses before comparison")
        
    added = []
    removed = []
    modified = []
    unchanged_count = 0
    
    matched_new_indices = set()
    
    # Semantic comparison: use embedding cosine similarity, fall back to SequenceMatcher
    for oc in old_clauses:
        best_match_idx = -1
        best_score = 0.0
        best_method = "textual"
        
        for idx, nc in enumerate(new_clauses):
            if idx in matched_new_indices:
                continue
            score, method = _semantic_similarity(oc, nc)
            if score > best_score:
                best_score = score
                best_match_idx = idx
                best_method = method
                
        if best_match_idx >= 0 and best_score >= _SIM_MODIFIED:
            matched_new_indices.add(best_match_idx)
            nc = new_clauses[best_match_idx]
            
            if best_score >= _SIM_UNCHANGED and oc.text.strip() == nc.text.strip():
                # Truly unchanged
                unchanged_count += 1
            elif best_score >= _SIM_UNCHANGED:
                # Near-identical text (possibly whitespace diff) — treat as unchanged
                unchanged_count += 1
            else:
                # Modified clause
                reason = _change_reason(best_score, best_method, oc.text, nc.text)
                modified.append({
                    "id": nc.clause_id,
                    "old_id": oc.clause_id,
                    "oldText": oc.text,
                    "newText": nc.text,
                    "category": nc.category,
                    "severity": nc.severity,
                    "similarity": round(best_score, 3),
                    "method": best_method,
                    "reason": reason
                })
        else:
            # No match found above threshold — clause was removed
            removed.append({
                "id": oc.clause_id,
                "text": oc.text,
                "category": oc.category,
                "similarity": round(best_score, 3) if best_match_idx >= 0 else 0.0,
                "method": best_method
            })
            
    for idx, nc in enumerate(new_clauses):
        if idx not in matched_new_indices:
            added.append({
                "id": nc.clause_id,
                "text": nc.text,
                "category": nc.category,
                "severity": nc.severity
            })
            
    result_json = {
        "added": added,
        "removed": removed,
        "modified": modified,
        "counts": {
            "added": len(added),
            "removed": len(removed),
            "modified": len(modified),
            "unchanged": unchanged_count
        }
    }
    
    # Save comparison
    copilot_mode = current_user.get("copilot_mode", "beginner")
    db_cmp = Comparison(
        user_id=user_id,
        old_document_id=schema.oldDocumentId,
        new_document_id=schema.newDocumentId,
        result_json=result_json,
        copilot_mode=copilot_mode
    )
    db.add(db_cmp)
    db.commit()
    db.refresh(db_cmp)
    
    return {
        "comparisonId": db_cmp.id,
        "added": added,
        "removed": removed,
        "modified": modified,
        "counts": result_json["counts"]
    }

@router.post("/{comparison_id}/impact")
def generate_impact_analysis(
    comparison_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    
    # Check if we already have a saved impact analysis for this comparison
    existing = db.query(ImpactAnalysis).filter(
        ImpactAnalysis.comparison_id == comparison_id,
        ImpactAnalysis.user_id == user_id
    ).first()
    if existing:
        return {"matrix": existing.matrix_json, "perClause": existing.detail_json}
        
    cmp = db.query(Comparison).filter(Comparison.id == comparison_id, Comparison.user_id == user_id).first()
    if not cmp:
        raise HTTPException(status_code=404, detail="Comparison not found")
        
    res_json = cmp.result_json
    changes = []
    for c in res_json.get("added", []):
        changes.append({"id": c["id"], "text": c["text"], "type": "added", "category": c.get("category")})
    for c in res_json.get("modified", []):
        changes.append({"id": c["id"], "text": c["newText"], "type": "modified", "category": c.get("category")})
    for c in res_json.get("removed", []):
        changes.append({"id": c["id"], "text": c["text"], "type": "removed", "category": c.get("category")})
        
    changes = changes[:25] # Cap size
    
    matrix = []
    per_clause = []
    
    # Call local Llama 3 AI service
    from app.core.ai_service import LlamaAIService
    res_json = LlamaAIService.analyze_impact_batch(changes)
    per_clause = res_json.get("items", [])
            
    # Aggregate matrix scores
    agg = {d: {"sum": 0, "count": 0, "reasons": []} for d in DEPARTMENTS}
    for item in per_clause:
        if not isinstance(item, dict):
            continue
        scores = item.get("scores")
        if not isinstance(scores, dict):
            scores = {d: 10 for d in DEPARTMENTS}
            
        for d in DEPARTMENTS:
            score = scores.get(d, 10)
            agg[d]["sum"] += score
            agg[d]["count"] += 1
            
        prim = item.get("primary") or "Compliance"
        reason = item.get("reason") or "Standard compliance controls review."
        if prim in agg:
            agg[prim]["reasons"].append(reason)
            
    for d in DEPARTMENTS:
        a = agg[d]
        impact = round(a["sum"] / a["count"]) if a["count"] > 0 else 0
        risk = "High" if impact >= 75 else "Medium" if impact >= 45 else "Low"
        priority = "P1" if impact >= 75 else "P2" if impact >= 45 else "P3"
        action = a["reasons"][0] if a["reasons"] else f"Review impacted clauses and update {d} SOPs."
        
        matrix.append({
            "department": d,
            "impact": impact,
            "risk": risk,
            "priority": priority,
            "action": action
        })
        
    # Determine risk_level and departments list for explicit column storage
    risk_level = "Low"
    departments_list = []
    for item in matrix:
        if item["impact"] > 0:
            departments_list.append(item["department"])
        if item["risk"] == "High":
            risk_level = "High"
        elif item["risk"] == "Medium" and risk_level != "High":
            risk_level = "Medium"

    # Fetch user organization services
    from app.models.models import Organization, User
    org_services = []
    u = db.query(User).filter(User.id == user_id).first()
    if u and u.organization_id:
        org = db.query(Organization).filter(Organization.id == u.organization_id).first()
        if org:
            org_services = org.services or []

    # Save to database
    db_impact = ImpactAnalysis(
        user_id=user_id,
        comparison_id=comparison_id,
        risk_level=risk_level,
        departments=departments_list,
        services=org_services,
        matrix_json=matrix,
        detail_json=per_clause
    )
    db.add(db_impact)
    db.commit()
    db.refresh(db_impact)
        
    return {"matrix": matrix, "perClause": per_clause}

@router.post("/{comparison_id}/generate-maps")
def generate_maps_from_comparison(
    comparison_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    cmp = db.query(Comparison).filter(Comparison.id == comparison_id, Comparison.user_id == user_id).first()
    if not cmp:
        raise HTTPException(status_code=404, detail="Comparison not found")
        
    res_json = cmp.result_json
    changes = []
    for c in res_json.get("added", []):
        changes.append({"id": c["id"], "text": c["text"], "type": "added", "severity": c.get("severity", "Medium")})
    for c in res_json.get("modified", []):
        changes.append({"id": c["id"], "text": c["newText"], "type": "modified", "severity": c.get("severity", "Medium")})
        
    changes = changes[:25] # Cap size
    
    maps_data = []
    
    # Call local Llama 3 AI service
    from app.core.ai_service import LlamaAIService
    res_json = LlamaAIService.generate_maps_from_changes(changes)
    maps_data = res_json.get("maps", [])
            
    # Save generated maps in the DB
    saved_maps = []
    for m in maps_data:
        if not isinstance(m, dict):
            continue
        # Convert date string to date object
        deadline_date = None
        deadline_str = m.get("deadline") or m.get("due_date")
        if deadline_str:
            try:
                deadline_date = datetime.strptime(str(deadline_str).split("T")[0], "%Y-%m-%d").date()
            except ValueError:
                deadline_date = date.today() + timedelta(days=30)
        else:
            deadline_date = date.today() + timedelta(days=30)
            
        copilot_mode = current_user.get("copilot_mode", "beginner")
        db_map = Map(
            user_id=user_id,
            comparison_id=comparison_id,
            clause_ref=m.get("clauseRef") or m.get("clause_ref"),
            title=m.get("title", "Untitled task"),
            description=m.get("description", ""),
            owner=m.get("owner", "Compliance Team"),
            severity=m.get("severity", "Medium"),
            status="Pending",
            deadline=deadline_date,
            copilot_mode=copilot_mode
        )
        db.add(db_map)
        saved_maps.append(db_map)
        
    db.commit()
    
    db.commit()
    
    # Refresh all saved maps
    for sm in saved_maps:
        db.refresh(sm)
        
    return {"count": len(saved_maps), "maps": saved_maps}
