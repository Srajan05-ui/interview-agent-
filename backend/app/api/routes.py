from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from uuid import uuid4
from datetime import datetime
import json
import re

import requests

from app.core.session_store import InterviewSession, session_store


router = APIRouter()


# ============================================================
# OLLAMA
# ============================================================

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5-coder"


def call_ollama(prompt: str) -> str | None:

    try:

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.4,
                    "num_predict": 700,
                },
            },
            timeout=90,
        )

        if response.status_code != 200:
            print("Ollama error:", response.text)
            return None

        data = response.json()

        return data.get("response", "").strip()

    except Exception as e:

        print("Ollama connection error:", e)

        return None


# ============================================================
# LANGUAGE
# ============================================================

def language_instruction(language: str):

    if language == "Hindi":
        return """
Respond completely in Hindi.
Use clear professional Hindi.
Technical terms such as Python, API, Docker, Git, database etc.
may remain in English.
"""

    if language == "Hinglish":
        return """
Respond naturally in Hinglish.
Use Hindi and English together like a real Indian technical interviewer.
Keep technical terms in English.
"""

    return """
Respond in professional English.
"""


# ============================================================
# PERSONA
# ============================================================

def persona_instruction(persona: str):

    if persona == "Strict":
        return """
You are a strict senior technical interviewer.
Challenge weak assumptions.
Ask precise follow-up questions.
Do not unnecessarily praise the candidate.
"""

    return """
You are a friendly but professional technical interviewer.
Be encouraging but technically accurate.
Ask practical engineering questions.
"""


# ============================================================
# FALLBACK QUESTIONS
# ============================================================

DEFAULT_QUESTIONS = [
    "Explain how you would create and manage a Python virtual environment for a project.",

    "What is the difference between a list, tuple and set in Python?",

    "Explain how REST APIs work and describe the purpose of HTTP methods.",

    "How would you design a database for an application that stores users and interview results?",

    "What is the purpose of Docker and how does containerization help deployment?",

    "Explain the difference between authentication and authorization.",

    "How would you troubleshoot an API that suddenly starts returning HTTP 500 errors?",

    "What is Git and how would you handle a merge conflict in a team project?",

    "Explain one cloud deployment architecture you have worked with or studied.",

    "Describe a technical project you built and explain one difficult engineering decision you made."
]


# ============================================================
# FALLBACK EVALUATION
# ============================================================

def fallback_evaluation(answer: str, question: str):

    length = len(answer.strip())

    if length < 30:
        score = 3
        feedback = "The answer is too short. Explain the concept with more technical detail and an example."
        strengths = ["Attempted the question"]
        weaknesses = ["Insufficient technical explanation"]
    elif length < 100:
        score = 6
        feedback = "The answer shows basic understanding, but it should include more reasoning and practical examples."
        strengths = ["Basic understanding"]
        weaknesses = ["Needs more depth"]
    else:
        score = 8
        feedback = "Good explanation with reasonable technical detail. Adding a concrete real-world example would make it stronger."
        strengths = ["Clear explanation", "Good technical understanding"]
        weaknesses = ["Could provide stronger examples"]

    return {
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "weak_areas": weaknesses,
        "ideal_answer": (
            f"A strong answer should clearly explain the main concept in the question "
            f"'{question}', describe why it is used, mention important trade-offs, "
            f"and provide a practical example."
        ),
    }


# ============================================================
# MODELS
# ============================================================

class StartInterviewRequest(BaseModel):
    candidate_id: str
    language: str = "English"
    mode: str = "Scored"
    persona: str = "Friendly"
    skills: list[str] = []
    resume_text: str = ""


class AnswerRequest(BaseModel):
    session_id: str
    answer: str
    self_diagnosis: Optional[str] = ""


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
def health():

    ollama_running = False

    try:

        r = requests.get(
            "http://localhost:11434/api/tags",
            timeout=3
        )

        ollama_running = r.status_code == 200

    except Exception:
        pass

    return {
        "status": "ok",
        "service": "AI Cohort Technical Interviewer",
        "ollama": ollama_running,
        "model": OLLAMA_MODEL,
    }


# ============================================================
# START INTERVIEW
# ============================================================

@router.post("/interview/start")
def start_interview(request: StartInterviewRequest):

    session_id = str(uuid4())

    skills = request.skills or []

    skill_text = ", ".join(skills)

    prompt = f"""
You are an AI technical interviewer.

{language_instruction(request.language)}

{persona_instruction(request.persona)}

Candidate skills:
{skill_text if skill_text else "General software engineering"}

Generate the first technical interview question.

The interview must contain exactly 10 questions overall.

Return ONLY the question.
"""

    question = call_ollama(prompt)

    if not question:
        question = DEFAULT_QUESTIONS[0]

    session = InterviewSession(
        session_id=session_id,
        candidate_id=request.candidate_id,
        language=request.language,
        mode=request.mode,
        persona=request.persona,
        current_question=question,
        resume_text=request.resume_text,
        skills=skills,
    )

    session.questions.append({
        "number": 1,
        "question": question,
    })

    session_store.create(session)

    return {
        "session_id": session_id,
        "candidate_id": request.candidate_id,
        "language": request.language,
        "mode": request.mode,
        "persona": request.persona,
        "question_number": 1,
        "total_questions": 10,
        "question": question,
    }


# ============================================================
# SUBMIT ANSWER
# ============================================================

