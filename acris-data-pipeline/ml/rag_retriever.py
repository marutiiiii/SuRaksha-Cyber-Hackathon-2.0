from ml.embedding_generator import (
    generate_embedding
)

from ml.chroma_loader import (
    search_similar_chunks
)


def retrieve_context(
    query,
    top_k=5
):

    query_embedding = generate_embedding(
        query
    )

    results = search_similar_chunks(
        query_embedding,
        n_results=top_k
    )

    print("\nRESULTS:\n")
    print(results)

    documents = (
        results["documents"][0]
    )

    context = "\n\n".join(
        documents
    )

    print("\nCONTEXT:\n")
    print(context[:1000])

    return context