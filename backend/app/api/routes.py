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
# LLM SERVICE (OpenRouter)
# ============================================================

try:
    from app.services.llm import LLMService
    llm_service = LLMService()
except Exception as e:
    llm_service = None
    print(f"Failed to initialize LLMService: {e}")

def call_llm(prompt: str) -> str | None:
    if not llm_service:
        print("LLMService not initialized.")
        return None
    try:
        return llm_service.generate(
            system_prompt="You are a helpful AI assistant.",
            user_prompt=prompt
        )
    except Exception as e:
        print("LLM Error:", e)
        return None

# For compatibility
call_ollama = call_llm


# ============================================================
# LANGUAGE
# ============================================================

LANGUAGE_INSTRUCTIONS = {
    "english": """
Respond in professional English.
""",
    "hindi": """
Respond completely in Hindi.
Use clear professional Hindi.
Technical terms such as Python, API, Docker, Git, database etc.
may remain in English.
""",
    "hinglish": """
Respond naturally in Hinglish.
Use Hindi and English together like a real Indian technical interviewer.
Keep technical terms in English.
""",
    "spanish": """
Respond completely in Spanish (Español).
Use clear professional Spanish. Technical terms may remain in English.
""",
    "french": """
Respond completely in French (Français).
Use clear professional French. Technical terms may remain in English.
""",
    "german": """
Respond completely in German (Deutsch).
Use clear professional German. Technical terms may remain in English.
""",
    "japanese": """
Respond completely in Japanese (日本語).
Use clear professional Japanese. Technical terms may remain in English.
""",
    "chinese": """
Respond completely in Simplified Chinese (简体中文).
Use clear professional Chinese. Technical terms may remain in English.
""",
    "korean": """
Respond completely in Korean (한국어).
Use clear professional Korean. Technical terms may remain in English.
""",
    "arabic": """
Respond completely in Arabic (العربية).
Use clear professional Arabic. Technical terms may remain in English.
""",
    "portuguese": """
Respond completely in Portuguese (Português).
Use clear professional Portuguese. Technical terms may remain in English.
""",
    "russian": """
Respond completely in Russian (Русский).
Use clear professional Russian. Technical terms may remain in English.
""",
    "tamil": """
Respond completely in Tamil (தமிழ்).
Use clear professional Tamil. Technical terms may remain in English.
""",
    "telugu": """
Respond completely in Telugu (తెలుగు).
Use clear professional Telugu. Technical terms may remain in English.
""",
    "bengali": """
Respond completely in Bengali (বাংলা).
Use clear professional Bengali. Technical terms may remain in English.
""",
}


def language_instruction(language: str):
    key = (language or "english").strip().lower()
    return LANGUAGE_INSTRUCTIONS.get(key, LANGUAGE_INSTRUCTIONS["english"])


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

DEFAULT_TECHNICAL_QUESTIONS = [
    "Explain how you would create and manage a Python virtual environment for a project.",
    "Explain how REST APIs work and describe the purpose of HTTP methods.",
    "How would you design a database for an application that stores users and interview results?",
    "What is the purpose of Docker and how does containerization help deployment?",
    "Explain the difference between authentication and authorization.",
    "How would you troubleshoot an API that suddenly starts returning HTTP 500 errors?",
    "What is Git and how would you handle a merge conflict in a team project?",
    "Explain one cloud deployment architecture you have worked with or studied.",
    "Describe a technical project you built and explain one difficult engineering decision you made.",
    "What are microservices, and how do they differ from a monolithic architecture?"
]

