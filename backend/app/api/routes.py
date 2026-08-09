from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.session_store import (
    InterviewSession,
    session_store,
)

from app.services.candidate import CandidateService
from app.services.agent import InterviewAgent


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/interview",
    tags=["Interview"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR / "data"

CANDIDATES_PATH = DATA_DIR / "candidate.json"
CURRICULUM_PATH = DATA_DIR / "curriculum.json"


# ============================================================
# SERVICES
# ============================================================

candidate_service = CandidateService(
    str(CANDIDATES_PATH)
)

interview_agent = InterviewAgent()


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================


class StartInterviewRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)


class StartInterviewResponse(BaseModel):
    session_id: str
    question: str
    curriculum_day: int
    question_number: int


class AnswerRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


class AnswerResponse(BaseModel):
    session_id: str
    question: str
    curriculum_day: int
    question_number: int
    interview_completed: bool


# ============================================================
# DATA HELPERS
# ============================================================


def load_curriculum() -> Any:
    """
    Load curriculum JSON.
    """

    if not CURRICULUM_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Curriculum file not found: {CURRICULUM_PATH}",
        )

    try:
        with open(
            CURRICULUM_PATH,
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(file)

    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid curriculum JSON: {exc}",
        )


def get_candidate(candidate_id: str) -> dict:
    """
    Retrieve candidate profile using CandidateService.
    """

    try:
        candidate = candidate_service.get(candidate_id)

    except AttributeError:
        # Compatibility fallback for CandidateService
        # implementations using a different method name.
        candidate = None

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate '{candidate_id}' not found.",
        )

    return candidate


def extract_days_from_curriculum(curriculum: Any) -> list[dict]:
    """
    Normalize different possible curriculum JSON structures.

    Supports structures such as:

    [
        {
            "day": 1,
            ...
        }
    ]

    or:

    {
        "days": [...]
    }

    or:

    {
        "curriculum": [...]
    }
    """

    if isinstance(curriculum, list):
        return curriculum

    if isinstance(curriculum, dict):

        if isinstance(curriculum.get("days"), list):
            return curriculum["days"]

        if isinstance(curriculum.get("curriculum"), list):
            return curriculum["curriculum"]

        if isinstance(curriculum.get("modules"), list):
            result = []

            for module in curriculum["modules"]:
                if isinstance(module, dict):

                    days = module.get("days", [])

                    if isinstance(days, list):
                        result.extend(days)

            return result

    return []


def get_day_number(topic: dict) -> int:
    """
    Extract curriculum day number.
    """

    value = (
        topic.get("day")
        or topic.get("day_number")
        or topic.get("curriculum_day")
    )

    if value is None:
        raise ValueError("Curriculum topic does not contain a day number.")

    return int(value)


def choose_topic(
    curriculum: Any,
    candidate: dict,
    question_number: int,
) -> dict:
    """
    Choose a curriculum topic.

    For now we use candidate learning signals when possible,
    while guaranteeing that the interview covers multiple days.

    The adaptive planner will be improved after the basic
    start -> answer flow is stable.
    """

    days = extract_days_from_curriculum(curriculum)

    if not days:
        raise HTTPException(
            status_code=500,
            detail="No curriculum days found in curriculum.json.",
        )

    # --------------------------------------------------------
    # Preferred days
    # --------------------------------------------------------

    completed_days = set(
        candidate.get("completed_days", [])
        or []
    )

    skipped_days = set(
        candidate.get("skipped_days", [])
        or []
    )

    weak_days = set(
        candidate.get("weak_days", [])
        or []
    )

    # --------------------------------------------------------
    # First prefer weak days.
    # --------------------------------------------------------

    if weak_days:

        for topic in days:

            try:
                day = get_day_number(topic)
            except (ValueError, TypeError):
                continue

            if day in weak_days and day not in skipped_days:
                return topic

    # --------------------------------------------------------
    # Then prefer completed days.
    # --------------------------------------------------------

    for topic in days:

        try:
            day = get_day_number(topic)
        except (ValueError, TypeError):
            continue

        if day in completed_days and day not in skipped_days:
            return topic

    # --------------------------------------------------------
    # Fallback
    # --------------------------------------------------------

    valid_topics = []

    for topic in days:

        try:
            day = get_day_number(topic)
        except (ValueError, TypeError):
            continue

        if day not in skipped_days:
            valid_topics.append(topic)

    if not valid_topics:
        valid_topics = days

    index = (question_number - 1) % len(valid_topics)

    return valid_topics[index]


