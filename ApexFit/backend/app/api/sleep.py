"""Sleep session history routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import user_repo
from app.db.session import get_session
from app.models.sleep import SleepSession
from app.schemas.sleep import SleepSessionResponse

router = APIRouter()


@router.get("/history", response_model=list[SleepSessionResponse])
async def get_sleep_history(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(30, ge=1, le=90),
) -> list[SleepSessionResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return []

    stmt = select(SleepSession).where(SleepSession.user_id == user.id)
    if from_date:
        stmt = stmt.where(SleepSession.start_date >= from_date)
    if to_date:
        stmt = stmt.where(SleepSession.start_date <= to_date)

    stmt = stmt.order_by(SleepSession.start_date.desc()).limit(limit)
    result = await session.execute(stmt)
    return [SleepSessionResponse.model_validate(s) for s in result.scalars().all()]
