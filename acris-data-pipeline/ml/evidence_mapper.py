EVIDENCE_RULES = {
    "Policy Update": [
        "policy", "framework", "guideline", "procedure",
        "shall", "mandatory", "must", "directive",
    ],
    "SOP Update": [
        "process", "procedure", "workflow", "operational",
        "transaction", "onboarding", "step", "sop",
    ],
    "Screenshot": [
        "system", "software", "technology", "digital",
        "platform", "portal", "cyber", "application",
        "dashboard", "screen",
    ],
    "Log Report": [
        "monitor", "audit", "log", "track", "report",
        "disclosure", "filing", "submit", "record",
        "trail", "surveillance",
    ],
    "Training Record": [
        "training", "awareness", "staff", "employee",
        "certification", "education", "induction",
        "competency",
    ],
    "Compliance Certificate": [
        "penalty", "violation", "contravention", "mandatory",
        "critical", "high", "prosecution", "suspension",
    ],
}


def determine_evidence(action_map):
    combined_text = " ".join([
        action_map.get("action_description", ""),
        action_map.get("source_clause_text", ""),
        action_map.get("business_impact", ""),
        action_map.get("priority", ""),
        " ".join(action_map.get("affected_processes", [])),
    ]).lower()

    required = [
        ev_type
        for ev_type, keywords in EVIDENCE_RULES.items()
        if any(kw in combined_text for kw in keywords)
    ]

    # Guarantee at least one evidence item
    if not required:
        required = ["Policy Update"]

    # Critical / High priority always needs Compliance Certificate
    if action_map.get("priority") in ("Critical", "High"):
        if "Compliance Certificate" not in required:
            required.append("Compliance Certificate")

    return required
