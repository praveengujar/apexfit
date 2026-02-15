"""SleepSession ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SleepSession(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "sleep_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    daily_metric_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("daily_metrics.id", ondelete="SET NULL"),
        nullable=True,
    )

    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_main_sleep: Mapped[bool] = mapped_column(Boolean, server_default="true")

    total_sleep_minutes: Mapped[int | None] = mapped_column(Integer)
    light_minutes: Mapped[int | None] = mapped_column(Integer)
    deep_minutes: Mapped[int | None] = mapped_column(Integer)
    rem_minutes: Mapped[int | None] = mapped_column(Integer)
    awake_minutes: Mapped[int | None] = mapped_column(Integer)

    sleep_efficiency: Mapped[float | None] = mapped_column(Float)
    sleep_performance: Mapped[float | None] = mapped_column(Float)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="sleep_sessions")  # noqa: F821
    daily_metric: Mapped["DailyMetric | None"] = relationship(  # noqa: F821
        back_populates="sleep_sessions"
    )
