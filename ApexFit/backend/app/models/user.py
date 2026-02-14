"""User ORM model."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    firebase_uid: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True
    )
    display_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(320))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    biological_sex: Mapped[str | None] = mapped_column(String(20))
    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    max_heart_rate: Mapped[int | None] = mapped_column(Integer)
    sleep_baseline_hours: Mapped[float | None] = mapped_column(Float)
    preferred_units: Mapped[str | None] = mapped_column(
        String(20), server_default="metric"
    )

    # Relationships
    daily_metrics: Mapped[list["DailyMetric"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    workouts: Mapped[list["Workout"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    sleep_sessions: Mapped[list["SleepSession"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    coach_conversations: Mapped[list["CoachConversation"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    healthspan_scores: Mapped[list["HealthspanScore"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    notification_preferences: Mapped[list["NotificationPreference"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_users_email", "email"),
    )
