import json
import os
from dataclasses import dataclass, field, asdict
from threading import Lock
from typing import Any
from datetime import datetime


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
    created_at: str = field(default_factory=lambda: datetime.now().strftime("%d %B %Y %H:%M"))


class SessionStore:

    def __init__(self):
        self._sessions: dict[str, InterviewSession] = {}
        self._lock = Lock()
        self._filepath = "sessions.json"
        self._load()

    def _load(self):
        if os.path.exists(self._filepath):
            try:
                with open(self._filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self._sessions[k] = InterviewSession(**v)
            except Exception as e:
                print(f"Failed to load sessions: {e}")

    def _save(self):
        try:
            with open(self._filepath, "w", encoding="utf-8") as f:
                data = {k: asdict(v) for k, v in self._sessions.items()}
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Failed to save sessions: {e}")

    def create(self, session: InterviewSession):
        with self._lock:
            self._sessions[session.session_id] = session
            self._save()

    def get(self, session_id: str):
        with self._lock:
            return self._sessions.get(session_id)

    def get_by_candidate(self, candidate_id: str):
        with self._lock:
            return [
                session for session in self._sessions.values()
                if session.candidate_id == candidate_id and session.completed
            ]

    def update(self, session: InterviewSession):
        with self._lock:
            self._sessions[session.session_id] = session
            self._save()

    def delete(self, session_id: str):
        with self._lock:
            self._sessions.pop(session_id, None)
            self._save()

    def exists(self, session_id: str):
        with self._lock:
            return session_id in self._sessions


session_store = SessionStore()