"""Stress timeline schemas."""
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel

class StressDataPoint(BaseModel):
    timestamp: datetime
    score: float
    level: str  # LOW, MEDIUM, HIGH, VERY_HIGH

class StressTimelineResponse(BaseModel):
    current_score: float | None
    current_level: str | None
    last_updated: datetime | None
    data_points: list[StressDataPoint]
    daily_average: float | None
