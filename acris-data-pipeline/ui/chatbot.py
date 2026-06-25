import sys
import os

sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)
import streamlit as st

from ml.rag_chatbot import (
    ask_question
)

st.title(
    "ACRIS Regulatory Chatbot"
)

query = st.text_input(
    "Ask Regulation Question"
)

if st.button("Ask"):

    answer = ask_question(
        query
    )

    st.write(answer)