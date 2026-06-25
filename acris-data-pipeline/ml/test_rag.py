from ml.rag_chatbot import (
    ask_question
)

query = (
    "List all the regulations."
)

answer = ask_question(
    query
)

print(answer)