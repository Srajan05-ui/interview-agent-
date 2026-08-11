import os
from dataclasses import dataclass, field, asdict
from typing import Any
from datetime import datetime
from google.cloud import firestore

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
        try:
            # Requires GOOGLE_APPLICATION_CREDENTIALS to be set in environment
            self.db = firestore.Client()
        except Exception as e:
            print(f"Failed to initialize Firestore: {e}")
            self.db = None
        self.collection_name = "interview_sessions"

    def create(self, session: InterviewSession):
        if not self.db: return
        doc_ref = self.db.collection(self.collection_name).document(session.session_id)
        doc_ref.set(asdict(session))

    def get(self, session_id: str):
        if not self.db: return None
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        doc = doc_ref.get()
        if doc.exists:
            return InterviewSession(**doc.to_dict())
        return None

    def get_by_candidate(self, candidate_id: str):
        if not self.db: return []
        query = self.db.collection(self.collection_name).where(
            filter=firestore.FieldFilter("candidate_id", "==", candidate_id)
        ).where(
            filter=firestore.FieldFilter("completed", "==", True)
        )
        docs = query.stream()
        return [InterviewSession(**doc.to_dict()) for doc in docs]

    def update(self, session: InterviewSession):
        if not self.db: return
        doc_ref = self.db.collection(self.collection_name).document(session.session_id)
        doc_ref.set(asdict(session))

    def delete(self, session_id: str):
        if not self.db: return
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        doc_ref.delete()

    def exists(self, session_id: str):
        if not self.db: return False
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        return doc_ref.get().exists


session_store = SessionStore()