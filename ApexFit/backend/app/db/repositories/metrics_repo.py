"""Metrics repository — data-access helpers for daily_metrics."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_metric import DailyMetric


async def get_by_user_and_date(
    session: AsyncSession, user_id: uuid.UUID, metric_date: date
) -> DailyMetric | None:
    stmt = select(DailyMetric).where(
        DailyMetric.user_id == user_id,
        DailyMetric.date == metric_date,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def upsert(session: AsyncSession, user_id: uuid.UUID, **kwargs) -> DailyMetric:
    metric_date = kwargs.pop("date")
    existing = await get_by_user_and_date(session, user_id, metric_date)

    if existing:
        for key, value in kwargs.items():
            if value is not None:
                setattr(existing, key, value)
        await session.flush()
        return existing

    metric = DailyMetric(user_id=user_id, date=metric_date, **kwargs)
    session.add(metric)
    await session.flush()
    return metric


async def list_by_date_range(
    session: AsyncSession,
    user_id: uuid.UUID,
    from_date: date | None = None,
    to_date: date | None = None,
    *,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[DailyMetric], int]:
    stmt = select(DailyMetric).where(DailyMetric.user_id == user_id)
    count_stmt = select(func.count()).select_from(DailyMetric).where(
        DailyMetric.user_id == user_id
    )

    if from_date:
        stmt = stmt.where(DailyMetric.date >= from_date)
        count_stmt = count_stmt.where(DailyMetric.date >= from_date)
    if to_date:
        stmt = stmt.where(DailyMetric.date <= to_date)
        count_stmt = count_stmt.where(DailyMetric.date <= to_date)

    stmt = stmt.order_by(DailyMetric.date.desc()).offset(offset).limit(limit)

    result = await session.execute(stmt)
    total_result = await session.execute(count_stmt)

    return list(result.scalars().all()), total_result.scalar_one()
