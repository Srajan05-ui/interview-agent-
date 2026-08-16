"""
Netlify Functions entry point.

Netlify invokes this file as the "api" function. Requests arrive through
the netlify.toml redirect:

    /api/interview/start
        -> /.netlify/functions/api/interview/start
        -> this handler
        -> Mangum (root-mounted FastAPI app)

def normalize_event(): The Netlify request path can arrive in two forms:

    /.netlify/functions/api/interview/start   (raw function URL)
    /api/interview/start                      (redirect target, no rewrite)

Mangum's api_gateway_base_path handles the first form. For the second
form we strip "/api" here so the router is reached at /interview/start.
The router is mounted at the ROOT in this file (no /api prefix), unlike
backend/app/main.py which keeps the /api prefix for local uvicorn.
"""
import functools
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import router
from app.core.security import limiter

logger = logging.getLogger("netlify-api")

app = FastAPI(
    title="Interview Acer — AI Technical Interviewer (Netlify)",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root mount: see module docstring for why there is no /api prefix here.
app.include_router(router)

_mangum = Mangum(app, api_gateway_base_path="/.netlify/functions/api")

NETLIFY_PREFIX = "/.netlify/functions/api"
API_PREFIX = "/api"


def normalize_event(event: dict) -> dict:
    """Make the Netlify request path route correctly through Mangum."""
    try:
        if "version" in event and event.get("version") == "2.0":
            raw_path = event.get("rawPath", "") or ""
            if raw_path.startswith(API_PREFIX) and not raw_path.startswith(NETLIFY_PREFIX):
                event["rawPath"] = raw_path[len(API_PREFIX) :] or "/"
                request_context = event.get("requestContext", {})
                http = request_context.get("http", {})
                if isinstance(http, dict) and http.get("path", "").startswith(API_PREFIX):
                    http["path"] = http["path"][len(API_PREFIX) :] or "/"
        else:
            # API Gateway v1 style event
            path = event.get("path", "") or ""
            if path.startswith(API_PREFIX) and not path.startswith(NETLIFY_PREFIX):
                event["path"] = path[len(API_PREFIX) :] or "/"
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("api.py normalize_event failed: %s", exc)

    return event


@functools.wraps(_mangum)
def handler(event, context):
    return _mangum(normalize_event(event), context)


__all__ = ["handler", "app"]
