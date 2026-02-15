"""Workout Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkoutCreate(BaseModel):
    workout_type: str | None = None
    workout_name: str | None = None
    start_date: datetime
    end_date: datetime
    duration_minutes: float | None = None
    strain_score: float | None = None
    average_heart_rate: float | None = None
    max_heart_rate: float | None = None
    active_calories: float | None = None
    zone1_minutes: float | None = None
    zone2_minutes: float | None = None
    zone3_minutes: float | None = None
    zone4_minutes: float | None = None
    zone5_minutes: float | None = None


class WorkoutSyncRequest(BaseModel):
    workouts: list[WorkoutCreate]


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    daily_metric_id: uuid.UUID | None
    workout_type: str | None
    workout_name: str | None
    start_date: datetime | None
    end_date: datetime | None
    duration_minutes: float | None
    strain_score: float | None
    average_heart_rate: float | None
    max_heart_rate: float | None
    active_calories: float | None
    zone1_minutes: float | None
    zone2_minutes: float | None
    zone3_minutes: float | None
    zone4_minutes: float | None
    zone5_minutes: float | None
    created_at: datetime
    updated_at: datetime
