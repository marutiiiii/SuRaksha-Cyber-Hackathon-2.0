from ml.embedding_generator import generate_embedding
from ml.chroma_loader import search_similar_chunks
from ml.similarity_engine import calculate_similarity, classify_change
from load.sqlite_loader import get_regulation_by_id
from ml.impact_analyzer import analyze_impact
from ml.action_recommender import recommend_actions
from ml.metadata_extractor import extract_metadata
from ml.clause_extractor import extract_clauses
from ml.clause_comparator import compare_clauses
from ml.map_generator import generate_maps
from ml.evidence_mapper import determine_evidence
from ml.risk_scorer import score_risk
from ml.citation_tracker import attach_citations


def analyze_regulation(new_text):
    """
    Orchestrate the full 8-step ReguFlow AI intelligence pipeline.

    Returns a rich dict containing:
        metadata, clauses, comparison, maps, risk,
        and legacy fields for backward compatibility.
    """

    # ── Step 1: Extract regulation metadata ───────────────────────────────
    metadata = extract_metadata(new_text)

    # ── Step 2: Extract clauses from the new document ─────────────────────
    new_clauses = extract_clauses(new_text)

    # ── Step 3: Find best matching regulation in ChromaDB ─────────────────
    embedding = generate_embedding(new_text)
    results = search_similar_chunks(embedding, n_results=1)

    if (not results or 
        "metadatas" not in results or 
        not results["metadatas"] or 
        not results["metadatas"][0] or
        not results["metadatas"][0][0]):
        raise ValueError("No matching regulation found in the database. Please upload a document that has a registered reference regulation.")

    regulation_id = results["metadatas"][0][0]["regulation_id"]
    regulation = get_regulation_by_id(regulation_id)
    old_text = regulation["content"]

    # Legacy similarity fields
    score = calculate_similarity(old_text, new_text)
    change_type = classify_change(score)

    # ── Step 3b: Extract clauses from the previous version ────────────────
    old_clauses = extract_clauses(old_text)

    # ── Step 4: Clause-level comparison ───────────────────────────────────
    comparison = compare_clauses(new_clauses, old_clauses)

    # ── Step 5: Impact analysis (areas + legacy risk level) ───────────────
    impact = analyze_impact(new_text)

    # ── Step 6: Generate Measurable Action Points (MAPs) ──────────────────
    maps = generate_maps(comparison, metadata)

    # If no clause-based MAPs, fall back to area-based actions
    if not maps:
        legacy_actions = recommend_actions(
            impact["affected_areas"],
            impact["risk_level"],
        )
        for idx, a in enumerate(legacy_actions, 1):
            maps.append(
                {
                    "map_id": f"MAP-{idx:03d}",
                    "action_description": a["action"],
                    "owner_department": a["department"],
                    "priority": "Medium",
                    "due_date_recommendation": "90 days from effective date",
                    "dependency": "Independent",
                    "source_clause_id": "N/A",
                    "source_clause_heading": "",
                    "source_clause_text": "",
                    "change_type": "modified",
                    "affected_processes": [],
                    "change_explanation": "",
                    "business_impact": "",
                }
            )

    # ── Step 7: Determine required evidence for each MAP ──────────────────
    for m in maps:
        m["evidence"] = determine_evidence(m)

    # ── Step 8: Compute multi-dimensional risk score ───────────────────────
    risk = score_risk(new_text, comparison, maps)

    # ── Step 9: Attach source citations ───────────────────────────────────
    maps = attach_citations(maps, metadata, regulation)

    # ── Assemble intelligence report ──────────────────────────────────────
    return {
        # ── Structured intelligence ──────────────────────────────────────
        "metadata": metadata,
        "clauses": new_clauses,
        "comparison": comparison,
        "maps": maps,
        "risk": risk,

        # ── Legacy / backward-compat fields ──────────────────────────────
        "regulation_id": regulation_id,
        "pdf_name": regulation["pdf_name"],
        "source": regulation["source"],
        "matched_regulation": old_text,
        "similarity_score": float(score),
        "change_type": change_type,
        "affected_areas": impact["affected_areas"],
        "risk_level": impact["risk_level"],
        "recommended_actions": [m["action_description"] for m in maps],
    }