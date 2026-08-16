import json
from pathlib import Path


class CandidateService:
    def __init__(self, path: str = "data/candidate.json"):
        self.path = Path(path)
        self.data = self._load()

    def _load(self):
        if not self.path.exists():
            raise FileNotFoundError(
                f"Candidate file not found: {self.path.resolve()}"
            )

        with self.path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        # Expected structure:
        # {
        #     "candidates": [...]
        # }

        if isinstance(data, dict) and "candidates" in data:
            return data["candidates"]

        if isinstance(data, list):
            return data

        raise ValueError(
            "Invalid candidate.json format. Expected a "
            "'candidates' array or a list."
        )

    def all(self):
        return self.data

    def count(self):
        return len(self.data)

    def ids(self):
        return [
            candidate.get("member", {}).get("id")
            for candidate in self.data
            if candidate.get("member", {}).get("id")
        ]

    def get(self, candidate_id: str):
        candidate_id = str(candidate_id).strip()

        for candidate in self.data:
            member = candidate.get("member", {})

            if str(member.get("id", "")).strip() == candidate_id:
                return candidate

        return None

    def exists(self, candidate_id: str) -> bool:
        return self.get(candidate_id) is not None