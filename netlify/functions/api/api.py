"""
Netlify Functions entry point.

The Netlify build copies this file (plus the app/ package) into
netlify/functions/api/. Netlify detects it as the "api" function
because the entry file name matches its directory name.

Request flow on Netlify:

    /api/interview/start
        -> redirect (netlify.toml) -> /.netlify/functions/api/interview/start
        -> Mangum
        -> api_gateway_base_path strips /.netlify/functions/api
        -> FastAPI receives /interview/start

The router is therefore mounted at the ROOT here (no /api prefix),
unlike app/main.py which keeps the /api prefix for local uvicorn.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import router
from app.core.security import limiter

app = FastAPI(
    title="Interview Acer — AI Technical Interviewer (Netlify)",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# The deployed frontend calls the API same-origin, so wildcard CORS is safe.
# Local dev via `netlify dev` also resolves same-origin through the proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root mount: see module docstring for why there is no /api prefix here.
app.include_router(router)

handler = Mangum(app, api_gateway_base_path="/.netlify/functions/api")
