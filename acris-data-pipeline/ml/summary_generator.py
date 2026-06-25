def generate_summary(result):

    areas = ", ".join(
        result.get(
            "affected_areas",
            []
        )
    )

    actions = ", ".join(
        result.get(
            "recommended_actions",
            []
        )[:3]
    )

    summary = f"""
Executive Summary

A {result.get('change_type', 'UNKNOWN')} has been detected.

Affected Areas:
{areas if areas else 'Not Identified'}

Risk Level:
{result.get('risk_level', 'UNKNOWN')}

Recommended Actions:
{actions if actions else 'No Recommendations Available'}
"""

    return summary