def generate_summary(result):

    areas = ", ".join(
        result["affected_areas"]
    )

    actions = ", ".join(
        result["recommended_actions"][:3]
    )

    summary = f"""
Executive Summary

A {result['change_type']} has been detected.

Affected Areas:
{areas}

Risk Level:
{result['risk_level']}

Recommended Actions:
{actions}
"""

    return summary