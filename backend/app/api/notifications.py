"""Notification preference and device-token routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import user_repo
from app.db.session import get_session
from app.models.notification import NotificationPreference

router = APIRouter()


class DeviceTokenRequest(BaseModel):
    token: str
    platform: str = "ios"


class NotificationPrefUpdate(BaseModel):
    notification_type: str
    enabled: bool
    preferred_time: str | None = None


@router.post("/device")
async def register_device_token(
    body: DeviceTokenRequest,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    # Update or create a generic notification preference with the device token
    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user.id,
        NotificationPreference.notification_type == "device_token",
    )
    result = await session.execute(stmt)
    pref = result.scalar_one_or_none()

    if pref:
        pref.device_token = body.token
    else:
        pref = NotificationPreference(
            user_id=user.id,
            notification_type="device_token",
            device_token=body.token,
        )
        session.add(pref)

    await session.flush()
    return {"status": "ok"}


@router.get("/preferences")
async def get_preferences(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return []

    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user.id
    )
    result = await session.execute(stmt)
    return [
        {
            "notification_type": p.notification_type,
            "enabled": p.enabled,
            "preferred_time": str(p.preferred_time) if p.preferred_time else None,
        }
        for p in result.scalars().all()
    ]


@router.put("/preferences")
async def update_preference(
    body: NotificationPrefUpdate,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user.id,
        NotificationPreference.notification_type == body.notification_type,
    )
    result = await session.execute(stmt)
    pref = result.scalar_one_or_none()

    if pref:
        pref.enabled = body.enabled
    else:
        pref = NotificationPreference(
            user_id=user.id,
            notification_type=body.notification_type,
            enabled=body.enabled,
        )
        session.add(pref)

    await session.flush()
    return {"status": "ok"}
