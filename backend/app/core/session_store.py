import os
import json
from dataclasses import dataclass, field, asdict
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


# =========================================================
# LOCAL (IN-MEMORY + JSON FILE) SESSION STORE
# =========================================================

class LocalSessionStore:
    """Fallback store for local development without Firestore."""

    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "sessions.json",
        )
        self._load()

    def _load(self):
        try:
            if os.path.exists(self._file):
                with open(self._file, "r", encoding="utf-8") as f:
                    self._sessions = json.load(f)
        except Exception as e:
            print(f"[LocalSessionStore] Could not load sessions file: {e}")
            self._sessions = {}

    def _save(self):
        try:
            with open(self._file, "w", encoding="utf-8") as f:
                json.dump(self._sessions, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[LocalSessionStore] Could not save sessions file: {e}")

    def create(self, session: InterviewSession):
        self._sessions[session.session_id] = asdict(session)
        self._save()

    def get(self, session_id: str):
        data = self._sessions.get(session_id)
        if data:
            return InterviewSession(**data)
        return None

    def get_by_candidate(self, candidate_id: str):
        results = []
        for data in self._sessions.values():
            if data.get("candidate_id") == candidate_id and data.get("completed"):
                results.append(InterviewSession(**data))
        return results

    def update(self, session: InterviewSession):
        self._sessions[session.session_id] = asdict(session)
        self._save()

    def delete(self, session_id: str):
        self._sessions.pop(session_id, None)
        self._save()

    def exists(self, session_id: str):
        return session_id in self._sessions


# =========================================================
# FIRESTORE SESSION STORE
# =========================================================

class FirestoreSessionStore:
    """Production store using Google Cloud Firestore."""

    def __init__(self, db):
        self.db = db
        self.collection_name = "interview_sessions"

    def create(self, session: InterviewSession):
        doc_ref = self.db.collection(self.collection_name).document(session.session_id)
        doc_ref.set(asdict(session))

    def get(self, session_id: str):
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        doc = doc_ref.get()
        if doc.exists:
            return InterviewSession(**doc.to_dict())
        return None

    def get_by_candidate(self, candidate_id: str):
        from google.cloud import firestore
        query = self.db.collection(self.collection_name).where(
            filter=firestore.FieldFilter("candidate_id", "==", candidate_id)
        ).where(
            filter=firestore.FieldFilter("completed", "==", True)
        )
        docs = query.stream()
        return [InterviewSession(**doc.to_dict()) for doc in docs]

    def update(self, session: InterviewSession):
        doc_ref = self.db.collection(self.collection_name).document(session.session_id)
        doc_ref.set(asdict(session))

    def delete(self, session_id: str):
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        doc_ref.delete()

    def exists(self, session_id: str):
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        return doc_ref.get().exists


# =========================================================
# FACTORY — choose Firestore or Local based on environment
# =========================================================

def _create_session_store():
    """Try Firestore first; fall back to local file-based store."""

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    dev_mode = os.getenv("DEV_MODE", "false").lower() in ("true", "1", "yes")

    if dev_mode:
        print("[SessionStore] DEV_MODE enabled — using local file-based store.")
        return LocalSessionStore()

    # Try Firestore
    try:
        from google.cloud import firestore as firestore_module
        from google.oauth2 import service_account

        if service_account_json:
            cred_dict = json.loads(service_account_json)
            creds = service_account.Credentials.from_service_account_info(cred_dict)
            db = firestore_module.Client(credentials=creds, project=cred_dict.get("project_id"))
        else:
            db = firestore_module.Client()

        # Quick test to verify connection
        print("[SessionStore] Firestore connected successfully.")
        return FirestoreSessionStore(db)

    except Exception as e:
        print(f"[SessionStore] Firestore unavailable ({e}), falling back to local store.")
        return LocalSessionStore()


session_store = _create_session_store()