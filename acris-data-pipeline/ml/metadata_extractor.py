import re

AUTHORITIES = [
    "Reserve Bank of India",
    "RBI",
    "Securities and Exchange Board of India",
    "SEBI",
    "Insurance Regulatory and Development Authority",
    "IRDAI",
    "Pension Fund Regulatory and Development Authority",
    "PFRDA",
    "Ministry of Finance",
    "FIU-IND",
    "NABARD",
    "NHB",
    "SIDBI",
    "Ministry of Corporate Affairs",
    "MCA",
    "Financial Intelligence Unit",
]

CATEGORIES = {
    "KYC / CDD": [
        "kyc", "know your customer", "customer identification",
        "customer due diligence", "cdd", "beneficial owner",
    ],
    "AML / CFT": [
        "aml", "anti-money laundering", "money laundering",
        "suspicious transaction", "cft", "financing of terrorism",
        "str", "ctr",
    ],
    "Cybersecurity": [
        "cyber", "information security", "data protection",
        "data breach", "ransomware", "incident response",
    ],
    "Payments": [
        "payment", "remittance", "transfer", "upi", "neft",
        "rtgs", "prepaid", "wallet",
    ],
    "Lending": [
        "loan", "credit", "lending", "borrower", "npa",
        "npa provisioning", "recovery", "restructuring",
    ],
    "Capital Adequacy": [
        "capital", "crar", "tier 1", "tier 2", "basel",
        "leverage ratio", "liquidity coverage",
    ],
    "Fraud Prevention": [
        "fraud", "forgery", "misrepresentation", "impersonation",
    ],
    "Regulatory Reporting": [
        "return", "disclosure", "filing", "quarterly report",
        "annual report", "monthly return",
    ],
    "Governance": [
        "board", "governance", "director", "committee",
        "internal audit", "risk management",
    ],
}

DATE_PATTERNS = [
    r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b',
    r'\b(\d{1,2}\s+(?:January|February|March|April|May|June|July'
    r'|August|September|October|November|December)\s*,?\s*\d{4})\b',
    r'\b((?:January|February|March|April|May|June|July'
    r'|August|September|October|November|December)\s+\d{1,2}\s*,?\s*\d{4})\b',
]

CIRCULAR_PATTERNS = [
    r'(RBI\/\d{4}[-–]\d{2,4}\/\d+)',
    r'(DBOD\.No\.[A-Z.]+\/\d+)',
    r'(SEBI\/HO\/[A-Z\/]+\/\d+)',
    r'(IRDAI\/[A-Z\/\-]+\/\d+)',
    r'([A-Z]{2,}\/[A-Z]{2,}\/\d{4}[-–]\d{2,4}\/\d+)',
    r'(Circular\s+No\.?\s*[\w\/\-]+)',
    r'(Ref\.?\s*No\.?\s*[\w\/\-]+)',
]


def extract_metadata(text):
    return {
        "title": _extract_title(text),
        "issuing_authority": _extract_authority(text),
        "publication_date": _extract_date(text, "publication"),
        "effective_date": _extract_date(text, "effective"),
        "circular_number": _extract_circular_number(text),
        "regulatory_category": _extract_category(text),
    }


def _extract_title(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    title_keywords = [
        "circular", "guidelines", "directions", "regulations",
        "master direction", "notification", "framework", "policy",
        "amendment", "instruction", "advisory",
    ]

    # Priority: lines with regulatory title indicators
    for line in lines[:20]:
        if 20 < len(line) < 250:
            lower = line.lower()
            if any(kw in lower for kw in title_keywords):
                return line.strip('.')

    # Fallback: first meaningful non-trivial line
    for line in lines[:5]:
        if len(line) > 15:
            return line.strip('.')

    return "Regulation Document"


def _extract_authority(text):
    for auth in AUTHORITIES:
        if auth in text:
            return auth
    text_upper = text.upper()
    for auth in AUTHORITIES:
        if auth.upper() in text_upper:
            return auth
    return "Unknown Authority"


def _extract_date(text, date_type):
    text_lower = text.lower()

    if date_type == "effective":
        anchors = [
            "with effect from", "effective from", "w.e.f.",
            "effective date", "come into effect",
        ]
    else:
        anchors = [
            "dated", "date:", "published on", "issued on",
            "issued:", "date of issue",
        ]

    for anchor in anchors:
        idx = text_lower.find(anchor)
        if idx != -1:
            snippet = text[idx: idx + 100]
            for pattern in DATE_PATTERNS:
                m = re.search(pattern, snippet, re.IGNORECASE)
                if m:
                    return m.group(1).strip()

    # Fallback: first date in document
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()

    return "Not specified"


def _extract_circular_number(text):
    for pattern in CIRCULAR_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return "Not specified"


def _extract_category(text):
    text_lower = text.lower()
    matched = []
    for category, keywords in CATEGORIES.items():
        for kw in keywords:
            if kw in text_lower:
                matched.append(category)
                break
    return matched if matched else ["General Compliance"]
