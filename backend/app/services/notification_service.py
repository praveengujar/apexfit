"""Notification service — FCM push notification delivery."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationPreference

logger = logging.getLogger(__name__)


async def get_device_token(
    session: AsyncSession, user_id: uuid.UUID
) -> str | None:
    """Retrieve the user's FCM device token."""
    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type == "device_token",
    )
    result = await session.execute(stmt)
    pref = result.scalar_one_or_none()
    return pref.device_token if pref else None


async def send_push(
    user_id: uuid.UUID,
    title: str,
    body: str,
    *,
    device_token: str | None = None,
) -> bool:
    """Send a push notification via Firebase Cloud Messaging.

    In production, this calls the FCM HTTP v1 API.
    Currently logs the notification as a placeholder.
    """
    if not device_token:
        logger.warning("No device token for user %s; skipping push", user_id)
        return False

    # Placeholder — in production, use google-auth + httpx to call FCM API
    logger.info(
        "PUSH [%s] → %s: %s (token=%s…)",
        user_id,
        title,
        body,
        device_token[:12],
    )
    return True


async def send_recovery_notification(
    session: AsyncSession,
    user_id: uuid.UUID,
    recovery_score: float,
    recovery_zone: str,
) -> bool:
    """Send a morning recovery push notification."""
    token = await get_device_token(session, user_id)
    zone_emoji = {"green": "🟢", "yellow": "🟡", "red": "🔴"}.get(
        recovery_zone.lower(), ""
    )
    return await send_push(
        user_id,
        f"Recovery: {recovery_score:.0f}% {zone_emoji}",
        f"Your recovery is in the {recovery_zone} zone today.",
        device_token=token,
    )
