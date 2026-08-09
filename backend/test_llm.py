from app.services.llm import LLMService


def main():

    print("Testing OpenRouter LLM...")

    llm = LLMService()

    response = llm.generate(
        system_prompt=(
            "You are a technical interviewer. "
            "Ask one short technical question."
        ),
        user_prompt=(
            "Ask me one technical interview question "
            "about Retrieval-Augmented Generation (RAG)."
        )
    )

    print("\nAI RESPONSE:")
    print(response)


if __name__ == "__main__":
    main()