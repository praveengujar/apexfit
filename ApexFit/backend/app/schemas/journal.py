"""Journal Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class JournalResponseData(BaseModel):
    behavior_key: str
    response_type: str
    bool_value: bool | None = None
    numeric_value: float | None = None
    scale_value: int | None = None


class JournalEntryCreate(BaseModel):
    date: date
    responses: list[JournalResponseData]


class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    completed_at: datetime | None
    responses: list[JournalResponseData]
    created_at: datetime
    updated_at: datetime


class JournalImpact(BaseModel):
    behavior_key: str
    metric: str
    correlation: float
    sample_size: int
    significance: str
