DEPT_TAGS = {
    "KYC / CDD": [
        "kyc", "know your customer", "customer identification",
        "due diligence", "beneficial owner",
    ],
    "AML / CFT": [
        "aml", "anti-money laundering", "money laundering",
        "suspicious transaction", "cft", "str", "ctr",
    ],
    "Cybersecurity": [
        "cyber", "information security", "data protection",
        "breach", "ransomware",
    ],
    "Payments": [
        "payment", "remittance", "transfer", "upi", "neft", "rtgs",
    ],
    "Lending": [
        "loan", "credit", "lending", "borrower", "npa",
    ],
    "Capital Adequacy": [
        "capital", "crar", "tier 1", "tier 2", "basel",
    ],
    "Fraud Prevention": [
        "fraud", "forgery", "misrepresentation",
    ],
    "Regulatory Reporting": [
        "report", "return", "disclose", "furnish", "filing",
    ],
    "Governance": [
        "board", "governance", "director", "committee",
    ],
    "IT / Risk": [
        "technology", "digital", "system", "software", "infrastructure",
    ],
    "Finance": [
        "financial", "fund", "limit", "threshold", "fee", "fine",
    ],
    "Legal": [
        "legal", "law", "court", "penalty", "prosecution",
    ],
    "HR / Training": [
        "training", "staff", "employee", "awareness", "certification",
    ],
    "Audit": [
        "audit", "inspect", "review", "examination",
    ],
}


def analyze_impact(text):
    text_lower = text.lower()
    matched = [
        tag
        for tag, keywords in DEPT_TAGS.items()
        if any(kw in text_lower for kw in keywords)
    ]
    risk_level = _calculate_risk(matched)
    return {
        "affected_areas": matched,
        "risk_level": risk_level,
    }


def _calculate_risk(tags):
    if len(tags) >= 5:
        return "CRITICAL"
    elif len(tags) >= 3:
        return "HIGH"
    elif len(tags) >= 2:
        return "MEDIUM"
    elif len(tags) >= 1:
        return "LOW"
    return "NO IMPACT"