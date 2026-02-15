"""Workout sync and query routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import user_repo
from app.db.session import get_session
from app.models.workout import Workout
from app.schemas.workout import WorkoutResponse, WorkoutSyncRequest

router = APIRouter()


@router.post("/sync", response_model=list[WorkoutResponse])
async def sync_workouts(
    body: WorkoutSyncRequest,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[WorkoutResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    results = []
    for item in body.workouts:
        workout = Workout(user_id=user.id, **item.model_dump())
        session.add(workout)
        await session.flush()
        results.append(WorkoutResponse.model_validate(workout))
    return results


@router.get("/", response_model=list[WorkoutResponse])
async def get_workouts(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> list[WorkoutResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return []

    stmt = select(Workout).where(Workout.user_id == user.id)
    if from_date:
        stmt = stmt.where(Workout.start_date >= from_date)
    if to_date:
        stmt = stmt.where(Workout.start_date <= to_date)

    stmt = stmt.order_by(Workout.start_date.desc()).limit(limit)
    result = await session.execute(stmt)
    return [WorkoutResponse.model_validate(w) for w in result.scalars().all()]
