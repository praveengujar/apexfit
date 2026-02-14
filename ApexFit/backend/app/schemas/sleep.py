"""Sleep Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SleepSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    daily_metric_id: uuid.UUID | None
    start_date: datetime | None
    end_date: datetime | None
    is_main_sleep: bool
    total_sleep_minutes: int | None
    light_minutes: int | None
    deep_minutes: int | None
    rem_minutes: int | None
    awake_minutes: int | None
    sleep_efficiency: float | None
    sleep_performance: float | None
    created_at: datetime
    updated_at: datetime
