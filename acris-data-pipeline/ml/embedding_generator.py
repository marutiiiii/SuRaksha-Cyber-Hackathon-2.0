from ml.model_manager import model


def generate_embedding(text):

    embedding = model.encode(text)

    return embedding.tolist()