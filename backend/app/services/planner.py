from app.services.candidate import CandidateService
from app.services.curriculum import CurriculumService


class InterviewPlanner:

    REQUIRED_DAYS = 4
    TOTAL_QUESTIONS = 8

    def __init__(
        self,
        candidate_service: CandidateService,
        curriculum_service: CurriculumService
    ):
        self.candidates = candidate_service
        self.curriculum = curriculum_service

    def create_plan(
        self,
        candidate_id: str
    ) -> dict:

        profile = self.candidates.get_profile_summary(
            candidate_id
        )

        if not profile:
            raise ValueError(
                f"Candidate '{candidate_id}' not found."
            )

        completed_days = profile["completed_days"]
        weak_days = profile["weak_days"]

        # ------------------------------------------------
        # Step 1:
        # Only use topics the candidate actually completed.
        # ------------------------------------------------

        eligible_days = set(completed_days)

        # ------------------------------------------------
        # Step 2:
        # Prioritize weak areas.
        # ------------------------------------------------

        selected_days = []

        for day in weak_days:

            if (
                day in eligible_days
                and day not in selected_days
            ):
                selected_days.append(day)

            if len(selected_days) >= self.REQUIRED_DAYS:
                break

        # ------------------------------------------------
        # Step 3:
        # Fill remaining slots with completed topics.
        # ------------------------------------------------

        for day in completed_days:

            if day not in selected_days:
                selected_days.append(day)

            if len(selected_days) >= self.REQUIRED_DAYS:
                break

        # ------------------------------------------------
        # Step 4:
        # Verify the hard hackathon requirement.
        # ------------------------------------------------

        if len(selected_days) < self.REQUIRED_DAYS:

            raise ValueError(
                "Candidate does not have enough completed "
                "curriculum days to satisfy the "
                "4-day interview requirement."
            )

        selected_days = selected_days[
            :self.REQUIRED_DAYS
        ]

        # ------------------------------------------------
        # Step 5:
        # Allocate exactly 8 questions.
        #
        # 4 days × 2 questions = 8 questions
        # ------------------------------------------------

        questions_per_day = self._allocate_questions(
            selected_days
        )

        topics = []

        for day_number in selected_days:

            day = self.curriculum.get_day(
                day_number
            )

            if not day:
                continue

            module = self.curriculum.get_module_for_day(
                day_number
            )

            topics.append({
                "day": day["day"],
                "title": day["title"],
                "type": day["type"],
                "tools": day["tools"],
                "objectives": day["objectives"],
                "module": module,
                "question_count": questions_per_day[
                    day_number
                ]
            })

        return {
            "candidate_id": candidate_id,
            "candidate": profile,
            "curriculum_days": selected_days,
            "total_questions": self.TOTAL_QUESTIONS,
            "topics": topics
        }

    def _allocate_questions(
        self,
        selected_days: list[int]
    ) -> dict[int, int]:

        return {
            day: 2
            for day in selected_days
        }