@router.post("/interview/answer")
def submit_answer(request: AnswerRequest):

    session = session_store.get(request.session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found."
        )

    question = session.current_question

    evaluation_prompt = f"""
You are evaluating a technical interview answer.

{language_instruction(session.language)}

Question:
{question}

Candidate answer:
{request.answer}

Evaluate the answer.

Return ONLY valid JSON:

{{
  "score": 0,
  "feedback": "...",
  "strengths": ["..."],
  "weak_areas": ["..."],
  "ideal_answer": "..."
}}

Score from 0 to 10.

The ideal_answer must answer the EXACT question asked.
"""

    raw = call_ollama(evaluation_prompt)

    evaluation = None

    if raw:

        try:

            cleaned = raw

            if "```" in cleaned:
                cleaned = re.sub(
                    r"```(?:json)?",
                    "",
                    cleaned
                ).replace("```", "").strip()

            evaluation = json.loads(cleaned)

        except Exception as e:

            print("Evaluation JSON error:", e)

    if not evaluation:
        evaluation = fallback_evaluation(
            request.answer,
            question
        )

    session.answers.append({
        "question": question,
        "answer": request.answer,
        "self_diagnosis": request.self_diagnosis or "",
    })

    session.evaluations.append(evaluation)

    current_number = session.question_number

    # ========================================================
    # FINISH
    # ========================================================

    if current_number >= 10:

        session.completed = True

        scores = [
            e.get("score", 0)
            for e in session.evaluations
        ]

        overall = round(
            sum(scores) / len(scores),
            1
        ) if scores else 0

        strengths = []

        weak_areas = []

        for e in session.evaluations:

            strengths.extend(
                e.get("strengths", [])
            )

            weak_areas.extend(
                e.get("weak_areas", [])
            )

        # remove duplicates

        strengths = list(dict.fromkeys(strengths))[:5]

        weak_areas = list(
            dict.fromkeys(weak_areas)
        )[:5]

        scorecard = {
            "overall_score": overall,
            "total_questions": 10,
            "strengths": strengths,
            "weak_areas": weak_areas,
            "date": datetime.now().strftime(
                "%d %B %Y"
            ),
            "mode": session.mode,
            "language": session.language,
        }

        session_store.update(session)

        return {
            "completed": True,
            "evaluation": evaluation,
            "scorecard": scorecard,
        }

    # ========================================================
    # NEXT QUESTION
    # ========================================================

    next_number = current_number + 1

    next_question = None

    # Resume/skill-aware question generation

    if session.skills:

        skill_context = ", ".join(
            session.skills
        )

        next_prompt = f"""
You are a technical interviewer.

{language_instruction(session.language)}

{persona_instruction(session.persona)}

Candidate skills:
{skill_context}

Previous question:
{question}

Candidate answer:
{request.answer}

Generate technical interview question number
{next_number} of 10.

Focus on the candidate's skills.

Return ONLY the question.
"""

        next_question = call_ollama(
            next_prompt
        )

    if not next_question:

        if next_number <= len(DEFAULT_QUESTIONS):
            next_question = DEFAULT_QUESTIONS[
                next_number - 1
            ]
        else:
            next_question = DEFAULT_QUESTIONS[-1]

    session.question_number = next_number

    session.current_question = next_question

    session.questions.append({
        "number": next_number,
        "question": next_question,
    })

    session_store.update(session)

    return {
        "completed": False,
        "evaluation": evaluation,
        "question_number": next_number,
        "total_questions": 10,
        "question": next_question,
    }


# ============================================================
# RESUME UPLOAD
# ============================================================

@router.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...)
):

    filename = file.filename or ""

    content = await file.read()

    text = ""

    try:

        if filename.lower().endswith(".pdf"):

            from pypdf import PdfReader
            import io

            reader = PdfReader(
                io.BytesIO(content)
            )

            text = "\n".join(
                page.extract_text() or ""
                for page in reader.pages
            )

        elif filename.lower().endswith(".docx"):

            from docx import Document
            import io

            document = Document(
                io.BytesIO(content)
            )

            text = "\n".join(
                paragraph.text
                for paragraph in document.paragraphs
            )

        else:

            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported."
            )

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Could not read resume: {str(e)}"
        )

    # ========================================================
    # SKILL EXTRACTION
    # ========================================================

    known_skills = [
        "Python",
        "Java",
        "JavaScript",
        "React",
        "Node.js",
        "FastAPI",
        "Django",
        "SQL",
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "Kubernetes",
        "AWS",
        "Azure",
        "GCP",
        "Git",
        "GitHub",
        "Machine Learning",
        "Artificial Intelligence",
        "AI",
        "Deep Learning",
        "NLP",
        "RAG",
        "LangChain",
        "Vector Database",
        "Redis",
        "C++",
        "C",
        "TypeScript",
    ]

    lower_text = text.lower()

    skills = [
        skill
        for skill in known_skills
        if skill.lower() in lower_text
    ]

    # If LLM available, improve skill extraction

    prompt = f"""
Extract technical skills from this resume.

Resume:
{text[:12000]}

Return ONLY a JSON array of strings.
Example:
["Python", "React", "Docker"]
"""

    raw = call_ollama(prompt)

    if raw:

        try:

            cleaned = raw

            if "```" in cleaned:
                cleaned = re.sub(
                    r"```(?:json)?",
                    "",
                    cleaned
                ).replace("```", "").strip()

            ai_skills = json.loads(cleaned)

            if isinstance(ai_skills, list):

                for skill in ai_skills:

                    if skill not in skills:
                        skills.append(skill)

        except Exception:
            pass

    return {
        "filename": filename,
        "text": text,
        "skills": skills,
        "message": "Resume analyzed successfully."
    }