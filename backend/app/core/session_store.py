from typing import Any
from threading import Lock


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, dict[str, Any]] = {}
        self._lock = Lock()

    def create(self, session_id: str, data: dict[str, Any]) -> None:
        with self._lock:
            self._sessions[session_id] = data

    def get(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._sessions.get(session_id)

    def update(self, session_id: str, data: dict[str, Any]) -> None:
        with self._lock:
            if session_id not in self._sessions:
                raise KeyError(session_id)

            self._sessions[session_id] = data

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def exists(self, session_id: str) -> bool:
        with self._lock:
            return session_id in self._sessions

    def all(self) -> dict[str, dict[str, Any]]:
        with self._lock:
            return dict(self._sessions)


# IMPORTANT:
# Create ONE global instance.
# All routes must import THIS instance.
session_store = SessionStore()