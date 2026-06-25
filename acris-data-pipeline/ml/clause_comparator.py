from ml.model_manager import model
from sklearn.metrics.pairwise import cosine_similarity

ADDED_THRESHOLD = 0.50
MODIFIED_THRESHOLD = 0.90

DEPT_KEYWORDS = {
    "Compliance": [
        "compliance", "regulatory", "kyc", "aml", "obligation",
        "circular", "directive", "guideline",
    ],
    "Legal": [
        "legal", "law", "court", "penalty", "prosecution",
        "contravention", "offence", "liability",
    ],
    "IT / Risk": [
        "cyber", "system", "technology", "data", "digital",
        "software", "application", "infrastructure",
    ],
    "Finance": [
        "capital", "financial", "fund", "limit", "threshold",
        "fee", "fine", "provision", "loss", "exposure",
    ],
    "Operations": [
        "process", "procedure", "operational", "workflow",
        "transaction", "onboarding", "processing",
    ],
    "HR / Training": [
        "training", "staff", "employee", "awareness",
        "capacity building", "certification", "education",
    ],
    "Audit": [
        "audit", "inspect", "report", "disclosure", "review",
        "examination", "monitor", "scrutiny",
    ],
}

PROCESS_KEYWORDS = {
    "Customer Onboarding": [
        "onboarding", "kyc", "customer identification", "account opening",
        "due diligence",
    ],
    "Transaction Monitoring": [
        "transaction", "monitoring", "suspicious", "alert", "ctr", "str",
    ],
    "Reporting & Disclosure": [
        "report", "return", "disclose", "furnish", "filing", "submit",
    ],
    "Risk Management": [
        "risk", "exposure", "limit", "capital", "stress", "framework",
    ],
    "Audit & Inspection": [
        "audit", "inspection", "review", "examination", "scrutiny",
    ],
    "Policy Management": [
        "policy", "procedure", "framework", "guideline", "sop",
    ],
    "IT Controls": [
        "cyber", "system", "access", "data", "security", "breach",
    ],
    "Staff Training": [
        "training", "awareness", "education", "certification", "induction",
    ],
}


def compare_clauses(new_clauses, old_clauses):
    if not old_clauses:
        return {
            "added": [_tag_added(c) for c in new_clauses],
            "removed": [],
            "modified": [],
            "unchanged": [],
        }

    if not new_clauses:
        return {
            "added": [],
            "removed": [_tag_removed(c) for c in old_clauses],
            "modified": [],
            "unchanged": [],
        }

    new_texts = [c["text"] for c in new_clauses]
    old_texts = [c["text"] for c in old_clauses]

    new_embeddings = model.encode(new_texts, show_progress_bar=False)
    old_embeddings = model.encode(old_texts, show_progress_bar=False)

    sim_matrix = cosine_similarity(new_embeddings, old_embeddings)

    added, modified, unchanged = [], [], []
    matched_old_indices = set()

    for i, new_clause in enumerate(new_clauses):
        best_score = float(sim_matrix[i].max())
        best_old_idx = int(sim_matrix[i].argmax())

        if best_score < ADDED_THRESHOLD:
            added.append(_tag_added(new_clause, score=best_score))

        elif best_score < MODIFIED_THRESHOLD:
            old_clause = old_clauses[best_old_idx]
            modified.append(
                _tag_modified(new_clause, old_clause, best_score)
            )
            matched_old_indices.add(best_old_idx)

        else:
            unchanged.append(new_clause)
            matched_old_indices.add(best_old_idx)

    removed = [
        _tag_removed(old_clauses[i])
        for i in range(len(old_clauses))
        if i not in matched_old_indices
    ]

    return {
        "added": added,
        "removed": removed,
        "modified": modified,
        "unchanged": unchanged,
    }


# ─── Change tagging ────────────────────────────────────────────────────────────

def _tag_added(clause, score=None):
    c = dict(clause)
    c["change_type"] = "added"
    c["similarity_score"] = round(score, 4) if score is not None else 0.0
    text_preview = clause["text"][:150].strip()
    c["change_explanation"] = (
        f"New obligation introduced that did not exist in the previous version. "
        f'Preview: "{text_preview}…" — This requires immediate policy and control implementation.'
    )
    c["business_impact"] = _assess_impact(clause)
    c["affected_processes"] = _match_processes(clause["text"])
    c["affected_departments"] = _match_departments(clause["text"])
    return c


def _tag_removed(clause):
    c = dict(clause)
    c["change_type"] = "removed"
    c["similarity_score"] = 0.0
    text_preview = clause["text"][:150].strip()
    c["change_explanation"] = (
        f"This clause has been removed from the regulation. "
        f'Content: "{text_preview}…" — Existing controls tied to this clause may be retired.'
    )
    c["business_impact"] = (
        "Controls and policies referencing this clause must be reviewed. "
        "Removal may reduce compliance burden but could also signal a policy gap."
    )
    c["affected_processes"] = _match_processes(clause["text"])
    c["affected_departments"] = _match_departments(clause["text"])
    return c


def _tag_modified(new_clause, old_clause, score):
    c = dict(new_clause)
    c["change_type"] = "modified"
    c["old_text"] = old_clause["text"]
    c["similarity_score"] = round(score, 4)
    c["change_explanation"] = (
        f"Clause modified from previous version (similarity: {round(score * 100, 1)}%). "
        f"Key obligations, thresholds, or timelines may have changed — review delta carefully."
    )
    c["business_impact"] = _assess_impact(new_clause)
    c["affected_processes"] = _match_processes(new_clause["text"])
    c["affected_departments"] = _match_departments(new_clause["text"])
    return c


# ─── Impact & mapping helpers ──────────────────────────────────────────────────

def _assess_impact(clause):
    text_lower = clause["text"].lower()
    if any(
        k in text_lower
        for k in ["penalty", "violation", "contravention", "prosecution", "suspend"]
    ):
        return (
            "HIGH — Non-compliance may result in regulatory penalties, "
            "legal action, or suspension of operations."
        )
    elif any(k in text_lower for k in ["shall", "must", "mandatory", "required"]):
        return (
            "MEDIUM — Mandatory obligation that must be reflected in "
            "internal policies, procedures, and controls."
        )
    elif clause.get("obligation_keywords"):
        return (
            "LOW — Advisory or procedural guidance requiring "
            "policy review and awareness communication."
        )
    return "MINIMAL — Informational clause with no direct compliance obligation."


def _match_processes(text):
    text_lower = text.lower()
    matched = [
        proc
        for proc, keywords in PROCESS_KEYWORDS.items()
        if any(kw in text_lower for kw in keywords)
    ]
    return matched or ["General Compliance"]


def _match_departments(text):
    text_lower = text.lower()
    matched = [
        dept
        for dept, keywords in DEPT_KEYWORDS.items()
        if any(kw in text_lower for kw in keywords)
    ]
    return matched or ["Compliance"]
