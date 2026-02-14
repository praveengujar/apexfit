"""Journal repository — data-access helpers for journal tables."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.journal import JournalEntry, JournalResponse


async def get_by_user_and_date(
    session: AsyncSession, user_id: uuid.UUID, entry_date: date
) -> JournalEntry | None:
    stmt = (
        select(JournalEntry)
        .options(selectinload(JournalEntry.responses))
        .where(JournalEntry.user_id == user_id, JournalEntry.date == entry_date)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_entry(
    session: AsyncSession,
    user_id: uuid.UUID,
    entry_date: date,
    responses: list[dict],
) -> JournalEntry:
    entry = JournalEntry(user_id=user_id, date=entry_date)
    session.add(entry)
    await session.flush()

    for resp_data in responses:
        resp = JournalResponse(journal_entry_id=entry.id, **resp_data)
        session.add(resp)

    await session.flush()
    return entry


async def list_entries(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[JournalEntry], int]:
    stmt = (
        select(JournalEntry)
        .options(selectinload(JournalEntry.responses))
        .where(JournalEntry.user_id == user_id)
    )
    count_stmt = select(func.count()).select_from(JournalEntry).where(
        JournalEntry.user_id == user_id
    )

    if from_date:
        stmt = stmt.where(JournalEntry.date >= from_date)
        count_stmt = count_stmt.where(JournalEntry.date >= from_date)
    if to_date:
        stmt = stmt.where(JournalEntry.date <= to_date)
        count_stmt = count_stmt.where(JournalEntry.date <= to_date)

    stmt = stmt.order_by(JournalEntry.date.desc()).offset(offset).limit(limit)

    result = await session.execute(stmt)
    total_result = await session.execute(count_stmt)
    return list(result.scalars().all()), total_result.scalar_one()
