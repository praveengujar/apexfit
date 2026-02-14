"""Healthspan service — VitalOS Age computation."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import metrics_repo
from app.models.healthspan import HealthspanScore
from app.models.user import User


async def compute_healthspan(
    session: AsyncSession, user_id: uuid.UUID
) -> HealthspanScore | None:
    """Compute a daily healthspan / VitalOS Age score.

    Uses a simplified model:
    - Baseline: chronological age from user.date_of_birth
    - Adjustments based on 28-day average recovery, sleep, and activity
    """
    user = await session.get(User, user_id)
    if not user or not user.date_of_birth:
        return None

    today = date.today()
    chrono_age = (today - user.date_of_birth).days / 365.25

    # Fetch last 28 days of metrics
    from datetime import timedelta

    start = today - timedelta(days=28)
    metrics, _ = await metrics_repo.list_by_date_range(
        session, user_id, start, today, limit=28
    )

    if not metrics:
        return None

    # Compute sub-scores (0-100 scale)
    recovery_vals = [m.recovery_score for m in metrics if m.recovery_score]
    sleep_vals = [m.sleep_performance for m in metrics if m.sleep_performance]
    strain_vals = [m.strain_score for m in metrics if m.strain_score]

    avg_recovery = sum(recovery_vals) / len(recovery_vals) if recovery_vals else 50.0
    avg_sleep = sum(sleep_vals) / len(sleep_vals) if sleep_vals else 50.0
    avg_strain = sum(strain_vals) / len(strain_vals) if strain_vals else 10.0

    # Normalise strain to 0-100 (strain is 0-21)
    strain_score = min(100.0, (avg_strain / 21.0) * 100.0)

    # Composite biological age offset: better scores = younger
    offset = ((avg_recovery - 50) * 0.05 + (avg_sleep - 50) * 0.03 + (strain_score - 50) * 0.02)
    biological_age = chrono_age - offset
    vitalos_age = max(0, biological_age)

    score = HealthspanScore(
        user_id=user_id,
        date=today,
        vitalos_age=round(vitalos_age, 1),
        biological_age=round(biological_age, 1),
        cardiovascular_score=round(avg_recovery, 1),
        recovery_score=round(avg_recovery, 1),
        sleep_score=round(avg_sleep, 1),
        activity_score=round(strain_score, 1),
    )
    session.add(score)
    await session.flush()
    return score
