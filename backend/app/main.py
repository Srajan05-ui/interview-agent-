from fastapi import FastAPI

app = FastAPI(
    title="AI Cohort Technical Interviewer",
    description="AI-powered adaptive technical interview backend",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "AI Cohort Technical Interviewer"
    }