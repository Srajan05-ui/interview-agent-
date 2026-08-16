import json
from pathlib import Path


class CurriculumService:

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.data = self._load()

    def _load(self):

        if not self.file_path.exists():
            raise FileNotFoundError(
                f"Curriculum file not found: {self.file_path}"
            )

        with open(
            self.file_path,
            "r",
            encoding="utf-8"
        ) as file:
            return json.load(file)

    def get_all_days(self) -> list[dict]:

        return self.data.get("days", [])

    def get_day(
        self,
        day_number: int
    ) -> dict | None:

        for day in self.get_all_days():

            if day.get("day") == day_number:
                return day

        return None

    def get_module_for_day(
        self,
        day_number: int
    ) -> dict | None:

        for module in self.data.get("modules", []):

            if day_number in module.get("days", []):
                return module

        return None

    def get_days(
        self,
        day_numbers: list[int]
    ) -> list[dict]:

        return [
            day
            for day in self.get_all_days()
            if day.get("day") in day_numbers
        ]