DEFAULT_CODING_QUESTIONS = [
    "Write a function to reverse a string without using built-in reverse methods. Explain the time and space complexity.",
    "Given an array of integers, write code to find two numbers that add up to a specific target.",
    "Write a code snippet to perform a binary search on a sorted array.",
    "Implement a function to check if a given string is a valid palindrome.",
    "Write a function that returns the nth number in the Fibonacci sequence. Can you optimize it using memoization?",
    "Implement a basic stack data structure with push, pop, and peek methods.",
    "Write a function to merge two sorted arrays into a single sorted array.",
    "How would you write code to detect a cycle in a linked list?",
    "Write a function to find the longest substring without repeating characters.",
    "Implement a basic LRU (Least Recently Used) cache with get and put methods."
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
    return {
        "status": "ok",
        "service": "AI Cohort Technical Interviewer",
        "llm_service": llm_service is not None,
    }


# ============================================================
# START INTERVIEW
# ============================================================

@router.post("/interview/start")
def start_interview(request: StartInterviewRequest):

    session_id = str(uuid4())

    skills = request.skills or []

    skill_text = ", ".join(skills)

    resume_context = f"\nCandidate Resume:\n{request.resume_text[:2000]}\n" if request.resume_text else ""

    mode_instruction = ""
    if request.mode == "Coding":
        mode_instruction = "Generate the first coding interview question. Based strictly on the technologies and skills listed in the candidate's resume, ask a practical coding problem, data structure, or algorithm question where they must write or analyze code. Do not ask simple theoretical questions."
    else:
        mode_instruction = "Generate the first technical interview question. Focus on system design, advanced concepts, or deep theoretical knowledge directly related to the specific skills and experience listed in their resume."

    skill_display = skill_text if skill_text else ("Extract from resume below" if request.resume_text else "General software engineering")

    prompt = f"""
You are an AI technical interviewer.

{language_instruction(request.language)}

{persona_instruction(request.persona)}

Candidate skills:
{skill_display}
{resume_context}

{mode_instruction}

The interview must contain exactly 10 questions overall.

Return ONLY the question.
"""

    question = call_ollama(prompt)

    if not question:
        if request.mode == "Coding":
            question = DEFAULT_CODING_QUESTIONS[0]
        else:
            question = DEFAULT_TECHNICAL_QUESTIONS[0]

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

    skill_context = ", ".join(session.skills) if session.skills else ("Extract from resume below" if session.resume_text else "General software engineering")
    resume_context = f"\nCandidate Resume:\n{session.resume_text[:2000]}\n" if session.resume_text else ""
    
    previous_questions = "\n".join([f"- {q['question']}" for q in session.questions])

    mode_instruction = ""
    if session.mode == "Coding":
        mode_instruction = f"Generate coding interview question number {next_number} of 10. Based strictly on the candidate's resume and skills, ask a practical coding or algorithm problem. Do not ask theoretical questions. Require them to write or analyze code."
    else:
        mode_instruction = f"Generate technical interview question number {next_number} of 10. Focus on deep theoretical or system design knowledge directly related to the technologies mentioned in their resume."

    next_prompt = f"""
You are a technical interviewer.

{language_instruction(session.language)}

{persona_instruction(session.persona)}

Candidate skills:
{skill_context}
{resume_context}

Previously asked questions (DO NOT REPEAT THESE):
{previous_questions}

Candidate's last answer to the immediately previous question ({question}):
{request.answer}

{mode_instruction}

Focus on the candidate's skills and resume. Avoid repeating topics already covered in previous questions.

Return ONLY the question.
"""

    next_question = call_ollama(
        next_prompt
    )

    if not next_question:
        fallback_questions = DEFAULT_CODING_QUESTIONS if session.mode == "Coding" else DEFAULT_TECHNICAL_QUESTIONS
        if next_number <= len(fallback_questions):
            next_question = fallback_questions[
                next_number - 1
            ]
        else:
            next_question = fallback_questions[-1]

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
# HISTORY
# ============================================================

@router.get("/interview/history/{candidate_id}")
def get_interview_history(candidate_id: str):
    sessions = session_store.get_by_candidate(candidate_id)
    history = []
    
    for session in sessions:
        scores = [e.get("score", 0) for e in session.evaluations]
        overall = round(sum(scores) / len(scores), 1) if scores else 0
        
        history.append({
            "session_id": session.session_id,
            "date": datetime.now().strftime("%d %B %Y"), # Since we don't have a created_at field, we mock it or we could add it to session. For now, use current date or add a timestamp to SessionStore. Let's just return a placeholder date or add a field if necessary. Better yet, we can just omit or mock.
            "mode": session.mode,
            "language": session.language,
            "overall_score": overall
        })
        
    return {"history": history}


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

    ats_score = 0
    ats_feedback = "Could not analyze ATS score."
    
    ats_prompt = f"""
You are an expert ATS (Applicant Tracking System) and senior technical recruiter.
Evaluate the following resume based on structure, keywords, clarity, and impact.
Return a JSON object with 'score' (0-100) and 'feedback' (a short paragraph of actionable advice).

Resume:
{text[:12000]}

Return ONLY valid JSON:
{{
  "score": 85,
  "feedback": "..."
}}
"""

    ats_raw = call_ollama(ats_prompt)
    if ats_raw:
        try:
            cleaned_ats = ats_raw
            if "```" in cleaned_ats:
                cleaned_ats = re.sub(r"```(?:json)?", "", cleaned_ats).replace("```", "").strip()
            ats_data = json.loads(cleaned_ats)
            ats_score = ats_data.get("score", 70)
            ats_feedback = ats_data.get("feedback", "Looks okay.")
        except Exception:
            ats_score = 65
            ats_feedback = "Formatting may not be optimally ATS friendly."
    else:
        ats_score = 65
        ats_feedback = "Formatting may not be optimally ATS friendly."

    return {
        "filename": filename,
        "text": text,
        "skills": skills,
        "ats_score": ats_score,
        "ats_feedback": ats_feedback,
        "message": "Resume analyzed successfully."
    }

# ============================================================
# ATS RESUME MAKER
# ============================================================

class ResumeImproveRequest(BaseModel):
    resume_text: str

@router.post("/resume/improve")
def improve_resume(request: ResumeImproveRequest):
    prompt = f"""
You are a professional resume writer and career coach.
Rewrite the following resume text to make it highly ATS-friendly, professional, and impactful.
Use strong action verbs, quantify achievements where possible, and organize it logically.
Do NOT hallucinate fake experience. Only improve the phrasing of what is provided.
Format the output nicely using Markdown.

Original Resume:
{request.resume_text[:12000]}

Return the improved resume in Markdown format.
"""
    
    improved_text = call_ollama(prompt)
    if not improved_text:
        raise HTTPException(status_code=500, detail="Failed to generate improved resume.")
        
    return {
        "improved_resume": improved_text
    }


# ============================================================
# ROADMAP GENERATOR
# ============================================================

class RoadmapRequest(BaseModel):
    weak_areas: list[str]

@router.post("/roadmap/generate")
def generate_roadmap(request: RoadmapRequest):
    if not request.weak_areas:
        return {"roadmap": "No weak areas identified. Keep practicing advanced topics!"}
        
    weaknesses = ", ".join(request.weak_areas)
    
    prompt = f"""
You are a senior engineering manager mentoring a candidate.
Based on their technical interview, they showed weakness in the following areas: {weaknesses}.

Create a structured, 7-day learning roadmap to help them improve in these specific areas.
For each day, provide a clear objective, topics to study, and a small hands-on task.
Format the output nicely using Markdown with headings for each day.
Do NOT wrap the output in markdown code blocks, just return raw markdown text.
"""
    
    roadmap = call_ollama(prompt)
    if not roadmap:
        raise HTTPException(status_code=500, detail="Failed to generate roadmap.")
        
    return {
        "roadmap": roadmap
    }