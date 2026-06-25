from ml.embedding_generator import (
    generate_embedding
)

from ml.chroma_loader import (
    search_similar_chunks
)

query = (
    "What are KYC requirements?"
)

embedding = generate_embedding(
    query
)

results = search_similar_chunks(
    embedding,
    n_results=5
)

print(results)