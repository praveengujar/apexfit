"""NotificationPreference ORM model."""

from __future__ import annotations

import uuid
from datetime import time

from sqlalchemy import Boolean, ForeignKey, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class NotificationPreference(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, server_default="true")
    preferred_time: Mapped[time | None] = mapped_column(Time)
    device_token: Mapped[str | None] = mapped_column(String(512))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notification_preferences")  # noqa: F821

    __table_args__ = (
        UniqueConstraint(
            "user_id", "notification_type", name="uq_notification_prefs_user_type"
        ),
    )
