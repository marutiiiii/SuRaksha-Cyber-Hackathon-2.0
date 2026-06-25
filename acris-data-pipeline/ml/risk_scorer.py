SEVERITY_KEYWORDS = [
    "shall", "must", "penalty", "violation", "contravention",
    "prosecution", "mandatory", "obligation", "suspension",
    "revoke", "cancel", "imprisonment", "liable",
]

FINANCIAL_KEYWORDS = [
    "fine", "penalty", "capital", "limit", "threshold",
    "fee", "loss", "exposure", "provision", "npa",
    "write-off", "impairment", "reserve",
]

EVIDENCE_COMPLEXITY = {
    "Compliance Certificate": 2.0,
    "Policy Update": 1.0,
    "SOP Update": 1.0,
    "Log Report": 1.0,
    "Screenshot": 0.5,
    "Training Record": 0.5,
}


def score_risk(text, comparison, maps):
    reg_severity = _score_regulatory_severity(text)
    fin_impact = _score_financial_impact(text)
    ops_impact = _score_operational_impact(comparison, maps)
    audit_exposure = _score_audit_exposure(maps)

    final = (
        reg_severity   * 0.35
        + fin_impact   * 0.25
        + ops_impact   * 0.25
        + audit_exposure * 0.15
    )
    final = round(min(10.0, max(1.0, final)), 1)

    return {
        "final_score": final,
        "regulatory_severity": round(reg_severity, 1),
        "financial_impact": round(fin_impact, 1),
        "operational_impact": round(ops_impact, 1),
        "audit_exposure": round(audit_exposure, 1),
        "risk_label": _label(final),
    }


# ─── Dimension scorers ─────────────────────────────────────────────────────────

def _score_regulatory_severity(text):
    text_lower = text.lower()
    count = sum(text_lower.count(kw) for kw in SEVERITY_KEYWORDS)
    return min(10.0, count * 0.4)


def _score_financial_impact(text):
    text_lower = text.lower()
    count = sum(text_lower.count(kw) for kw in FINANCIAL_KEYWORDS)
    return min(10.0, count * 0.7)


def _score_operational_impact(comparison, maps):
    n_changes = (
        len(comparison.get("added", []))
        + len(comparison.get("removed", []))
        + len(comparison.get("modified", []))
    )
    unique_depts = {m.get("owner_department", "") for m in maps}
    score = n_changes * 0.8 + len(unique_depts) * 0.5
    return min(10.0, score)


def _score_audit_exposure(maps):
    if not maps:
        return 1.0
    total = 0.0
    for m in maps:
        for ev in m.get("evidence", []):
            total += EVIDENCE_COMPLEXITY.get(ev, 0.5)
    avg = total / len(maps)
    return min(10.0, avg * 2.5)


def _label(score):
    if score >= 8:
        return "CRITICAL"
    elif score >= 6:
        return "HIGH"
    elif score >= 4:
        return "MEDIUM"
    return "LOW"
