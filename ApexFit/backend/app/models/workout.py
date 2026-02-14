"""Workout ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Workout(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "workouts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    daily_metric_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("daily_metrics.id", ondelete="SET NULL"),
        nullable=True,
    )

    workout_type: Mapped[str | None] = mapped_column(String(100))
    workout_name: Mapped[str | None] = mapped_column(String(255))
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[float | None] = mapped_column(Float)
    strain_score: Mapped[float | None] = mapped_column(Float)
    average_heart_rate: Mapped[float | None] = mapped_column(Float)
    max_heart_rate: Mapped[float | None] = mapped_column(Float)
    active_calories: Mapped[float | None] = mapped_column(Float)

    # Heart-rate zone minutes
    zone1_minutes: Mapped[float | None] = mapped_column(Float)
    zone2_minutes: Mapped[float | None] = mapped_column(Float)
    zone3_minutes: Mapped[float | None] = mapped_column(Float)
    zone4_minutes: Mapped[float | None] = mapped_column(Float)
    zone5_minutes: Mapped[float | None] = mapped_column(Float)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="workouts")  # noqa: F821
    daily_metric: Mapped["DailyMetric | None"] = relationship(  # noqa: F821
        back_populates="workouts"
    )
