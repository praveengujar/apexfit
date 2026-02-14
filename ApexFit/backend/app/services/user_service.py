"""User service — business logic for user operations."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import user_repo
from app.models.user import User


async def get_or_create_user(
    session: AsyncSession,
    firebase_uid: str,
    email: str | None = None,
    name: str | None = None,
) -> User:
    """Find a user by Firebase UID, creating one if they don't exist."""
    user = await user_repo.get_by_firebase_uid(session, firebase_uid)
    if user:
        return user
    return await user_repo.create(
        session, firebase_uid=firebase_uid, email=email, display_name=name
    )


async def update_profile(
    session: AsyncSession, user_id: uuid.UUID, **kwargs
) -> User:
    """Update user profile fields."""
    user = await user_repo.get_by_id(session, user_id)
    if not user:
        raise ValueError(f"User {user_id} not found")
    return await user_repo.update(session, user, **kwargs)
