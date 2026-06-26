import os
import uuid
from datetime import date
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Clause, Map, ChatHistory, Document, Comparison, ComplianceDraft
from app.schemas.schemas import CopilotRequest, CopilotResponse
from difflib import SequenceMatcher
from app.core.config import settings
from app.core.embeddings import EmbeddingService

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])

def search_chroma_chunks(query_vec: list[float], n_results: int = 5) -> list[dict]:
    import chromadb
    try:
        _CHROMA_API_KEY = os.getenv("CHROMA_API_KEY", "ck-J8T4rhpHwaRyhni6jh2PGkRDNFLTFzxAF7ysxoXcKB49")
        _CHROMA_TENANT = os.getenv("CHROMA_TENANT", "8a810af5-e80b-474e-b853-5a7eb2db214c")
        _CHROMA_DB = os.getenv("CHROMA_DB", "acris-data")
        _CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "regulations")
        
        client = chromadb.CloudClient(
            api_key=_CHROMA_API_KEY,
            tenant=_CHROMA_TENANT,
            database=_CHROMA_DB
        )
        collection = client.get_or_create_collection(_CHROMA_COLLECTION)
        results = collection.query(
            query_embeddings=[query_vec],
            n_results=n_results,
            include=["documents", "distances", "metadatas"]
        )
        
        items = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else [None] * len(docs)
            dists = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)
            for doc, meta, dist in zip(docs, metas, dists):
                items.append({
                    "text": doc,
                    "metadata": meta or {},
                    "distance": dist
                })
        return items
    except Exception as e:
        print(f"[Copilot] ChromaDB query failed: {e}")
        return []

def text_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()

