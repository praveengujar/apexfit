"""HealthspanScore ORM model."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, Float, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class HealthspanScore(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "healthspan_scores"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    vitalos_age: Mapped[float] = mapped_column(Float, nullable=False)
    biological_age: Mapped[float | None] = mapped_column(Float)
    cardiovascular_score: Mapped[float | None] = mapped_column(Float)
    recovery_score: Mapped[float | None] = mapped_column(Float)
    sleep_score: Mapped[float | None] = mapped_column(Float)
    activity_score: Mapped[float | None] = mapped_column(Float)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="healthspan_scores")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_healthspan_scores_user_date"),
    )
