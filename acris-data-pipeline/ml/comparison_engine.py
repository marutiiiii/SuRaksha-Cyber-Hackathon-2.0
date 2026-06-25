from ml.regulation_analyzer import (
    analyze_regulation
)

from ml.change_detector import (
    detect_changes
)

from ml.summary_generator import (
    generate_summary
)


def compare_pdf(
    uploaded_text
):

    result = analyze_regulation(
        uploaded_text
    )

    changes = detect_changes(
        result[
            "matched_regulation"
        ],
        uploaded_text
    )

    summary = generate_summary(
        result
    )

    return {

        "analysis":
            result,

        "changes":
            changes,

        "summary":
            summary
    }