def generate_structured_fallback(
    message: str,
    top_matches: list,
    open_maps: list,
    db: Session,
    user_id: uuid.UUID,
    top_regs: list = None,
    chroma_snippets: list = None
) -> str:
    msg_lower = message.lower()
    
    # Gather retrieved clauses/documents/snippets
    sources = []
    
    # 1. Clause records from database
    for c, score in (top_matches or []):
        sources.append({
            "type": "clause",
            "ref": f"Clause {c.clause_id}",
            "doc": c.document.title,
            "text": c.text,
            "obligation": c.obligation or c.text[:200],
            "category": c.category or "General",
            "severity": c.severity or "Medium"
        })
        
    # 2. Regulation table
    for reg, score in (top_regs or []):
        if score > 0.05:
            obs = []
            if reg.obligations:
                try:
                    obs = reg.obligations if isinstance(reg.obligations, list) else []
                except:
                    pass
            sources.append({
                "type": "regulation",
                "ref": reg.title,
                "doc": f"{reg.source} Regulation",
                "text": reg.summary or "",
                "obligation": "; ".join(obs[:2]) if obs else (reg.summary or ""),
                "category": "General",
                "severity": "Medium"
            })
            
    # 3. ChromaDB snippets
    for sim, source_label, doc_text in (chroma_snippets or []):
        if sim > 0.05:
            sources.append({
                "type": "chroma",
                "ref": source_label,
                "doc": source_label,
                "text": doc_text,
                "obligation": doc_text[:200],
                "category": "General",
                "severity": "Medium"
            })

    if not sources:
        return (
            "I searched the compliance database, but couldn't find any specific regulatory clauses or documents related to your query.\n\n"
            "To help me assist you better, you can:\n"
            "1. Upload a PDF Circular or regulatory document via the **Regulations** or **Document Upload** dashboard.\n"
            "2. Run a **Comparison** between circular versions to generate clause differences.\n"
            "3. Verify that your query contains the correct keywords (e.g. 'KCC', 'cybersecurity', etc.) that match your uploaded documents."
        )

    # Classify intent
    is_comparison = any(k in msg_lower for k in ["compare", "comparison", "difference", "changed", "change", "versus", "vs", "new version", "old version"])
    is_checklist = any(k in msg_lower for k in ["compliance", "checklist", "step", "steps", "requirement", "requirements", "mitigate", "action point", "action points", "maps", "todo", "task", "tasks", "pending"])
    is_summary = any(k in msg_lower for k in ["summarize", "summary", "brief", "concise", "overview"])

    # 1. Comparison Intent
    if is_comparison:
        from app.models.models import Comparison
        latest_comp = db.query(Comparison).filter(Comparison.user_id == user_id).order_by(Comparison.created_at.desc()).first()
        
        if latest_comp:
            added = latest_comp.result_json.get("added", []) if latest_comp.result_json else []
            modified = latest_comp.result_json.get("modified", []) if latest_comp.result_json else []
            removed = latest_comp.result_json.get("removed", []) if latest_comp.result_json else []
            
            response_parts = [
                "Here is a comparative analysis based on the latest document comparison run:",
                f"- **Added Obligations ({len(added)})**: Mandatory new requirements that the organization must adopt.",
                f"- **Modified Obligations ({len(modified)})**: Existing guidelines where thresholds, reporting timelines, or terms changed.",
                f"- **Removed Obligations ({len(removed)})**: Rules that are no longer active."
            ]
            
            if added:
                response_parts.append("\n**Key Added Requirements:**")
                for a in added[:3]:
                    response_parts.append(f"- **Clause {a.get('id', 'N/A')}**: {a.get('text', '')[:150]}...")
            if modified:
                response_parts.append("\n**Key Modified Requirements:**")
                for m in modified[:3]:
                    response_parts.append(f"- **Clause {m.get('id', 'N/A')}**:\n  - *Old*: {m.get('oldText', '')[:120]}...\n  - *New*: {m.get('newText', '')[:120]}...")
            if removed:
                response_parts.append("\n**Key Removed Requirements:**")
                for r in removed[:3]:
                    response_parts.append(f"- **Clause {r.get('id', 'N/A')}**: {r.get('text', '')[:150]}...")
                    
            response_parts.append("\n**Operational Checklist & Action Plan:**")
            response_parts.append("1. Run the MAP Task Generator to assign owners and deadlines to the added/modified rules.")
            response_parts.append("2. Deprecate outdated procedures mapped to the removed clauses.")
            return "\n".join(response_parts)
        else:
            response_parts = [
                "I could not find a formal document comparison run in your dashboard history.",
                "However, comparing the retrieved regulations and clauses related to your query, here are the different rules identified:",
            ]
            for idx, src in enumerate(sources[:3]):
                response_parts.append(f"{idx+1}. **{src['ref']}** (from *{src['doc']}*): {src['text'][:150]}...")
            response_parts.append("\n*To perform a precise side-by-side version comparison, please upload both the old and new circular PDF versions in the Comparison dashboard.*")
            return "\n".join(response_parts)

    # 2. Compliance Checklist/Steps Intent
    elif is_checklist:
        response_parts = [
            "Based on your query, here is the compliance checklist and necessary action steps to ensure system alignment:\n",
            "### 📋 Regulatory Compliance Checklist"
        ]
        
        # List obligations from sources
        for src in sources[:4]:
            response_parts.append(f"- [ ] **[{src['category']}]** obligation under **{src['ref']}**: {src['obligation']}")
            
        # List active MAP tasks if any matching
        map_bullets = []
        for m in open_maps[:5]:
            map_bullets.append(f"- [ ] **[MAP Task] {m.title}** (Owner: {m.owner or 'Unassigned'}, Severity: {m.severity or 'Medium'}): {m.description or ''}")
            
        if map_bullets:
            response_parts.append("\n### ⚙️ Active Action Items (Pending MAP Tasks)")
            response_parts.extend(map_bullets)
            
        response_parts.append("\n**Next Steps to Compliance:**")
        response_parts.append("1. Assign owners and timelines to any unassigned action items.")
        response_parts.append("2. Update Standard Operating Procedures (SOPs) for the affected systems.")
        response_parts.append("3. Upload required audit evidence to the dashboard once implementation is complete.")
        
        return "\n".join(response_parts)

    # 3. Summary Intent
    elif is_summary:
        response_parts = [
            "Here is a concise executive summary of the regulations related to your query:\n",
            "### 🔍 Key Findings & Overview"
        ]
        
        for src in sources[:3]:
            snippet = src['text'].strip().replace("\n", " ")
            if len(snippet) > 200:
                snippet = snippet[:200] + "..."
            response_parts.append(f"- **{src['ref']}** ({src['doc']}): {snippet}")
            
        response_parts.append("\n### 💼 Business Impact")
        response_parts.append("These rules introduce compliance mandates. Non-compliance could result in audit findings, financial penalties, or security vulnerabilities.")
        
        response_parts.append("\n### 👥 Affected Departments")
        depts = set(src['category'] for src in sources if src['category'] != "General")
        if not depts:
            depts = {"Compliance", "Operations"}
        response_parts.append(f"The operational changes primarily affect the **{', '.join(depts)}** department(s).")
        
        return "\n".join(response_parts)

    # 4. Detailed Explanation Intent (Default)
    else:
        response_parts = [
            "Here is a detailed explanation of the regulations and requirements matching your inquiry:\n",
            "### 📖 Regulatory Context & Requirements"
        ]
        
        for idx, src in enumerate(sources[:3]):
            response_parts.append(
                f"**{idx+1}. {src['ref']}** (Category: *{src['category']}*, Severity: *{src['severity']}*)\n"
                f"Source Document: {src['doc']}\n"
                f"Obligation details: {src['obligation']}\n"
            )
            
        response_parts.append("### ⚡ Operational Guidance & Next Actions")
        response_parts.append("- **Business Exposure**: Review the system parameters to ensure thresholds match the mandate. Ensure audit trails are maintained for review.")
        response_parts.append("- **Action Plan**: Stakeholders should prioritize any open Mitigation Action Points (MAPs) matching this regulation.")
        
        return "\n".join(response_parts)

