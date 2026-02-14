"""User Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    firebase_uid: str
    display_name: str | None = None
    email: str | None = None


class UserUpdate(BaseModel):
    display_name: str | None = None
    date_of_birth: date | None = None
    biological_sex: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    max_heart_rate: int | None = None
    sleep_baseline_hours: float | None = None
    preferred_units: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    firebase_uid: str
    display_name: str | None
    email: str | None
    date_of_birth: date | None
    biological_sex: str | None
    height_cm: float | None
    weight_kg: float | None
    max_heart_rate: int | None
    sleep_baseline_hours: float | None
    preferred_units: str | None
    created_at: datetime
    updated_at: datetime
