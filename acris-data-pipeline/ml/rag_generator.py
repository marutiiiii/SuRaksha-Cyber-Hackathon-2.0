import requests


def generate_answer(
    query,
    context
):

    prompt = f"""
You are ACRIS Regulatory Assistant.

Answer ONLY using the context.

If information is missing,
say:
"Not found in regulations."

Context:
{context}

Question:
{query}

Answer:
"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
    )

    return response.json()[
        "response"
    ]