@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(
    schema: CopilotRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.models import Regulation
    from app.core.ai_service import LlamaAIService

    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    session_id = schema.sessionId or uuid.uuid4()
    message = schema.message

    # ── Encode the user query once ─────────────────────────────────────────────
    query_vec = EmbeddingService.encode(message)
    use_semantic = not EmbeddingService.is_zero_vector(query_vec)

    # ── Source 1: Clause records from uploaded Documents ───────────────────────
    clauses = db.query(Clause).join(Document).filter(
        Document.user_id == user_id,
        Document.copilot_mode == copilot_mode
    ).limit(200).all()

    clause_scored = []
    for c in clauses:
        if use_semantic:
            clause_vec = EmbeddingService.from_db(c.embedding)
            score = (
                EmbeddingService.cosine_similarity(query_vec, clause_vec)
                if not EmbeddingService.is_zero_vector(clause_vec)
                else text_similarity(message.lower(), (c.text or "").lower())
            )
        else:
            score = text_similarity(message.lower(), (c.text or "").lower())
        clause_scored.append((c, score))

    clause_scored.sort(key=lambda x: x[1], reverse=True)
    top_matches = clause_scored[:5]

    # ── Source 2: Regulation table (summaries + titles) ────────────────────────
    # Always pull from the Regulation table — it is always populated (seeded + scraped)
    all_regulations = db.query(Regulation).order_by(Regulation.date.desc()).limit(100).all()

    reg_scored = []
    for reg in all_regulations:
        reg_text = f"{reg.title}. {reg.summary or ''}".strip()
        if use_semantic:
            reg_vec = EmbeddingService.encode(reg_text)
            score = EmbeddingService.cosine_similarity(query_vec, reg_vec)
        else:
            score = text_similarity(message.lower(), reg_text.lower())
        reg_scored.append((reg, score))

    reg_scored.sort(key=lambda x: x[1], reverse=True)
    top_regs = reg_scored[:8]

    # ── Source 3: ChromaDB semantic search ─────────────────────────────────────
    chroma_snippets = []

    # 3a. Search Cloud ChromaDB
    if use_semantic:
        try:
            cloud_hits = search_chroma_chunks(query_vec, n_results=5)
            for hit in cloud_hits:
                doc_title = hit["metadata"].get("source", hit["metadata"].get("pdf_name", "Cloud Circular"))
                sim = max(0.0, 1.0 - hit["distance"])
                chroma_snippets.append((sim, doc_title, hit["text"]))
        except Exception as cloud_err:
            import logging as _log
            _log.getLogger("uvicorn.error").warning(f"[Copilot] Cloud ChromaDB query failed: {cloud_err}")

    # 3b. Search local ChromaDB
    try:
        import chromadb
        chroma_client = chromadb.PersistentClient(path=settings.CHROMADB_PATH)
        collection_names = [c.name for c in chroma_client.list_collections()]
        for cname in collection_names:
            try:
                col = chroma_client.get_collection(cname)
                results = col.query(
                    query_embeddings=[query_vec] if use_semantic else None,
                    query_texts=[message] if not use_semantic else None,
                    n_results=min(5, col.count()),
                    include=["documents", "metadatas", "distances"],
                )
                docs = results.get("documents", [[]])[0]
                metas = results.get("metadatas", [[]])[0]
                dists = results.get("distances", [[]])[0]
                for doc_text, meta, dist in zip(docs, metas, dists):
                    # ChromaDB returns L2 distance; convert to similarity score 0-1
                    sim = max(0.0, 1.0 - (dist / 2.0))
                    source_label = meta.get("source", meta.get("title", cname))
                    chroma_snippets.append((sim, source_label, doc_text))
            except Exception as col_err:
                import logging as _log
                _log.getLogger("uvicorn.error").warning(f"[Copilot] ChromaDB collection '{cname}' query failed: {col_err}")
    except Exception as e:
        import logging as _log
        _log.getLogger("uvicorn.error").warning(f"[Copilot] ChromaDB unavailable: {e}")

    chroma_snippets.sort(key=lambda x: x[0], reverse=True)
    chroma_snippets = chroma_snippets[:5]

    # ── Build unified context for the LLM ──────────────────────────────────────
    context_parts = []
    citation_idx = 1

    # From Clause records
    citations = []
    for c, score in top_matches:
        context_parts.append(f"[{citation_idx}] (Clause {c.clause_id} · {c.document.title}) {c.text}")
        citations.append({
            "n": citation_idx,
            "clauseId": c.clause_id,
            "text": c.text,
            "document": c.document.title,
            "similarity": round(score, 2),
        })
        citation_idx += 1

    # From Regulation table — always included even when no docs are uploaded
    for reg, score in top_regs:
        if score > 0.05:  # only include if somewhat relevant
            obligations_str = ""
            if reg.obligations:
                try:
                    obs = reg.obligations if isinstance(reg.obligations, list) else []
                    if obs:
                        obligations_str = " Obligations: " + "; ".join(obs[:3])
                except Exception:
                    pass
            context_parts.append(
                f"[{citation_idx}] ({reg.source} · {reg.date}) {reg.title}. "
                f"{reg.summary or ''}{obligations_str}"
            )
            citations.append({
                "n": citation_idx,
                "clauseId": f"REG-{str(reg.id)[:8]}",
                "text": f"{reg.title}. {reg.summary or ''}",
                "document": f"{reg.source} Regulation",
                "similarity": round(score, 2),
            })
            citation_idx += 1

    # From ChromaDB
    for sim, source_label, doc_text in chroma_snippets:
        if sim > 0.05:
            context_parts.append(f"[{citation_idx}] ({source_label}) {doc_text[:400]}")
            citations.append({
                "n": citation_idx,
                "clauseId": f"CHROMA-{citation_idx}",
                "text": doc_text[:400],
                "document": source_label,
                "similarity": round(sim, 2),
            })
            citation_idx += 1

    context = "\n\n".join(context_parts) if context_parts else "(No regulatory context found)"

    # ── Open MAPs context ───────────────────────────────────────────────────────
    open_maps = db.query(Map).filter(
        Map.user_id == user_id,
        Map.status != "Completed",
        Map.copilot_mode == copilot_mode
    ).limit(10).all()
    maps_context = "\n".join(
        f"MAP: {m.title} | Owner: {m.owner or '—'} | Status: {m.status} | Severity: {m.severity}"
        for m in open_maps
    )
    answer = LlamaAIService.copilot_chat(message, context, maps_context)

    # Fallback if LLM is offline or returns empty answer
    if not answer or not answer.strip():
        answer = generate_structured_fallback(
            message,
            top_matches,
            open_maps,
            db,
            user_id,
            top_regs=top_regs,
            chroma_snippets=chroma_snippets
        )

    # ── Persist chat history ────────────────────────────────────────────────────
    db.add(ChatHistory(user_id=user_id, session_id=session_id, role="user", content=message))
    db.add(ChatHistory(
        user_id=user_id,
        session_id=session_id,
        role="assistant",
        content=answer,
        citations_json=citations,
    ))
    db.commit()

    return {"sessionId": session_id, "answer": answer, "citations": citations}



# ─── Compliance Document Generation ──────────────────────────────

class DocumentDraftRequest(BaseModel):
    type: str  # sop, policy, circular, checklist, regulatory_response
    comparisonId: Optional[uuid.UUID] = None
    documentId: Optional[uuid.UUID] = None

@router.post("/generate-document")
def generate_compliance_document(
    payload: DocumentDraftRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    
    if not payload.comparisonId and not payload.documentId:
        raise HTTPException(status_code=400, detail="Either comparisonId or documentId must be provided.")
        
    doc_type = payload.type.lower()
    
    if payload.comparisonId:
        cmp = db.query(Comparison).filter(Comparison.id == payload.comparisonId, Comparison.user_id == user_id).first()
        if not cmp:
            raise HTTPException(status_code=404, detail="Comparison not found.")
            
        old_doc = db.query(Document).filter(Document.id == cmp.old_document_id).first()
        new_doc = db.query(Document).filter(Document.id == cmp.new_document_id).first()
        old_title = old_doc.title if old_doc else "Old Version"
        new_title = new_doc.title if new_doc else "New Version"
        
        added = cmp.result_json.get("added", [])
        removed = cmp.result_json.get("removed", [])
        modified = cmp.result_json.get("modified", [])
        
        changes_context = []
        for a in added[:5]:
            changes_context.append(f"[Added] Clause {a.get('id', 'N/A')}: {a.get('text', '')}")
        for m in modified[:5]:
            changes_context.append(f"[Modified] Clause {m.get('id', 'N/A')}:\n- Old: {m.get('oldText', '')}\n- New: {m.get('newText', '')}")
        for r in removed[:5]:
            changes_context.append(f"[Removed] Clause {r.get('id', 'N/A')}: {r.get('text', '')}")
            
        changes_summary = "\n\n".join(changes_context)
        context_title = new_title
        context_subtitle = f"replacing {old_title}"
        ref_id = payload.comparisonId.hex[:6].upper()
    else:
        doc = db.query(Document).filter(Document.id == payload.documentId, Document.user_id == user_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
            
        clauses = db.query(Clause).filter(Clause.document_id == payload.documentId).all()
        changes_context = []
        for c in clauses[:10]:
            changes_context.append(f"[Clause {c.clause_id}] Category: {c.category or 'General'} | Severity: {c.severity or 'Medium'}\nText: {c.text}")
            
        changes_summary = "\n\n".join(changes_context)
        context_title = doc.title
        context_subtitle = f"Source: {doc.source or 'Unknown'}"
        ref_id = payload.documentId.hex[:6].upper()

    # Generate draft using local Llama 3 AI service
    from app.core.ai_service import LlamaAIService
    draft = ""
    if changes_context:
        draft = LlamaAIService.generate_draft_policy(doc_type, context_title, context_subtitle, changes_summary)
            
    if not draft:
        clauses_bullets = []
        for idx, item in enumerate(changes_context[:10]):
            # clean formatting
            cleaned = item.replace("\n", " ").strip()
            clauses_bullets.append(f"- {cleaned}")
        clauses_str = "\n".join(clauses_bullets)
        
        if "sop" in doc_type:
            draft = (
                f"========================================================================\n"
                f"       STANDARD OPERATING PROCEDURE (SOP) AMENDMENT\n"
                f"========================================================================\n"
                f"Document Ref: SOP-{ref_id}-AMEND\n"
                f"Date: {date.today().isoformat()}\n"
                f"Applicability: Affected Operational Departments\n"
                f"Related Regulation: {context_title}\n\n"
                f"1. OBJECTIVE\n"
                f"To transition the operational flow to align with the latest directives in {context_title}.\n\n"
                f"2. OPERATIONAL WORKFLOW UPDATES\n"
                f"Based on the regulatory changes, the following requirements must be implemented:\n"
                f"{clauses_str or 'No specific clause changes found in the database.'}\n\n"
                f"3. SYSTEM COMPLIANCE CHECKS\n"
                f"Compliance teams will run verification checks to ensure implementation of the above updates.\n\n"
                f"Authorized by: Head of Operations & Compliance\n"
                f"========================================================================"
            )
        elif "policy" in doc_type:
            draft = (
                f"========================================================================\n"
                f"                       BOARD-APPROVED POLICY DRAFT\n"
                f"========================================================================\n"
                f"Policy Code: POL-COMP-{ref_id}\n"
                f"Effective Date: {date.today().isoformat()}\n"
                f"Review Cycle: Annual\n\n"
                f"1. EXECUTIVE STATEMENT\n"
                f"The Board of Directors hereby adopts this policy to guarantee that the organization fully enforces its regulatory "
                f"obligations under the newly published directives: {context_title}.\n\n"
                f"2. CORE POLICY PILLARS\n"
                f"The policy enforces compliance with the following requirements:\n"
                f"{clauses_str or 'No specific clauses found in the database.'}\n\n"
                f"3. PENALTIES FOR DEVIATION\n"
                f"Non-compliance with this policy will attract internal disciplinary action alongside regulatory penalties.\n"
                f"========================================================================"
            )
        elif "checklist" in doc_type:
            checklist_items = []
            for idx, c_text in enumerate(changes_context[:10]):
                cleaned = c_text.replace("\n", " ").strip()
                checklist_items.append(f"[ ] {idx+1}. Verify implementation of: {cleaned}")
            checklist_str = "\n".join(checklist_items)
            draft = (
                f"========================================================================\n"
                f"                       COMPLIANCE AUDIT CHECKLIST\n"
                f"========================================================================\n"
                f"Checklist ID: CK-{ref_id}\n"
                f"Target Audits: Affected Systems and Operational Units\n\n"
                f"{checklist_str or '[ ] 1. Audit all systems for compliance with regulatory updates.'}\n\n"
                f"Verified by Audit Lead Date: _________________________\n"
                f"========================================================================"
            )
        else:
            draft = (
                f"========================================================================\n"
                f"                       INTERNAL COMPLIANCE CIRCULAR\n"
                f"========================================================================\n"
                f"Circular Ref: CIRC-{ref_id}\n"
                f"Date: {date.today().isoformat()}\n"
                f"To: Affected Branch Managers, Compliance Officers, and staff\n\n"
                f"Subject: Mandated Operational Alignments for {context_title}\n\n"
                f"This circular details the immediate operational alignments required to satisfy the newly published "
                f"circular: {context_title} ({context_subtitle}).\n\n"
                f"Key Action Items:\n"
                f"{clauses_str or 'Review all regulatory requirements in the document and update operational flows.'}\n\n"
                f"All branch operations must conform to these rules immediately.\n\n"
                f"Compliance & Legal Division\n"
                f"========================================================================"
            )
            
    # 1. Query max version of this type for the current comparison/document
    query = db.query(ComplianceDraft).filter(
        ComplianceDraft.user_id == user_id,
        ComplianceDraft.type == doc_type
    )
    if payload.comparisonId:
        query = query.filter(ComplianceDraft.comparison_id == payload.comparisonId)
    else:
        query = query.filter(ComplianceDraft.document_id == payload.documentId)
        
    latest_draft = query.order_by(ComplianceDraft.version.desc()).first()
    new_version = (latest_draft.version + 1) if latest_draft else 1

    # Determine title and source details
    draft_title = f"{doc_type.upper()}-{ref_id}-v{new_version}"
    source_name = context_title
    
    # AI model used
    ai_model = settings.OLLAMA_MODEL
    # Check if we utilized the fallback due to Ollama health
    from app.core.ai_service import LlamaAIService
    try:
        health = LlamaAIService.check_ollama_health()
        if health["online"] and not health["target_model_available"] and health["models_available"]:
            ai_model = health["models_available"][0]
    except:
        pass

    # Save draft to database
    db_draft = ComplianceDraft(
        user_id=user_id,
        comparison_id=payload.comparisonId,
        document_id=payload.documentId,
        title=draft_title,
        type=doc_type,
        content=draft,
        source=source_name,
        ai_model=ai_model,
        version=new_version
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)

    return {
        "success": True, 
        "id": str(db_draft.id),
        "type": doc_type, 
        "draft": draft,
        "title": db_draft.title,
        "version": db_draft.version,
        "created_at": db_draft.created_at.isoformat()
    }


@router.get("/drafts")
def list_drafts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    drafts = db.query(ComplianceDraft).filter(
        ComplianceDraft.user_id == user_id
    ).order_by(ComplianceDraft.created_at.desc()).all()
    
    res = []
    for d in drafts:
        res.append({
            "id": str(d.id),
            "comparisonId": str(d.comparison_id) if d.comparison_id else None,
            "documentId": str(d.document_id) if d.document_id else None,
            "title": d.title,
            "type": d.type,
            "source": d.source,
            "aiModel": d.ai_model,
            "version": d.version,
            "created_at": d.created_at.isoformat()
        })
    return res


@router.get("/drafts/{draft_id}")
def get_draft(
    draft_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    draft = db.query(ComplianceDraft).filter(
        ComplianceDraft.id == draft_id,
        ComplianceDraft.user_id == user_id
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft document not found.")
        
    return {
        "success": True,
        "id": str(draft.id),
        "title": draft.title,
        "type": draft.type,
        "content": draft.content,
        "source": draft.source,
        "aiModel": draft.ai_model,
        "version": draft.version,
        "created_at": draft.created_at.isoformat()
    }


@router.get("/drafts/{draft_id}/download")
def download_draft(
    draft_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    draft = db.query(ComplianceDraft).filter(
        ComplianceDraft.id == draft_id,
        ComplianceDraft.user_id == user_id
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft document not found.")
        
    from fastapi.responses import Response
    
    safe_title = draft.title.replace(" ", "_").replace("/", "_")
    filename = f"{safe_title}.txt"
    
    return Response(
        content=draft.content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