# ============================================================
# HEALTH
# ============================================================


@router.get("/health")
def interview_health():
    """
    Interview service health check.
    """

    return {
        "status": "ok",
        "service": "AI Cohort Technical Interviewer",
        "active_sessions": session_store.count(),
    }


# ============================================================
# GET INTERVIEW PLAN
# ============================================================


@router.get("/plan/{candidate_id}")
def get_interview_plan(candidate_id: str):

    candidate = get_candidate(candidate_id)

    curriculum = load_curriculum()

    days = extract_days_from_curriculum(curriculum)

    return {
        "candidate_id": candidate_id,
        "candidate": candidate,
        "curriculum_days_available": len(days),
        "interview_requirements": {
            "total_questions": 8,
            "minimum_curriculum_days": 4,
        },
    }


# ============================================================
# START INTERVIEW
# ============================================================


@router.post(
    "/start",
    response_model=StartInterviewResponse,
)
def start_interview(
    request: StartInterviewRequest,
):

    # --------------------------------------------------------
    # Candidate
    # --------------------------------------------------------

    candidate = get_candidate(
        request.candidate_id
    )

    # --------------------------------------------------------
    # Curriculum
    # --------------------------------------------------------

    curriculum = load_curriculum()

    # --------------------------------------------------------
    # Question 1 topic
    # --------------------------------------------------------

    topic = choose_topic(
        curriculum=curriculum,
        candidate=candidate,
        question_number=1,
    )

    curriculum_day = get_day_number(topic)

    # --------------------------------------------------------
    # Generate question
    # --------------------------------------------------------

    try:

        question = interview_agent.generate_question(
            candidate=candidate,
            topic=topic,
            question_number=1,
            conversation=[],
            previous_evaluation=None,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interview question: {exc}",
        )

    # --------------------------------------------------------
    # Create session
    # --------------------------------------------------------

    session_id = str(uuid.uuid4())

    session = InterviewSession(
        session_id=session_id,
        candidate_id=request.candidate_id,
        question_number=1,
        current_question=question,
        current_curriculum_day=curriculum_day,
        conversation=[
            {
                "role": "interviewer",
                "content": question,
                "question_number": 1,
                "curriculum_day": curriculum_day,
            }
        ],
        questions=[
            {
                "question_number": 1,
                "question": question,
                "curriculum_day": curriculum_day,
            }
        ],
        curriculum_days=[
            curriculum_day
        ],
    )

    # ========================================================
    # IMPORTANT
    # Store in the SINGLE global store.
    # ========================================================

    session_store.create(session)

    # --------------------------------------------------------
    # Debug information
    # --------------------------------------------------------

    print(
        f"[SESSION CREATED] "
        f"id={session_id} "
        f"candidate={request.candidate_id} "
        f"question=1 "
        f"day={curriculum_day} "
        f"active_sessions={session_store.count()}"
    )

    return StartInterviewResponse(
        session_id=session_id,
        question=question,
        curriculum_day=curriculum_day,
        question_number=1,
    )


# ============================================================
# SUBMIT ANSWER
# ============================================================


