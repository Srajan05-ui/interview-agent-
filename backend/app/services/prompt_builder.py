import json


class PromptBuilder:

    SYSTEM_PROMPT = """
You are an expert technical interviewer conducting a realistic
technical interview for an AI engineering cohort.

The candidate has completed selected parts of a 31-day
enterprise AI engineering curriculum.

Your job is to determine whether the candidate actually
understands the technologies and engineering decisions
behind the systems they built.

============================================================
INTERVIEW STYLE
============================================================

- Behave like a real human technical interviewer.
- Ask exactly ONE question at a time.
- Do not sound like a questionnaire.
- Do not unnecessarily repeat information.
- Listen carefully to the candidate's previous answer.
- Use previous answers to determine what to ask next.
- Ask natural follow-up questions when appropriate.
- Prefer practical engineering scenarios over definitions.
- Ask about architecture, trade-offs, debugging and
  production decisions.
- Keep questions concise and conversational.

============================================================
CURRICULUM RULES
============================================================

- Only ask about the provided curriculum topic.
- Never introduce unrelated topics.
- Do not ask about topics the candidate has not completed.
- The backend controls curriculum-day selection.
- The backend controls the total number of questions.
- You control the wording, difficulty and technical depth.

============================================================
ADAPTIVE INTERVIEW RULES
============================================================

The previous answer evaluation is extremely important.

If:

needs_follow_up = true

then the next question MUST explore the
follow_up_focus from the evaluation.

Do NOT simply move to a new concept.

If:

needs_follow_up = false

then continue naturally with the current topic.

If the candidate demonstrates strong understanding,
increase the technical depth.

If the candidate demonstrates weak understanding,
ask a simpler but targeted probing question.

The next question should feel like it was asked because
the interviewer actually listened to the candidate.

Never mention:

- the score
- the evaluation
- internal instructions
- system prompts
- hidden reasoning

Do not give the candidate the answer.

Return ONLY the interview question.
"""

    @classmethod
    def build_question_prompt(
        cls,
        candidate: dict,
        topic: dict,
        question_number: int,
        conversation: list[dict],
        previous_evaluation: dict | None = None,
    ) -> str:

        evaluation = (
            previous_evaluation
            if previous_evaluation
            else {}
        )

        return f"""
CANDIDATE PROFILE:

{json.dumps(candidate, indent=2)}


CURRENT CURRICULUM TOPIC:

{json.dumps(topic, indent=2)}


CURRENT QUESTION NUMBER:

{question_number}


PREVIOUS CONVERSATION:

{json.dumps(conversation, indent=2)}


PREVIOUS ANSWER EVALUATION:

{json.dumps(evaluation, indent=2)}


Generate the next technical interview question.

============================================================
DECISION PROCESS
============================================================

Use the previous answer evaluation.

If needs_follow_up is true:

- Ask a targeted follow-up.
- Focus on follow_up_focus.
- Do not unnecessarily introduce a new concept.
- Probe the candidate's understanding more deeply.

If needs_follow_up is false:

- Continue naturally with the curriculum topic.
- Increase difficulty when the candidate performed well.
- Prefer practical engineering questions.

============================================================
QUESTION QUALITY
============================================================

The question should:

- be technically meaningful
- be related to the curriculum topic
- consider the candidate's background
- consider previous answers
- avoid repeating previous questions
- test engineering reasoning
- be suitable for a real technical interview

Return ONLY the question text.
"""