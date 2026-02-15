"""DailyMetric ORM model."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class DailyMetric(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "daily_metrics"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # Recovery
    recovery_score: Mapped[float | None] = mapped_column(Float)
    recovery_zone: Mapped[str | None] = mapped_column(String(20))

    # Strain
    strain_score: Mapped[float | None] = mapped_column(Float)

    # Sleep
    sleep_performance: Mapped[float | None] = mapped_column(Float)

    # Vitals
    hrv_rmssd: Mapped[float | None] = mapped_column(Float)
    hrv_sdnn: Mapped[float | None] = mapped_column(Float)
    resting_heart_rate: Mapped[float | None] = mapped_column(Float)
    respiratory_rate: Mapped[float | None] = mapped_column(Float)
    spo2: Mapped[float | None] = mapped_column(Float)

    # Activity
    steps: Mapped[int | None] = mapped_column(Integer)
    active_calories: Mapped[float | None] = mapped_column(Float)
    vo2_max: Mapped[float | None] = mapped_column(Float)

    # Sleep duration
    sleep_duration_hours: Mapped[float | None] = mapped_column(Float)
    sleep_need_hours: Mapped[float | None] = mapped_column(Float)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="daily_metrics")  # noqa: F821
    workouts: Mapped[list["Workout"]] = relationship(  # noqa: F821
        back_populates="daily_metric", lazy="selectin"
    )
    sleep_sessions: Mapped[list["SleepSession"]] = relationship(  # noqa: F821
        back_populates="daily_metric", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_daily_metrics_user_date"),
    )