@router.post(
    "/answer",
    response_model=AnswerResponse,
)
def submit_answer(
    request: AnswerRequest,
):

    # ========================================================
    # IMPORTANT:
    # Retrieve from THE SAME global store.
    # ========================================================

    session = session_store.get(
        request.session_id
    )

    print(
        f"[SESSION LOOKUP] "
        f"id={request.session_id} "
        f"found={session is not None} "
        f"active_sessions={session_store.count()}"
    )

    if session is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Interview session not found. "
                "Start a new interview and use the new session_id."
            ),
        )

    # --------------------------------------------------------
    # Prevent answering after completion
    # --------------------------------------------------------

    if session.completed:

        raise HTTPException(
            status_code=400,
            detail="This interview has already been completed.",
        )

    # --------------------------------------------------------
    # Save candidate answer
    # --------------------------------------------------------

    current_question_number = session.question_number

    current_day = session.current_curriculum_day

    session.answers.append(
        {
            "question_number": current_question_number,
            "answer": request.answer,
            "curriculum_day": current_day,
        }
    )

    session.conversation.append(
        {
            "role": "candidate",
            "content": request.answer,
            "question_number": current_question_number,
            "curriculum_day": current_day,
        }
    )

    # --------------------------------------------------------
    # Evaluation
    #
    # We intentionally keep this compatible with the current
    # InterviewAgent. The evaluator can be connected here
    # once its final interface is locked.
    # --------------------------------------------------------

    previous_evaluation = None

    if session.evaluations:
        previous_evaluation = session.evaluations[-1]

    # --------------------------------------------------------
    # Check whether this was question 8
    # --------------------------------------------------------

    if current_question_number >= 8:

        session.completed = True

        session_store.update(session)

        print(
            f"[INTERVIEW COMPLETE] "
            f"id={session.session_id}"
        )

        return AnswerResponse(
            session_id=session.session_id,
            question="Interview completed.",
            curriculum_day=current_day or 0,
            question_number=8,
            interview_completed=True,
        )

    # --------------------------------------------------------
    # Next question number
    # --------------------------------------------------------

    next_question_number = current_question_number + 1

    # --------------------------------------------------------
    # Candidate
    # --------------------------------------------------------

    candidate = get_candidate(
        session.candidate_id
    )

    # --------------------------------------------------------
    # Curriculum
    # --------------------------------------------------------

    curriculum = load_curriculum()

    # --------------------------------------------------------
    # Choose next topic
    # --------------------------------------------------------

    topic = choose_topic(
        curriculum=curriculum,
        candidate=candidate,
        question_number=next_question_number,
    )

    curriculum_day = get_day_number(topic)

    # --------------------------------------------------------
    # Generate adaptive question
    # --------------------------------------------------------

    try:

        question = interview_agent.generate_question(
            candidate=candidate,
            topic=topic,
            question_number=next_question_number,
            conversation=session.conversation,
            previous_evaluation=previous_evaluation,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate next question: {exc}",
        )

    # --------------------------------------------------------
    # Update session
    # --------------------------------------------------------

    session.question_number = next_question_number

    session.current_question = question

    session.current_curriculum_day = curriculum_day

    if curriculum_day not in session.curriculum_days:

        session.curriculum_days.append(
            curriculum_day
        )

    session.questions.append(
        {
            "question_number": next_question_number,
            "question": question,
            "curriculum_day": curriculum_day,
        }
    )

    session.conversation.append(
        {
            "role": "interviewer",
            "content": question,
            "question_number": next_question_number,
            "curriculum_day": curriculum_day,
        }
    )

    # ========================================================
    # IMPORTANT:
    # Persist updated session in the SAME store.
    # ========================================================

    session_store.update(session)

    print(
        f"[QUESTION GENERATED] "
        f"id={session.session_id} "
        f"question={next_question_number} "
        f"day={curriculum_day}"
    )

    return AnswerResponse(
        session_id=session.session_id,
        question=question,
        curriculum_day=curriculum_day,
        question_number=next_question_number,
        interview_completed=False,
    )


# ============================================================
# DEBUG SESSION ENDPOINT
# ============================================================


@router.get("/session/{session_id}")
def get_session_debug(
    session_id: str,
):

    session = session_store.get(session_id)

    if session is None:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found.",
        )

    return {
        "session_id": session.session_id,
        "candidate_id": session.candidate_id,
        "question_number": session.question_number,
        "current_question": session.current_question,
        "current_curriculum_day": session.current_curriculum_day,
        "curriculum_days": session.curriculum_days,
        "questions_asked": len(session.questions),
        "answers_received": len(session.answers),
        "evaluations": len(session.evaluations),
        "completed": session.completed,
        "conversation_length": len(session.conversation),
    }