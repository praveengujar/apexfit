"""FastAPI dependencies for authentication."""

from __future__ import annotations

from fastapi import Header, HTTPException, status

from app.auth.firebase_auth import verify_firebase_token
from app.auth.models import AuthUser


async def get_current_user(
    authorization: str = Header(..., description="Bearer <firebase_id_token>"),
) -> AuthUser:
    """Extract and verify the Firebase ID token from the Authorization header.

    Returns an AuthUser on success; raises 401 on any failure.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must start with 'Bearer '",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is empty",
        )

    try:
        user = await verify_firebase_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return user
