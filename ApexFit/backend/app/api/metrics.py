"""Daily metrics sync and query routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import metrics_repo, user_repo
from app.db.session import get_session
from app.schemas.common import PaginatedResponse
from app.schemas.metrics import DailyMetricResponse, MetricsSyncRequest

router = APIRouter()


@router.post("/sync", response_model=list[DailyMetricResponse])
async def sync_metrics(
    body: MetricsSyncRequest,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DailyMetricResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    results = []
    for item in body.metrics:
        metric = await metrics_repo.upsert(
            session, user.id, **item.model_dump()
        )
        results.append(DailyMetricResponse.model_validate(metric))
    return results


@router.get("/daily", response_model=PaginatedResponse[DailyMetricResponse])
async def get_daily_metrics(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[DailyMetricResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return PaginatedResponse.create([], 0, page, page_size)

    offset = (page - 1) * page_size
    metrics, total = await metrics_repo.list_by_date_range(
        session, user.id, from_date, to_date, offset=offset, limit=page_size
    )
    items = [DailyMetricResponse.model_validate(m) for m in metrics]
    return PaginatedResponse.create(items, total, page, page_size)
