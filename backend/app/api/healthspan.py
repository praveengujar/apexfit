"""Healthspan / VitalOS Age routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import user_repo
from app.db.session import get_session
from app.models.healthspan import HealthspanScore

router = APIRouter()


class HealthspanResponse:
    """Inline response for healthspan scores."""
    pass


@router.get("/scores")
async def get_healthspan_scores(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(30, ge=1, le=90),
) -> list[dict]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return []

    stmt = select(HealthspanScore).where(HealthspanScore.user_id == user.id)
    if from_date:
        stmt = stmt.where(HealthspanScore.date >= from_date)
    if to_date:
        stmt = stmt.where(HealthspanScore.date <= to_date)

    stmt = stmt.order_by(HealthspanScore.date.desc()).limit(limit)
    result = await session.execute(stmt)

    return [
        {
            "id": str(s.id),
            "date": s.date.isoformat(),
            "vitalos_age": s.vitalos_age,
            "biological_age": s.biological_age,
            "cardiovascular_score": s.cardiovascular_score,
            "recovery_score": s.recovery_score,
            "sleep_score": s.sleep_score,
            "activity_score": s.activity_score,
        }
        for s in result.scalars().all()
    ]
