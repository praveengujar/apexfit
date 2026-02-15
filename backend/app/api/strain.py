"""Strain history and target routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import metrics_repo, user_repo
from app.db.session import get_session
from app.schemas.metrics import DailyMetricResponse

router = APIRouter()


@router.get("/history", response_model=list[DailyMetricResponse])
async def get_strain_history(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(30, ge=1, le=90),
) -> list[DailyMetricResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return []

    metrics, _ = await metrics_repo.list_by_date_range(
        session, user.id, from_date, to_date, limit=limit
    )
    return [DailyMetricResponse.model_validate(m) for m in metrics]
