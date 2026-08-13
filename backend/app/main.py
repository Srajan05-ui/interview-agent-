import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.security import limiter

from app.api.routes import router

app = FastAPI(
    title="Interview Acer — AI Technical Interviewer",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# =========================================================
# CORS
# =========================================================

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
dev_mode = os.getenv("DEV_MODE", "false").lower() in ("true", "1", "yes")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    frontend_url,
]

if dev_mode:
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if not dev_mode else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ROUTES — mount only once with /api prefix
# =========================================================

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "Interview Acer — AI Technical Interviewer",
        "status": "running",
    }