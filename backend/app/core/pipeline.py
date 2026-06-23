import os
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from pypdf import PdfReader

from app.models.models import Document, Clause, Comparison, Map, ImpactAnalysis, Report, User
from app.core.ai_service import LlamaAIService
from app.core.embeddings import EmbeddingService
from app.core.config import settings

DEPARTMENTS = ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"]

def execute_downstream_pipeline(db: Session, doc: Document, user_id: uuid.UUID, copilot_mode: str):
    """
    Executes the downstream compliance pipeline sequentially in a single run:
    1. Text extraction (if status is 'uploaded')
    2. Clause extraction and embedding generation (if status is 'uploaded' or 'extracted')
    3. Version comparison (Change Detection) with the previous version (or a dummy baseline if none exists)
    4. Department-wise Impact Analysis
    5. Action Points (MAP) generation and routing
    6. Compliance PDF Report generation (updating Audit Readiness Score)
    """
    print(f"[Pipeline] Starting automated downstream pipeline for document: {doc.title} (ID: {doc.id})")
    
    # 1. Text Extraction
    if doc.status == "uploaded" or not doc.extracted_text:
        filename = os.path.basename(doc.file_path)
        storage_dir = os.path.join(settings.STORAGE_PATH, "documents")
        local_path = os.path.join(storage_dir, filename)
        
        if os.path.exists(local_path):
            try:
                reader = PdfReader(local_path)
                text_content = ""
                for page in reader.pages:
                    text_content += page.extract_text() or ""
                doc.pages = len(reader.pages)
                doc.extracted_text = text_content[:200000]
                doc.status = "extracted"
                db.commit()
                print(f"[Pipeline] Text extracted: {doc.pages} pages.")
            except Exception as e:
                print(f"[Pipeline] Text extraction failed: {e}")
                # Fallback to empty text
                doc.extracted_text = "Empty text fallback"
                doc.status = "extracted"
                db.commit()
        else:
            print(f"[Pipeline] Physical file not found at {local_path}. Using empty text.")
            doc.extracted_text = "Physical file missing"
            doc.status = "extracted"
            db.commit()

    # 2. Clause Extraction
    if doc.status == "extracted" or doc.status == "uploaded":
        # Check if another user's analyzed document has the same title
        other_doc = db.query(Document).filter(
            Document.title == doc.title,
            Document.status == "analyzed",
            Document.id != doc.id
        ).first()
        
        existing_clauses = []
        if other_doc:
            existing_clauses = db.query(Clause).filter(Clause.document_id == other_doc.id).all()
        
        if existing_clauses:
            print(f"[Pipeline] Reusing {len(existing_clauses)} pre-extracted clauses from another user's document (ID: {other_doc.id}) for '{doc.title}'.")
            # Clear any existing
            db.query(Clause).filter(Clause.document_id == doc.id).delete()
            
            rows = []
            for c in existing_clauses:
                rows.append(Clause(
                    document_id=doc.id,
                    clause_id=c.clause_id,
                    text=c.text,
                    category=c.category,
                    obligation=c.obligation,
                    severity=c.severity,
                    embedding=c.embedding
                ))
            db.add_all(rows)
            doc.status = "analyzed"
            db.commit()
        else:
            sample = doc.extracted_text[:40000]
            try:
                res_json = LlamaAIService.extract_clauses(doc.title, doc.source or "Unknown", sample)
                clauses = res_json.get("clauses", [])
                
                # Delete existing
                db.query(Clause).filter(Clause.document_id == doc.id).delete()
                
                # Embeddings
                clause_texts = [c.get("text", "") for c in clauses]
                embeddings = EmbeddingService.batch_encode(clause_texts) if clause_texts else []
                
                rows = []
                for i, c in enumerate(clauses):
                    vec = embeddings[i] if i < len(embeddings) else [0.0] * 384
                    rows.append(Clause(
                        document_id=doc.id,
                        clause_id=c["clauseId"],
                        text=c["text"],
                        category=c["category"],
                        obligation=c["obligation"],
                        severity=c["severity"],
                        embedding=EmbeddingService.to_db(vec)
                    ))
                db.add_all(rows)
                doc.status = "analyzed"
                db.commit()
                print(f"[Pipeline] Extracted {len(clauses)} clauses.")
            except Exception as e:
                print(f"[Pipeline] Clause extraction failed: {e}")
                doc.status = "analyzed"
                db.commit()

    # 3. Find Previous Document (for Change Detection / Comparison)
    old_doc = db.query(Document).filter(
        Document.user_id == user_id,
        Document.source == doc.source,
        Document.copilot_mode == copilot_mode,
        Document.id != doc.id,
        Document.status == "analyzed"
    ).order_by(Document.created_at.desc()).first()

    if not old_doc:
        print("[Pipeline] No previous document found for comparison. Creating dummy baseline...")
        dummy_id = uuid.uuid4()
        dummy_doc = Document(
            id=dummy_id,
            user_id=user_id,
            title="Baseline (Initial Version)",
            source=doc.source or "System",
            file_path="",
            pages=1,
            extracted_text="Initial baseline policy.",
            status="analyzed",
            copilot_mode=copilot_mode
        )
        db.add(dummy_doc)
        db.flush()
        
        dummy_clause = Clause(
            document_id=dummy_id,
            clause_id="C000",
            text="Initial baseline policy description.",
            category="Compliance",
            obligation="Perform regulatory baseline compliance checks.",
            severity="Low",
            embedding=EmbeddingService.to_db([0.0]*384)
        )
        db.add(dummy_clause)
        db.commit()
        old_doc = dummy_doc
        print(f"[Pipeline] Dummy baseline created (ID: {dummy_id})")

    # 4. Compare documents (Change Detection)
    print(f"[Pipeline] Running change detection comparison between {old_doc.title} and {doc.title}...")
    from app.api.endpoints.comparisons import _semantic_similarity, _change_reason, _SIM_MODIFIED, _SIM_UNCHANGED
    
    old_clauses = db.query(Clause).filter(Clause.document_id == old_doc.id).all()
    new_clauses = db.query(Clause).filter(Clause.document_id == doc.id).all()
    
    added = []
    removed = []
    modified = []
    unchanged_count = 0
    matched_new_indices = set()
    
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
                unchanged_count += 1
            elif best_score >= _SIM_UNCHANGED:
                unchanged_count += 1
            else:
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
    
    db_cmp = Comparison(
        user_id=user_id,
        old_document_id=old_doc.id,
        new_document_id=doc.id,
        result_json=result_json,
        copilot_mode=copilot_mode
    )
    db.add(db_cmp)
    db.commit()
    db.refresh(db_cmp)
    print(f"[Pipeline] Comparison created (ID: {db_cmp.id}) with {result_json['counts']} changes.")

    # 5. Impact Analysis
    print(f"[Pipeline] Generating impact analysis for Comparison ID: {db_cmp.id}...")
    
    # Check if there is another user's comparison for the exact same document titles
    existing_impact = db.query(ImpactAnalysis).join(Comparison).filter(
        Comparison.old_document_id.in_(
            db.query(Document.id).filter(Document.title == old_doc.title)
        ),
        Comparison.new_document_id.in_(
            db.query(Document.id).filter(Document.title == doc.title)
        ),
        Comparison.id != db_cmp.id
    ).first()
    
    if existing_impact:
        print("[Pipeline] Reusing existing ImpactAnalysis from another user's comparison.")
        db_impact = ImpactAnalysis(
            user_id=user_id,
            comparison_id=db_cmp.id,
            risk_level=existing_impact.risk_level,
            departments=existing_impact.departments,
            services=existing_impact.services,
            matrix_json=existing_impact.matrix_json,
            detail_json=existing_impact.detail_json
        )
        db.add(db_impact)
        db.commit()
    else:
        changes = []
        for c in added:
            changes.append({"id": c["id"], "text": c["text"], "type": "added", "category": c.get("category")})
        for c in modified:
            changes.append({"id": c["id"], "text": c["newText"], "type": "modified", "category": c.get("category")})
        for c in removed:
            changes.append({"id": c["id"], "text": c["text"], "type": "removed", "category": c.get("category")})
            
        changes = changes[:25]
        
        per_clause = []
        matrix = []
        
        try:
            res_json = LlamaAIService.analyze_impact_batch(changes)
            per_clause = res_json.get("items", [])
        except Exception as e:
            print(f"[Pipeline] Impact analysis generation failed: {e}")
            
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
        from app.models.models import Organization
        org_services = []
        u = db.query(User).filter(User.id == user_id).first()
        if u and u.organization_id:
            org = db.query(Organization).filter(Organization.id == u.organization_id).first()
            if org:
                org_services = org.services or []

        db_impact = ImpactAnalysis(
            user_id=user_id,
            comparison_id=db_cmp.id,
            risk_level=risk_level,
            departments=departments_list,
            services=org_services,
            matrix_json=matrix,
            detail_json=per_clause
        )
        db.add(db_impact)
        db.commit()
        print(f"[Pipeline] Impact analysis created (Risk Level: {risk_level})")

    # 6. Map task generation
    print(f"[Pipeline] Generating MAP tasks for Comparison ID: {db_cmp.id}...")
    
    # Check if there is another user's comparison for the exact same document titles
    other_cmp = db.query(Comparison).filter(
        Comparison.old_document_id.in_(
            db.query(Document.id).filter(Document.title == old_doc.title)
        ),
        Comparison.new_document_id.in_(
            db.query(Document.id).filter(Document.title == doc.title)
        ),
        Comparison.id != db_cmp.id
    ).first()
    
    existing_maps = []
    if other_cmp:
        existing_maps = db.query(Map).filter(Map.comparison_id == other_cmp.id).all()
        
    if existing_maps:
        print(f"[Pipeline] Reusing {len(existing_maps)} MAP tasks from another user's comparison.")
        saved_maps = []
        for m in existing_maps:
            saved_maps.append(Map(
                user_id=user_id,
                comparison_id=db_cmp.id,
                clause_ref=m.clause_ref,
                title=m.title,
                description=m.description,
                owner=m.owner,
                severity=m.severity,
                status="Pending",
                deadline=m.deadline,
                copilot_mode=copilot_mode
            ))
        db.add_all(saved_maps)
        db.commit()
    else:
        map_changes = []
        for c in added:
            map_changes.append({"id": c["id"], "text": c["text"], "type": "added", "severity": c.get("severity", "Medium")})
        for c in modified:
            map_changes.append({"id": c["id"], "text": c["newText"], "type": "modified", "severity": c.get("severity", "Medium")})
            
        map_changes = map_changes[:25]
        
        maps_data = []
        try:
            res_json = LlamaAIService.generate_maps_from_changes(map_changes)
            maps_data = res_json.get("maps", [])
        except Exception as e:
            print(f"[Pipeline] MAP generation failed: {e}")
            
        saved_maps = []
        for m in maps_data:
            if not isinstance(m, dict):
                continue
            deadline_date = None
            deadline_str = m.get("deadline") or m.get("due_date")
            if deadline_str:
                try:
                    deadline_date = datetime.strptime(str(deadline_str).split("T")[0], "%Y-%m-%d").date()
                except ValueError:
                    deadline_date = date.today() + timedelta(days=30)
            else:
                deadline_date = date.today() + timedelta(days=30)
                
            db_map = Map(
                user_id=user_id,
                comparison_id=db_cmp.id,
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
        print(f"[Pipeline] Generated {len(saved_maps)} MAP tasks.")

    # 7. Generate Compliance Report PDF
    print(f"[Pipeline] Generating Compliance Report...")
    try:
        from app.api.endpoints.reports import generate_report, ReportRequest
        mock_user = {"id": user_id, "copilot_mode": copilot_mode}
        class MockReportRequest:
            type = "executive"
        
        rep_res = generate_report(schema=MockReportRequest(), current_user=mock_user, db=db)
        print(f"[Pipeline] Report PDF generated successfully: {rep_res.get('signed_url')}")
    except Exception as e:
        print(f"[Pipeline] Report generation failed: {e}")
        
    print(f"[Pipeline] Automated downstream pipeline complete for document: {doc.title}")
    return db_cmp
