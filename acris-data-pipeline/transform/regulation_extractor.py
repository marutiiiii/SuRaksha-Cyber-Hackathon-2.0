HIGH_PRIORITY = [
    "shall",
    "shall not",
    "must",
    "required to",
    "mandatory",
    "obligation",
    "compliance",
    "penalty",
    "violation",
    "contravention",
    "under section"
]

MEDIUM_PRIORITY = [
    "amendment",
    "amended",
    "modified",
    "inserted",
    "replaced",
    "revised",
    "withdrawn",
    "exemption",
    "waiver",
    "maintain",
    "submit",
    "report",
    "disclose",
    "furnish",
    "audit",
    "inspect",
    "monitor",
    "verify"
]

LOW_PRIORITY = [
    "guidelines",
    "circular",
    "threshold",
    "limit",
    "ceiling",
    "maximum",
    "minimum",
    "quarterly return",
    "monthly return",
    "annual return",
    "regulatory filing"
]


def extract_regulations(text):

    paragraphs = text.split("\n\n")

    regulations = []

    total_paragraphs = len(paragraphs)

    for para in paragraphs:

        para = para.strip()

        if len(para) < 50:
            continue

        para_lower = para.lower()

        score = 0

        for keyword in HIGH_PRIORITY:
            if keyword in para_lower:
                score += 3

        for keyword in MEDIUM_PRIORITY:
            if keyword in para_lower:
                score += 2

        for keyword in LOW_PRIORITY:
            if keyword in para_lower:
                score += 1

        try:
            print(
                f"Score: {score} | "
                f"{para[:100]}"
            )
        except UnicodeEncodeError:
            try:
                safe_para = para[:100].encode('ascii', errors='replace').decode('ascii')
                print(f"Score: {score} | {safe_para}")
            except Exception:
                pass

        if score >= 3:
            regulations.append(para)

    print(
        f"\nTotal Paragraphs: {total_paragraphs}"
    )

    print(
        f"Matched Paragraphs: {len(regulations)}"
    )

    return "\n\n".join(regulations)