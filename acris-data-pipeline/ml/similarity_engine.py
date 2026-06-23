from ml.model_manager import model
from sklearn.metrics.pairwise import cosine_similarity


def calculate_similarity(text1, text2):

    emb1 = model.encode(text1)

    emb2 = model.encode(text2)

    score = cosine_similarity(
        [emb1],
        [emb2]
    )[0][0]

    return score


def classify_change(score):

    if score > 0.90:
        return "MINOR CHANGE"

    elif score > 0.70:
        return "MODERATE CHANGE"

    else:
        return "MAJOR CHANGE"