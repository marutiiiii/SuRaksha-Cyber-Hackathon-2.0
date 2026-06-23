def analyze_impact(text):

    tags = []

    if "KYC" in text.upper():
        tags.append("KYC")

    if "AML" in text.upper():
        tags.append("AML")

    if "CYBER" in text.upper():
        tags.append("Cybersecurity")

    if "PAYMENT" in text.upper():
        tags.append("Payments")

    if "LENDING" in text.upper():
        tags.append("Lending")

    return tags
def calculate_risk_level(tags):

    if len(tags) >= 3:
        return "HIGH"

    elif len(tags) >= 2:
        return "MEDIUM"

    elif len(tags) >= 1:
        return "LOW"

    return "NO IMPACT"