"""Stress timeline endpoint."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.session import get_session
from app.schemas.stress import StressTimelineResponse

router = APIRouter()

@router.get("/timeline", response_model=StressTimelineResponse)
async def get_stress_timeline(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StressTimelineResponse:
    # Stress is primarily computed on-device from HealthKit HRV data.
    # This endpoint serves as a sync/fetch point for cross-device access.
    return StressTimelineResponse(
        current_score=None,
        current_level=None,
        last_updated=None,
        data_points=[],
        daily_average=None,
    )
