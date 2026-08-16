import json
import re

from app.services.llm import LLMService


class AnswerEvaluator:

    def __init__(self):

        self.llm = LLMService()

    def evaluate(
        self,
        question: str,
        answer: str,
        topic: dict,
        conversation: list[dict],
        language: str = "English",
    ) -> dict:

        language_instruction = self._language_instruction(
            language
        )

        system_prompt = f"""
You are a senior technical interviewer evaluating
a candidate during an AI engineering technical interview.

Evaluate ONLY what the candidate actually said.

Do not assume knowledge that was not demonstrated.

Do not reward buzzwords without explanation.

Do not punish the candidate for using simple language.

Focus on:

1. Technical accuracy
2. Depth of understanding
3. Clarity
4. Practical engineering understanding
5. Reasoning and trade-offs

LANGUAGE REQUIREMENT:

The selected interview language is:

{language}

{language_instruction}

All natural-language fields in your evaluation must
be written in the selected language.

Technical terms such as Python, RAG, API, embeddings,
vector database, Docker and AWS may remain in English.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "score": 0,
    "technical_accuracy": 0,
    "depth": 0,
    "clarity": 0,
    "strengths": [],
    "weak_areas": [],
    "feedback": "",
    "needs_follow_up": false,
    "follow_up_focus": ""
}}

SCORING:

score:
Overall answer score from 0 to 10.

technical_accuracy:
Technical correctness from 0 to 10.

depth:
Depth of understanding from 0 to 10.

clarity:
How clearly the candidate communicated from 0 to 10.

strengths:
List 1-4 specific strengths.

weak_areas:
List 1-4 specific improvement areas.

feedback:
Short explanation of performance.

needs_follow_up:
true if the answer is incomplete, weak, vague,
contains an important misconception, or needs
deeper technical probing.

follow_up_focus:
If needs_follow_up is true, describe the exact
concept that should be explored next.

If needs_follow_up is false, use an empty string.

Return ONLY JSON.
"""

        user_prompt = f"""
CURRENT INTERVIEW QUESTION:

{question}

CANDIDATE ANSWER:

{answer}

CURRENT CURRICULUM TOPIC:

{json.dumps(
    topic,
    indent=2,
    ensure_ascii=False,
)}

PREVIOUS CONVERSATION:

{json.dumps(
    conversation,
    indent=2,
    ensure_ascii=False,
)}

SELECTED LANGUAGE:

{language}

Evaluate the candidate's answer.

Pay special attention to whether the candidate
explains WHY and WHEN an engineering decision
should be made, not just WHAT the technology is.

Return ONLY the required JSON object.
"""

        raw_response = self.llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.1,
        )

        return self._parse_response(
            raw_response
        )

    # =========================================================
    # LANGUAGE
    # =========================================================

    def _language_instruction(
        self,
        language: str,
    ) -> str:

        if language == "Hindi":

            return """
Write all natural-language evaluation fields
in Hindi using Devanagari script.

Technical terms may remain in English.
"""

        if language == "Hinglish":

            return """
Write all natural-language evaluation fields
in natural conversational Hinglish using Roman script.

Technical terms may remain in English.
"""

        return """
Write all natural-language evaluation fields
in professional English.
"""

    # =========================================================
    # JSON PARSER
    # =========================================================

    def _parse_response(
        self,
        response: str,
    ) -> dict:

        response = response.strip()

        response = re.sub(
            r"^```json\s*",
            "",
            response,
            flags=re.IGNORECASE,
        )

        response = re.sub(
            r"^```\s*",
            "",
            response,
        )

        response = re.sub(
            r"\s*```$",
            "",
            response,
        )

        try:

            result = json.loads(
                response
            )

        except json.JSONDecodeError:

            match = re.search(
                r"\{.*\}",
                response,
                re.DOTALL,
            )

            if not match:

                raise ValueError(
                    "Evaluator did not return "
                    "valid JSON."
                )

            try:

                result = json.loads(
                    match.group(0)
                )

            except json.JSONDecodeError as error:

                raise ValueError(
                    "Evaluator returned invalid JSON: "
                    f"{error}"
                )

        required_fields = [
            "score",
            "technical_accuracy",
            "depth",
            "clarity",
            "strengths",
            "weak_areas",
            "feedback",
            "needs_follow_up",
            "follow_up_focus",
        ]

        missing_fields = [
            field
            for field in required_fields
            if field not in result
        ]

        if missing_fields:

            raise ValueError(
                "Evaluator response missing fields: "
                + ", ".join(missing_fields)
            )

        for field in [
            "score",
            "technical_accuracy",
            "depth",
            "clarity",
        ]:

            try:

                result[field] = float(
                    result[field]
                )

            except (
                TypeError,
                ValueError,
            ):

                result[field] = 0

            result[field] = max(
                0,
                min(
                    10,
                    result[field],
                ),
            )

        result["needs_follow_up"] = bool(
            result["needs_follow_up"]
        )

        if not isinstance(
            result["strengths"],
            list,
        ):

            result["strengths"] = []

        if not isinstance(
            result["weak_areas"],
            list,
        ):

            result["weak_areas"] = []

        return result