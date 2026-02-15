"""User repository — data-access helpers for the users table."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)


async def get_by_firebase_uid(session: AsyncSession, firebase_uid: str) -> User | None:
    stmt = select(User).where(User.firebase_uid == firebase_uid)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create(session: AsyncSession, **kwargs) -> User:
    user = User(**kwargs)
    session.add(user)
    await session.flush()
    return user


async def update(session: AsyncSession, user: User, **kwargs) -> User:
    for key, value in kwargs.items():
        if value is not None:
            setattr(user, key, value)
    await session.flush()
    return user
