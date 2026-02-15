"""Dashboard aggregate response schemas."""
from __future__ import annotations
import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class HealthMonitorStatus(BaseModel):
    metrics_in_range: int
    total_metrics: int
    is_within_range: bool

class StressTimelinePoint(BaseModel):
    timestamp: datetime
    score: float

class WeeklyMetricDay(BaseModel):
    date: date
    strain_score: float | None
    recovery_score: float | None
    recovery_zone: str | None

class JournalDayStatus(BaseModel):
    date: date
    completed: bool

class ActivePlan(BaseModel):
    name: str
    days_left: int
    progress_percent: float

class DashboardSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Today
    date: date
    recovery_score: float | None
    recovery_zone: str | None
    strain_score: float | None
    sleep_performance: float | None
    hrv_rmssd: float | None
    resting_heart_rate: float | None
    vo2_max: float | None
    steps: int | None
    active_calories: float | None
    stress_average: float | None

    # Health monitor
    health_monitor: HealthMonitorStatus

    # Stress timeline
    stress_timeline: list[StressTimelinePoint]

    # Weekly history
    weekly_history: list[WeeklyMetricDay]

    # Journal week
    journal_week: list[JournalDayStatus]

    # Active plan
    active_plan: ActivePlan | None

    # Baselines
    hrv_baseline: float | None
    rhr_baseline: float | None
    vo2_max_baseline: float | None
    calories_baseline: float | None
    steps_baseline: float | None
