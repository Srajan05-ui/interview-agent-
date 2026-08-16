from dataclasses import dataclass, field
from typing import Optional


MAX_QUESTIONS = 8
MIN_CURRICULUM_DAYS = 4


@dataclass
class QuestionRecord:

    question_number: int

    question: str

    curriculum_day: int

    answer: Optional[str] = None

    evaluation: Optional[dict] = None

    is_follow_up: bool = False


@dataclass
class InterviewState:

    session_id: str

    candidate_id: str

    questions: list[QuestionRecord] = field(
        default_factory=list
    )

    covered_days: set[int] = field(
        default_factory=set
    )

    conversation: list[dict] = field(
        default_factory=list
    )

    current_question: Optional[
        QuestionRecord
    ] = None

    completed: bool = False

    def question_count(self) -> int:

        return len(self.questions)

    def can_ask_question(self) -> bool:

        return self.question_count() < MAX_QUESTIONS

    def add_question(
        self,
        question: str,
        curriculum_day: int,
        is_follow_up: bool = False
    ) -> QuestionRecord:

        if not self.can_ask_question():

            raise ValueError(
                "Interview already contains "
                "8 questions."
            )

        record = QuestionRecord(
            question_number=(
                self.question_count() + 1
            ),
            question=question,
            curriculum_day=curriculum_day,
            is_follow_up=is_follow_up
        )

        self.questions.append(record)

        self.covered_days.add(
            curriculum_day
        )

        self.current_question = record

        self.conversation.append({
            "role": "assistant",
            "content": question,
            "question_number": (
                record.question_number
            ),
            "curriculum_day": curriculum_day
        })

        return record

    def add_answer(
        self,
        answer: str
    ) -> None:

        if self.current_question is None:

            raise ValueError(
                "There is no active question."
            )

        self.current_question.answer = answer

        self.conversation.append({
            "role": "user",
            "content": answer,
            "question_number": (
                self.current_question.question_number
            )
        })

    def add_evaluation(
        self,
        evaluation: dict
    ) -> None:

        if self.current_question is None:

            raise ValueError(
                "There is no active question."
            )

        self.current_question.evaluation = evaluation

    def can_finish(self) -> bool:

        return (
            self.question_count() == MAX_QUESTIONS
            and
            len(self.covered_days)
            >= MIN_CURRICULUM_DAYS
        )

    def finish(self) -> None:

        if self.question_count() != MAX_QUESTIONS:

            raise ValueError(
                "Interview must contain "
                "exactly 8 questions."
            )

        if (
            len(self.covered_days)
            < MIN_CURRICULUM_DAYS
        ):

            raise ValueError(
                "Interview must cover at least "
                "4 curriculum days."
            )

        self.completed = True