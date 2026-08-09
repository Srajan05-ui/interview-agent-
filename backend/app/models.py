from pydantic import BaseModel


class StartInterviewRequest(BaseModel):

    candidate_id: str


class StartInterviewResponse(BaseModel):

    session_id: str

    question: str

    curriculum_day: int

    question_number: int


class AnswerRequest(BaseModel):

    session_id: str

    answer: str


class AnswerResponse(BaseModel):

    session_id: str

    next_question: str

    curriculum_day: int

    question_number: int

    interview_completed: bool