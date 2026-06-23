import chromadb

client = chromadb.CloudClient(
    api_key="ck-J8T4rhpHwaRyhni6jh2PGkRDNFLTFzxAF7ysxoXcKB49",
    tenant="8a810af5-e80b-474e-b853-5a7eb2db214c",
    database="acris-data"
)

collection = client.get_or_create_collection(
    name="regulations"
)


def store_chunk(
    chunk_id,
    chunk_text,
    embedding
):

    try:

        collection.add(
            ids=[chunk_id],
            documents=[chunk_text],
            embeddings=[embedding]
        )

        print(
            f"Stored: {chunk_id}"
        )

    except Exception:

        print(
            f"Already Exists: {chunk_id}"
        )


def search_similar_chunks(
    query_embedding,
    n_results=1
):

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=[
            "documents",
            "distances"
        ]
    )

    return results


def get_total_chunks():

    return collection.count()