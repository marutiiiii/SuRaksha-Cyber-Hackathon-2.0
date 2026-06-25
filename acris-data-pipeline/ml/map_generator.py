from datetime import date, timedelta

PRIORITY_RULES = [
    (
        "Critical",
        [
            "penalty", "prosecution", "contravention", "immediate",
            "suspension", "cancel", "revoke", "imprisonment",
        ],
    ),
    (
        "High",
        [
            "shall", "must", "mandatory", "required", "obligation",
            "prohibited", "not permitted", "liable",
        ],
    ),
    (
        "Medium",
        [
            "should", "maintain", "submit", "report", "disclose",
            "furnish", "review", "ensure", "monitor",
        ],
    ),
    (
        "Low",
        [
            "may", "guidelines", "recommend", "advisory", "consider",
            "encouraged",
        ],
    ),
]

DUE_DATE_DAYS = {
    "Critical": 30,
    "High": 60,
    "Medium": 90,
    "Low": 180,
}


def generate_maps(comparison, metadata):
    maps = []
    map_idx = 1

    changed = (
        comparison.get("added", [])
        + comparison.get("modified", [])
        + comparison.get("removed", [])
    )

    for clause in changed:
        priority = _determine_priority(clause)
        departments = clause.get("affected_departments", ["Compliance"])
        processes = clause.get("affected_processes", ["General Compliance"])
        change_type = clause.get("change_type", "modified")

        due_date = (
            date.today() + timedelta(days=DUE_DATE_DAYS[priority])
        ).strftime("%Y-%m-%d")

        action_desc = _build_action(clause, change_type, processes)
        dependency = _determine_dependency(processes)

        # Create one MAP per primary department (max 2)
        for dept in departments[:2]:
            maps.append(
                {
                    "map_id": f"MAP-{map_idx:03d}",
                    "action_description": action_desc,
                    "owner_department": dept,
                    "priority": priority,
                    "due_date_recommendation": due_date,
                    "dependency": dependency,
                    "source_clause_id": clause.get("id", "N/A"),
                    "source_clause_heading": clause.get("heading", ""),
                    "source_clause_text": clause.get("text", "")[:250],
                    "change_type": change_type,
                    "affected_processes": processes,
                    "change_explanation": clause.get("change_explanation", ""),
                    "business_impact": clause.get("business_impact", ""),
                }
            )
            map_idx += 1

    return maps


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _determine_priority(clause):
    text_lower = clause.get("text", "").lower()
    for priority, keywords in PRIORITY_RULES:
        if any(kw in text_lower for kw in keywords):
            return priority
    return "Low"


def _build_action(clause, change_type, processes):
    heading = clause.get("heading", "clause")[:80]
    process = processes[0] if processes else "compliance processes"

    if change_type == "added":
        return (
            f"Implement new compliance controls for newly introduced clause: "
            f'"{heading}"'
        )
    elif change_type == "removed":
        return (
            f"Review and retire existing controls linked to removed clause: "
            f'"{heading}"'
        )
    elif change_type == "modified":
        return (
            f"Update {process} procedures to reflect changes in: "
            f'"{heading}"'
        )
    return f'Review and take action on: "{heading}"'


def _determine_dependency(processes):
    if "Policy Management" in processes:
        return "Requires Board / Senior Management approval before implementation"
    if "IT Controls" in processes:
        return "Requires IT Change Management process and UAT sign-off"
    if "Staff Training" in processes:
        return "Dependent on Training Calendar slot and LMS availability"
    if "Audit & Inspection" in processes:
        return "Dependent on Audit Committee review and sign-off"
    return "Independent — no prior dependency identified"
