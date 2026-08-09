import os

from dotenv import load_dotenv


load_dotenv()


APP_NAME = "AI Cohort Technical Interviewer"

MAX_QUESTIONS = 8
MIN_CURRICULUM_DAYS = 4


LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER",
    "openrouter"
)


OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",
    ""
)


OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "openai/gpt-4.1"
)


CANDIDATES_PATH = os.getenv(
    "CANDIDATES_PATH",
    "data/candidate.json"
)


CURRICULUM_PATH = os.getenv(
    "CURRICULUM_PATH",
    "data/curriculum.json"
)