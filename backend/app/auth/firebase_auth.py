"""Firebase JWT verification using python-jose and Firebase public keys."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from jose import JWTError, jwt

from app.auth.models import AuthUser
from app.config import get_settings

logger = logging.getLogger(__name__)

# Google public key URL for Firebase tokens
_GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
_FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/"

# Cached public keys and expiry
_cached_keys: dict[str, str] = {}
_keys_expiry: float = 0.0


async def _fetch_google_public_keys() -> dict[str, str]:
    """Fetch and cache Google's public signing keys for Firebase tokens."""
    global _cached_keys, _keys_expiry  # noqa: PLW0603

    now = time.time()
    if _cached_keys and now < _keys_expiry:
        return _cached_keys

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(_GOOGLE_CERTS_URL)
        response.raise_for_status()

        # Cache based on Cache-Control max-age
        cache_control = response.headers.get("Cache-Control", "")
        max_age = 3600  # default 1 hour
        for part in cache_control.split(","):
            part = part.strip()
            if part.startswith("max-age="):
                try:
                    max_age = int(part.split("=")[1])
                except (ValueError, IndexError):
                    pass

        _cached_keys = response.json()
        _keys_expiry = now + max_age

    return _cached_keys


async def verify_firebase_token(token: str) -> AuthUser:
    """Verify a Firebase ID token and return an AuthUser.

    Raises:
        ValueError: If the token is invalid, expired, or cannot be verified.
    """
    settings = get_settings()
    project_id = settings.firebase_project_id

    if not project_id:
        raise ValueError("FIREBASE_PROJECT_ID is not configured")

    expected_issuer = f"{_FIREBASE_ISSUER_PREFIX}{project_id}"

    try:
        # Decode header to find the key id
        unverified_header: dict[str, Any] = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise ValueError("Token header missing 'kid'")

        # Fetch public keys
        public_keys = await _fetch_google_public_keys()
        cert = public_keys.get(kid)
        if not cert:
            raise ValueError(f"Public key not found for kid={kid}")

        # Verify and decode
        payload: dict[str, Any] = jwt.decode(
            token,
            cert,
            algorithms=["RS256"],
            audience=project_id,
            issuer=expected_issuer,
        )

        uid = payload.get("sub") or payload.get("user_id")
        if not uid:
            raise ValueError("Token missing 'sub' claim")

        return AuthUser(
            uid=uid,
            email=payload.get("email"),
            name=payload.get("name"),
        )

    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise ValueError(f"Invalid Firebase token: {exc}") from exc
