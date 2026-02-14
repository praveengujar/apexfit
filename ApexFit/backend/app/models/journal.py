"""Journal ORM models."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class JournalEntry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "journal_entries"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="journal_entries")  # noqa: F821
    responses: Mapped[list["JournalResponse"]] = relationship(
        back_populates="journal_entry", lazy="selectin", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_journal_entries_user_date"),
    )


class JournalResponse(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "journal_responses"

    journal_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    behavior_key: Mapped[str] = mapped_column(String(100), nullable=False)
    response_type: Mapped[str] = mapped_column(String(20), nullable=False)
    bool_value: Mapped[bool | None] = mapped_column(Boolean)
    numeric_value: Mapped[float | None] = mapped_column(Float)
    scale_value: Mapped[int | None] = mapped_column(Integer)

    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship(back_populates="responses")
