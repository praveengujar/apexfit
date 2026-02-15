"""Metrics service — sync and query daily metrics."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import metrics_repo
from app.models.daily_metric import DailyMetric
from app.schemas.metrics import MetricsSyncItem


async def sync_metrics(
    session: AsyncSession,
    user_id: uuid.UUID,
    items: list[MetricsSyncItem],
) -> list[DailyMetric]:
    """Upsert a batch of daily metrics from the iOS app."""
    results = []
    for item in items:
        metric = await metrics_repo.upsert(session, user_id, **item.model_dump())
        results.append(metric)
    return results


async def get_metric_history(
    session: AsyncSession,
    user_id: uuid.UUID,
    from_date: date | None = None,
    to_date: date | None = None,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[DailyMetric], int]:
    """Return paginated metric history."""
    offset = (page - 1) * page_size
    return await metrics_repo.list_by_date_range(
        session, user_id, from_date, to_date, offset=offset, limit=page_size
    )
