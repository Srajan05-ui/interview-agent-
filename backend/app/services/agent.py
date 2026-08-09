from app.services.llm import LLMService
from app.services.prompt_builder import PromptBuilder


class InterviewAgent:

    def __init__(self):
        self.llm = LLMService()

    def generate_question(
        self,
        candidate: dict,
        topic: dict,
        question_number: int,
        conversation: list[dict],
        previous_evaluation: dict | None = None,
    ) -> str:

        prompt = PromptBuilder.build_question_prompt(
            candidate=candidate,
            topic=topic,
            question_number=question_number,
            conversation=conversation,
            previous_evaluation=previous_evaluation,
        )

        question = self.llm.generate(
            system_prompt=PromptBuilder.SYSTEM_PROMPT,
            user_prompt=prompt,
            temperature=0.5,
        )

        return question.strip()