"""Coach Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CoachMessageCreate(BaseModel):
    content: str
    conversation_id: uuid.UUID | None = None


class CoachMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class CoachConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    messages: list[CoachMessageResponse]
    created_at: datetime
    updated_at: datetime
