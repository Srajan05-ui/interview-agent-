from typing import Literal

from pydantic import BaseModel, Field


Language = Literal[
    "English",
    "Hindi",
    "Hinglish",
]


class StartInterviewRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    language: Language = "English"


class StartInterviewResponse(BaseModel):
    session_id: str
    question: str
    curriculum_day: int
    question_number: int
    language: Language


class AnswerRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


class AnswerResponse(BaseModel):
    session_id: str
    next_question: str
    curriculum_day: int
    question_number: int
    interview_completed: bool
    language: Language