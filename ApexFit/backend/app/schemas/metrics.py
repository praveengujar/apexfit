"""Daily-metrics Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MetricsSyncItem(BaseModel):
    date: date
    recovery_score: float | None = None
    recovery_zone: str | None = None
    strain_score: float | None = None
    sleep_performance: float | None = None
    hrv_rmssd: float | None = None
    hrv_sdnn: float | None = None
    resting_heart_rate: float | None = None
    respiratory_rate: float | None = None
    spo2: float | None = None
    steps: int | None = None
    active_calories: float | None = None
    vo2_max: float | None = None
    sleep_duration_hours: float | None = None
    sleep_need_hours: float | None = None


class MetricsSyncRequest(BaseModel):
    metrics: list[MetricsSyncItem]


class DailyMetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    recovery_score: float | None
    recovery_zone: str | None
    strain_score: float | None
    sleep_performance: float | None
    hrv_rmssd: float | None
    hrv_sdnn: float | None
    resting_heart_rate: float | None
    respiratory_rate: float | None
    spo2: float | None
    steps: int | None
    active_calories: float | None
    vo2_max: float | None
    sleep_duration_hours: float | None
    sleep_need_hours: float | None
    created_at: datetime
    updated_at: datetime
