import difflib


def explain_changes(
    old_text,
    new_text
):

    diff = difflib.ndiff(
        old_text.split(),
        new_text.split()
    )

    added = []
    removed = []

    for word in diff:

        if word.startswith("+ "):
            added.append(
                word[2:]
            )

        elif word.startswith("- "):
            removed.append(
                word[2:]
            )

    return {
        "added": added[:20],
        "removed": removed[:20]
    }