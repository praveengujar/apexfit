"""Coach repository — data-access helpers for coach tables."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.coach import CoachConversation, CoachMessage


async def get_conversation(
    session: AsyncSession, conversation_id: uuid.UUID
) -> CoachConversation | None:
    stmt = (
        select(CoachConversation)
        .options(selectinload(CoachConversation.messages))
        .where(CoachConversation.id == conversation_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_conversations(
    session: AsyncSession, user_id: uuid.UUID
) -> list[CoachConversation]:
    stmt = (
        select(CoachConversation)
        .options(selectinload(CoachConversation.messages))
        .where(CoachConversation.user_id == user_id)
        .order_by(CoachConversation.updated_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_conversation(
    session: AsyncSession, user_id: uuid.UUID, title: str | None = None
) -> CoachConversation:
    conv = CoachConversation(user_id=user_id, title=title)
    session.add(conv)
    await session.flush()
    return conv


async def add_message(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
) -> CoachMessage:
    msg = CoachMessage(conversation_id=conversation_id, role=role, content=content)
    session.add(msg)
    await session.flush()
    return msg
