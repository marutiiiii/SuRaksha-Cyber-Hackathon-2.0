from load.supabase_loader import (
    get_all_chunks,
    get_regulation_by_id
)

from ml.embedding_generator import (
    generate_embedding
)

from ml.chroma_loader import (
    store_chunk
)


def main():

    chunks = get_all_chunks()

    print(
        f"Total Chunks Found: "
        f"{len(chunks)}"
    )

    for chunk in chunks:

        chunk_id = str(
            chunk["id"]
        )

        chunk_text = (
            chunk["chunk_text"]
        )

        embedding = generate_embedding(
            chunk_text
        )

        store_chunk(
            chunk_id=chunk_id,
            chunk_text=chunk_text,
            embedding=embedding,
            regulation_id=chunk["regulation_id"]
)

    print(
        "\nAll Chunks Stored In ChromaDB"
    )


if __name__ == "__main__":
    main()