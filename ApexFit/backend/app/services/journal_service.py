"""Journal service — entry CRUD and impact correlation analysis."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import journal_repo, metrics_repo
from app.models.journal import JournalEntry
from app.schemas.journal import JournalImpact


async def create_entry(
    session: AsyncSession,
    user_id: uuid.UUID,
    entry_date: date,
    responses: list[dict],
) -> JournalEntry:
    """Create a new journal entry with responses."""
    return await journal_repo.create_entry(session, user_id, entry_date, responses)


async def compute_impacts(
    session: AsyncSession, user_id: uuid.UUID
) -> list[JournalImpact]:
    """Compute correlation between journal behaviours and recovery metrics.

    This performs a simplified analysis:
    1. Fetch all journal entries with responses.
    2. Fetch corresponding daily metrics.
    3. For each behaviour, compute Pearson correlation with recovery_score.
    """
    entries, _ = await journal_repo.list_entries(
        session, user_id, limit=200
    )
    if len(entries) < 7:
        return []

    metrics_lookup: dict[date, float] = {}
    for entry in entries:
        metric = await metrics_repo.get_by_user_and_date(
            session, user_id, entry.date
        )
        if metric and metric.recovery_score is not None:
            metrics_lookup[entry.date] = metric.recovery_score

    # Group response values by behaviour key
    behaviour_values: dict[str, list[tuple[float, float]]] = {}
    for entry in entries:
        recovery = metrics_lookup.get(entry.date)
        if recovery is None:
            continue
        for resp in entry.responses:
            val: float | None = None
            if resp.bool_value is not None:
                val = 1.0 if resp.bool_value else 0.0
            elif resp.numeric_value is not None:
                val = resp.numeric_value
            elif resp.scale_value is not None:
                val = float(resp.scale_value)
            if val is not None:
                behaviour_values.setdefault(resp.behavior_key, []).append(
                    (val, recovery)
                )

    impacts: list[JournalImpact] = []
    for key, pairs in behaviour_values.items():
        if len(pairs) < 5:
            continue
        xs = [p[0] for p in pairs]
        ys = [p[1] for p in pairs]
        corr = _pearson(xs, ys)
        significance = (
            "high" if abs(corr) > 0.5 else "medium" if abs(corr) > 0.3 else "low"
        )
        impacts.append(
            JournalImpact(
                behavior_key=key,
                metric="recovery_score",
                correlation=round(corr, 3),
                sample_size=len(pairs),
                significance=significance,
            )
        )

    impacts.sort(key=lambda i: abs(i.correlation), reverse=True)
    return impacts


def _pearson(xs: list[float], ys: list[float]) -> float:
    """Compute Pearson correlation coefficient."""
    n = len(xs)
    if n < 2:
        return 0.0
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den_x = sum((x - mean_x) ** 2 for x in xs) ** 0.5
    den_y = sum((y - mean_y) ** 2 for y in ys) ** 0.5
    if den_x == 0 or den_y == 0:
        return 0.0
    return num / (den_x * den_y)
