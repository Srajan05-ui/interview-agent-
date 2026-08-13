import os
import json
from typing import Optional
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# =========================================================
# DEV MODE — bypass Firebase Auth for local development
# =========================================================

DEV_MODE = os.getenv("DEV_MODE", "false").lower() in ("true", "1", "yes")

# =========================================================
# FIREBASE ADMIN INIT (production only)
# =========================================================

_firebase_initialized = False

if not DEV_MODE:
    try:
        import firebase_admin
        from firebase_admin import credentials, auth as firebase_auth

        if not firebase_admin._apps:
            service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

            if service_account_json:
                cred_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
            elif service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
            else:
                try:
                    firebase_admin.initialize_app()
                    _firebase_initialized = True
                except Exception:
                    print("[Security] Firebase Admin: no credentials found, auth will be bypassed.")
        else:
            _firebase_initialized = True

    except Exception as e:
        print(f"[Security] Failed to initialize Firebase Admin: {e}")
else:
    print("[Security] DEV_MODE enabled — Firebase Auth verification is BYPASSED.")

# =========================================================
# AUTH DEPENDENCY
# =========================================================

security = HTTPBearer(auto_error=not DEV_MODE)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    # ---------------------------------------------------------
    # DEV MODE: return a mock user
    # ---------------------------------------------------------
    if DEV_MODE or not _firebase_initialized:
        return {
            "uid": "dev-user-local",
            "email": "dev@interviewacer.local",
            "name": "Dev User",
        }

    # ---------------------------------------------------------
    # PRODUCTION: verify Firebase ID token
    # ---------------------------------------------------------
    if not creds:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    token = creds.credentials
    try:
        from firebase_admin import auth as firebase_auth
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}",
        )
