"""Coach conversation ORM models."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class CoachConversation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "coach_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="coach_conversations")  # noqa: F821
    messages: Mapped[list["CoachMessage"]] = relationship(
        back_populates="conversation", lazy="selectin", cascade="all, delete-orphan"
    )


class CoachMessage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "coach_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coach_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    conversation: Mapped["CoachConversation"] = relationship(back_populates="messages")
