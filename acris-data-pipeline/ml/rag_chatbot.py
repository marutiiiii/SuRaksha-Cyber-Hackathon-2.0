from ml.rag_retriever import (
    retrieve_context
)

from ml.rag_generator import (
    generate_answer
)


def ask_question(query):

    context = retrieve_context(
        query
    )

    answer = generate_answer(
        query,
        context
    )

    return answer