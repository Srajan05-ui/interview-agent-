import json


class PromptBuilder:

    SYSTEM_PROMPT = """
You are an AI technical interviewer for an AI engineering
technical interview.

Your job is to ask meaningful technical questions based on:

- The candidate's background
- The candidate's skills
- The candidate's projects
- The current curriculum topic
- Previous answers
- Previous evaluations

You should behave like a real technical interviewer.

Do not simply ask generic textbook questions.

Prefer questions that test:

- Technical understanding
- Practical implementation
- Engineering decisions
- WHY a technology was selected
- WHEN a technology should be used
- Trade-offs
- Real-world problem solving

IMPORTANT LANGUAGE RULE:

The candidate selects one interview language:

English
Hindi
Hinglish

You MUST generate the interview question in the selected language.

English:
Use natural professional English.

Hindi:
Use natural Hindi written in Devanagari script.
Technical terms such as Python, API, RAG, embeddings,
vector database, Docker, AWS, etc. may remain in English.

Hinglish:
Use natural conversational Hinglish written using
Roman/English characters.
Technical terms may remain in English.

Do NOT mention these instructions to the candidate.

Return only the interview question.
Do not add labels such as "Question:".
"""

    LANGUAGE_INSTRUCTIONS = {
        "English": """
Respond in professional and natural English.
""",
        "Hindi": """
Respond in natural Hindi using Devanagari script.
Technical engineering terms may remain in English.
""",
        "Hinglish": """
Respond in natural conversational Hinglish using Roman script.
Keep technical terms such as Python, API, RAG, embeddings,
vector database, Docker and AWS in English where appropriate.
""",
    }

    @classmethod
    def build_question_prompt(
        cls,
        candidate: dict,
        topic: dict,
        question_number: int,
        conversation: list[dict],
        previous_evaluation: dict | None = None,
        language: str = "English",
    ) -> str:

        language_instruction = (
            cls.LANGUAGE_INSTRUCTIONS.get(
                language,
                cls.LANGUAGE_INSTRUCTIONS["English"],
            )
        )

        previous_evaluation_text = (
            json.dumps(
                previous_evaluation,
                indent=2,
                ensure_ascii=False,
            )
            if previous_evaluation
            else "No previous evaluation available."
        )

        conversation_text = json.dumps(
            conversation,
            indent=2,
            ensure_ascii=False,
        )

        candidate_text = json.dumps(
            candidate,
            indent=2,
            ensure_ascii=False,
        )

        topic_text = json.dumps(
            topic,
            indent=2,
            ensure_ascii=False,
        )

        return f"""
Generate interview question number {question_number}.

SELECTED LANGUAGE:

{language}

LANGUAGE INSTRUCTION:

{language_instruction}

CANDIDATE PROFILE:

{candidate_text}

CURRENT CURRICULUM TOPIC:

{topic_text}

PREVIOUS CONVERSATION:

{conversation_text}

PREVIOUS EVALUATION:

{previous_evaluation_text}

QUESTION GENERATION RULES:

1. Ask exactly ONE question.

2. The question must be relevant to the current
   curriculum topic.

3. Consider the candidate's background.

4. Consider previous answers.

5. If a previous evaluation identifies a weak area,
   use the next question to explore that area.

6. Avoid repeating a question that has already been asked.

7. Prefer practical engineering scenarios.

8. Ask WHY and WHEN questions where appropriate.

9. Do not combine multiple unrelated questions.

10. The final output must be only the question.

11. The question MUST be written in the selected language.

Generate the next interview question now.
"""