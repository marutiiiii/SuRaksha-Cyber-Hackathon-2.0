import chromadb

client = chromadb.CloudClient(
    api_key="ck-J8T4rhpHwaRyhni6jh2PGkRDNFLTFzxAF7ysxoXcKB49",
    tenant="8a810af5-e80b-474e-b853-5a7eb2db214c",
    database="acris-data"
)

collection = client.get_or_create_collection(
    name="regulations_bge"
)


def store_chunk(
    chunk_id,
    chunk_text,
    embedding,
    regulation_id
):

    try:

        collection.add(
            ids=[chunk_id],
            documents=[chunk_text],
            embeddings=[embedding],
            metadatas=[{
                "regulation_id": regulation_id
            }]
        )

        print(
            f"Stored: {chunk_id}"
        )

    except Exception as e:

        print(
            f"Failed to Store {chunk_id}: {e}"
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
            "distances",
            "metadatas"
        ]
    )

    return results


def get_total_chunks():

    return collection.count()