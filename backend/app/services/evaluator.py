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
    ) -> dict:

        system_prompt = """
You are a senior technical interviewer evaluating a candidate
during an AI engineering technical interview.

Your job is to objectively evaluate the candidate's answer.

Evaluate the answer based on:

1. Technical accuracy
2. Depth of understanding
3. Clarity of explanation
4. Practical engineering understanding
5. Ability to reason about real-world trade-offs

The candidate is being interviewed about an enterprise AI
engineering curriculum.

IMPORTANT RULES:

- Evaluate ONLY what the candidate actually said.
- Do not assume knowledge that was not demonstrated.
- Do not reward buzzwords without explanation.
- Do not punish the candidate for using simple language.
- Focus on technical correctness and reasoning.
- Identify specific knowledge gaps.
- Decide whether the interviewer should ask a follow-up.
- If a follow-up is needed, identify exactly what concept
  should be explored.

Return ONLY valid JSON.

Use exactly this structure:

{
    "score": 0,
    "technical_accuracy": 0,
    "depth": 0,
    "clarity": 0,
    "strengths": [],
    "weak_areas": [],
    "feedback": "",
    "needs_follow_up": false,
    "follow_up_focus": ""
}

SCORING:

score:
Overall answer score from 0 to 10.

technical_accuracy:
Technical correctness from 0 to 10.

depth:
Depth of understanding and reasoning from 0 to 10.

clarity:
How clearly and logically the candidate communicated
the answer from 0 to 10.

strengths:
List 1-4 specific strengths demonstrated in the answer.

weak_areas:
List 1-4 specific areas where understanding could be improved.

feedback:
A short explanation of the candidate's performance.

needs_follow_up:
true if the answer is incomplete, weak, vague, contains
an important misconception, or deserves deeper technical probing.

follow_up_focus:
If needs_follow_up is true, describe the exact concept
that should be explored next.

If needs_follow_up is false, use an empty string.

Return ONLY JSON.
"""

        user_prompt = f"""
CURRENT INTERVIEW QUESTION:

{question}


CANDIDATE ANSWER:

{answer}


CURRENT CURRICULUM TOPIC:

{json.dumps(topic, indent=2)}


PREVIOUS CONVERSATION:

{json.dumps(conversation, indent=2)}


Evaluate the candidate's answer.

Pay special attention to whether the candidate explains
WHY and WHEN an engineering decision should be made,
not just WHAT the technology is.

Return ONLY the required JSON object.
"""

        raw_response = self.llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.1,
        )

        return self._parse_response(raw_response)

    def _parse_response(
        self,
        response: str,
    ) -> dict:

        response = response.strip()

        # -------------------------------------------------
        # Remove Markdown code fences
        # -------------------------------------------------

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

        # -------------------------------------------------
        # First attempt: direct JSON parsing
        # -------------------------------------------------

        try:

            result = json.loads(response)

        except json.JSONDecodeError:

            # -------------------------------------------------
            # Second attempt: extract JSON object
            # -------------------------------------------------

            match = re.search(
                r"\{.*\}",
                response,
                re.DOTALL,
            )

            if not match:

                raise ValueError(
                    "Evaluator did not return valid JSON."
                )

            try:

                result = json.loads(
                    match.group(0)
                )

            except json.JSONDecodeError as error:

                raise ValueError(
                    f"Evaluator returned invalid JSON: {error}"
                )

        # -------------------------------------------------
        # Validate required fields
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Normalize scores
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Normalize boolean
        # -------------------------------------------------

        result["needs_follow_up"] = bool(
            result["needs_follow_up"]
        )

        # -------------------------------------------------
        # Normalize arrays
        # -------------------------------------------------

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