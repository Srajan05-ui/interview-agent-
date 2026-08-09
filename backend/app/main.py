from fastapi import FastAPI

from app.api.routes import router


app = FastAPI(
    title="AI Cohort Technical Interviewer",
    version="1.0.0",
    description="AI-powered adaptive technical interview backend.",
)

# Register interview API routes
app.include_router(router)


@app.get("/")
def root():
    return {
        "message": "AI Cohort Technical Interviewer API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "AI Cohort Technical Interviewer",
    }