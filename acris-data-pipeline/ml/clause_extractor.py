import re

SECTION_PATTERNS = [
    r'^(\d+\.\d+\.?\d*\.?)\s+(.{5,})',    # 1.1, 1.1.1
    r'^(\d+)\.\s+(.{5,})',                 # 1. Title
    r'^(Section\s+\d+[\.:]?)\s*(.{0,})',  # Section 1
    r'^(Clause\s+\d+[\.:]?)\s*(.{0,})',   # Clause 1
    r'^([A-Z][A-Z\s]{3,30}:)\s*(.{0,})',  # ALL CAPS HEADING:
    r'^([IVXLCDM]{1,6}\.)\s+(.{5,})',     # Roman numerals
]

OBLIGATION_KEYWORDS = [
    "shall", "must", "required", "mandatory", "obligation",
    "comply", "ensure", "maintain", "submit", "report",
    "disclose", "furnish", "audit", "monitor", "verify",
    "prohibited", "not permitted", "liable", "penalty",
    "contravention", "violation",
]

MIN_CLAUSE_LENGTH = 60


def extract_clauses(text):
    paragraphs = [
        p.strip()
        for p in re.split(r'\n{2,}', text)
        if p.strip()
    ]

    clauses = []
    current_heading = "Preamble"
    current_texts = []
    clause_id = 0

    for para in paragraphs:
        section_match = _match_section_header(para)

        if section_match:
            # Flush current buffer
            if current_texts:
                body = " ".join(current_texts)
                if len(body) >= MIN_CLAUSE_LENGTH:
                    clauses.append(
                        _build_clause(clause_id, current_heading, body)
                    )
                    clause_id += 1
                current_texts = []

            current_heading = para[:120].strip()

            # Capture inline text after heading
            remainder = para[len(section_match.group(0)):].strip()
            if remainder:
                current_texts.append(remainder)
        else:
            if len(para) >= MIN_CLAUSE_LENGTH:
                current_texts.append(para)

    # Flush last buffer
    if current_texts:
        body = " ".join(current_texts)
        if len(body) >= MIN_CLAUSE_LENGTH:
            clauses.append(
                _build_clause(clause_id, current_heading, body)
            )

    # Fallback: no structure found → extract obligation sentences
    if not clauses:
        clauses = _extract_obligation_sentences(text)

    return clauses


def _match_section_header(para):
    for pattern in SECTION_PATTERNS:
        m = re.match(pattern, para, re.MULTILINE)
        if m:
            return m
    return None


def _extract_obligation_sentences(text):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    clauses = []
    idx = 0
    for s in sentences:
        s = s.strip()
        if (
            len(s) >= MIN_CLAUSE_LENGTH
            and any(kw in s.lower() for kw in OBLIGATION_KEYWORDS)
        ):
            clauses.append(
                _build_clause(idx, f"Obligation {idx + 1}", s)
            )
            idx += 1
        if idx >= 50:  # Cap at 50 fallback clauses
            break
    return clauses


def _build_clause(clause_idx, heading, text):
    text_lower = text.lower()
    matched_kws = [kw for kw in OBLIGATION_KEYWORDS if kw in text_lower]

    return {
        "id": f"CL-{clause_idx + 1:03d}",
        "heading": heading.strip(),
        "text": text.strip(),
        "obligation_keywords": matched_kws,
        "is_obligation": len(matched_kws) > 0,
    }
