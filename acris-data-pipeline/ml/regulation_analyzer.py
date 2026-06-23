from ml.embedding_generator import (
    generate_embedding
)
from ml.summary_generator import (
    generate_summary
)

from ml.chroma_loader import (
    search_similar_chunks
)

from ml.similarity_engine import (
    calculate_similarity,
    classify_change
)

from ml.impact_analyzer import (
    analyze_impact,
    calculate_risk_level
)

from ml.action_recommender import (
    recommend_actions
)

from ml.change_explainer import (
    explain_changes
)

def analyze_regulation(new_text):

    # Generate embedding for new regulation
    embedding = generate_embedding(
        new_text
    )

    # Find most similar regulation
    results = search_similar_chunks(
        embedding,
        n_results=1
    )

    old_text = (
        results["documents"][0][0]
    )

    # Calculate similarity
    score = calculate_similarity(
        old_text,
        new_text
    )
    
    changes = explain_changes(
    old_text,
    new_text
)

    # Classify change
    change_type = classify_change(
        score
    )

    # Impact Analysis
    tags = analyze_impact(
        new_text
    )

    risk = calculate_risk_level(
        tags
    )
    actions = recommend_actions(
    tags,
    risk
)
    summary = generate_summary(
    {
        "affected_areas": tags,
        "risk_level": risk,
        "change_type": change_type,
        "recommended_actions": actions
    }
)

    return {

    "matched_regulation":
        old_text[:300],

    "similarity_score":
        score,

    "change_type":
        change_type,

    "affected_areas":
        tags,

    "risk_level":
        risk,

    "recommended_actions":
        actions,

    "changes":
        changes,

    "summary":
        summary
}