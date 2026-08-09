from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class InterviewSession:
    session_id: str
    candidate_id: str
    language: str = "English"
    mode: str = "Scored"
    persona: str = "Friendly"

    question_number: int = 1
    current_question: str = ""

    questions: list[dict[str, Any]] = field(default_factory=list)
    answers: list[dict[str, Any]] = field(default_factory=list)
    evaluations: list[dict[str, Any]] = field(default_factory=list)

    resume_text: str = ""
    skills: list[str] = field(default_factory=list)

    completed: bool = False


class SessionStore:

    def __init__(self):
        self._sessions: dict[str, InterviewSession] = {}
        self._lock = Lock()

    def create(self, session: InterviewSession):
        with self._lock:
            self._sessions[session.session_id] = session

    def get(self, session_id: str):
        with self._lock:
            return self._sessions.get(session_id)

    def update(self, session: InterviewSession):
        with self._lock:
            self._sessions[session.session_id] = session

    def delete(self, session_id: str):
        with self._lock:
            self._sessions.pop(session_id, None)

    def exists(self, session_id: str):
        with self._lock:
            return session_id in self._sessions


session_store = SessionStore()