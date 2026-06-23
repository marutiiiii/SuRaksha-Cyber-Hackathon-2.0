def recommend_actions(
    affected_areas,
    risk_level
):

    actions = []

    if "KYC" in affected_areas:

        actions.append(
            "Review KYC Policy"
        )

        actions.append(
            "Update Customer Onboarding Process"
        )

    if "AML" in affected_areas:

        actions.append(
            "Review AML Monitoring Rules"
        )

        actions.append(
            "Validate Suspicious Transaction Reporting"
        )

    if "Lending" in affected_areas:

        actions.append(
            "Review Lending Procedures"
        )

    if "Cybersecurity" in affected_areas:

        actions.append(
            "Review Cybersecurity Controls"
        )

    if risk_level == "HIGH":

        actions.append(
            "Conduct Compliance Gap Analysis"
        )

        actions.append(
            "Notify Compliance Team"
        )

        actions.append(
            "Schedule Internal Audit"
        )

    return list(set(actions))