"""Authentication data classes."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AuthUser:
    """Represents a verified Firebase user extracted from a JWT."""

    uid: str
    email: str | None = None
    name: str | None = None


@dataclass(frozen=True, slots=True)
class TokenPayload:
    """Decoded JWT payload fields used for validation."""

    sub: str
    email: str | None = None
    exp: int | None = None
