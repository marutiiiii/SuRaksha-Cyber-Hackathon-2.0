def recommend_actions(affected_areas, risk_level):
    """Return a list of structured action dicts."""
    actions = []

    if "KYC / CDD" in affected_areas:
        actions.append({
            "action": "Review and update KYC Policy",
            "department": "Compliance",
        })
        actions.append({
            "action": "Update Customer Onboarding Process and CDD procedures",
            "department": "Operations",
        })

    if "AML / CFT" in affected_areas:
        actions.append({
            "action": "Review AML Monitoring Rules and alert thresholds",
            "department": "Compliance",
        })
        actions.append({
            "action": "Validate Suspicious Transaction Reporting (STR/CTR) workflow",
            "department": "Operations",
        })

    if "Lending" in affected_areas:
        actions.append({
            "action": "Review Lending Procedures and credit policy",
            "department": "Finance",
        })

    if "Cybersecurity" in affected_areas:
        actions.append({
            "action": "Review Cybersecurity Controls and incident response plan",
            "department": "IT / Risk",
        })

    if "Payments" in affected_areas:
        actions.append({
            "action": "Review Payment Processing procedures and limits",
            "department": "Operations",
        })

    if "Regulatory Reporting" in affected_areas:
        actions.append({
            "action": "Update regulatory return templates and submission schedule",
            "department": "Compliance",
        })

    if "Governance" in affected_areas:
        actions.append({
            "action": "Review Board-approved governance framework",
            "department": "Legal",
        })

    if "HR / Training" in affected_areas:
        actions.append({
            "action": "Schedule staff awareness and training sessions",
            "department": "HR / Training",
        })

    if risk_level in ("CRITICAL", "HIGH"):
        actions.append({
            "action": "Conduct enterprise-wide Compliance Gap Analysis",
            "department": "Compliance",
        })
        actions.append({
            "action": "Notify Compliance Officer and Senior Management",
            "department": "Compliance",
        })
        actions.append({
            "action": "Schedule Internal Audit to validate controls",
            "department": "Audit",
        })

    # Deduplicate by action description
    seen = set()
    unique = []
    for a in actions:
        if a["action"] not in seen:
            seen.add(a["action"])
            unique.append(a)

    return unique