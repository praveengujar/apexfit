"""Dashboard aggregate endpoint."""
from __future__ import annotations
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.db.repositories import metrics_repo, user_repo
from app.db.session import get_session
from app.schemas.dashboard import (
    DashboardSummaryResponse, HealthMonitorStatus, WeeklyMetricDay,
    JournalDayStatus, ActivePlan,
)

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    target_date: date | None = None,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> DashboardSummaryResponse:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        # Return empty dashboard
        return _empty_dashboard(target_date or date.today())

    today = target_date or date.today()

    # Fetch today's metric
    today_metric = await metrics_repo.get_by_user_and_date(session, user.id, today)

    # Fetch 28-day history for baselines
    from_date = today - timedelta(days=28)
    history, _ = await metrics_repo.list_by_date_range(
        session, user.id, from_date, today, offset=0, limit=28
    )

    # Fetch 7-day history for weekly chart
    week_start = today - timedelta(days=6)
    week_metrics, _ = await metrics_repo.list_by_date_range(
        session, user.id, week_start, today, offset=0, limit=7
    )

    # Compute baselines from history
    hrv_values = [m.hrv_rmssd for m in history if m.hrv_rmssd is not None]
    rhr_values = [m.resting_heart_rate for m in history if m.resting_heart_rate is not None]
    vo2_values = [m.vo2_max for m in history if m.vo2_max is not None]
    cal_values = [m.active_calories for m in history if m.active_calories is not None]
    step_values = [m.steps for m in history if m.steps is not None]

    hrv_baseline = sum(hrv_values) / len(hrv_values) if hrv_values else None
    rhr_baseline = sum(rhr_values) / len(rhr_values) if rhr_values else None
    vo2_baseline = sum(vo2_values) / len(vo2_values) if vo2_values else None
    cal_baseline = sum(cal_values) / len(cal_values) if cal_values else None
    steps_baseline = sum(step_values) / len(step_values) if step_values else None

    # Health monitor: check vitals within range (1.5 std dev)
    health_monitor = _compute_health_monitor(today_metric, history)

    # Weekly history
    weekly_history = [
        WeeklyMetricDay(
            date=m.date, strain_score=m.strain_score,
            recovery_score=m.recovery_score, recovery_zone=m.recovery_zone
        ) for m in sorted(week_metrics, key=lambda m: m.date)
    ]

    return DashboardSummaryResponse(
        date=today,
        recovery_score=today_metric.recovery_score if today_metric else None,
        recovery_zone=today_metric.recovery_zone if today_metric else None,
        strain_score=today_metric.strain_score if today_metric else None,
        sleep_performance=today_metric.sleep_performance if today_metric else None,
        hrv_rmssd=today_metric.hrv_rmssd if today_metric else None,
        resting_heart_rate=today_metric.resting_heart_rate if today_metric else None,
        vo2_max=today_metric.vo2_max if today_metric else None,
        steps=today_metric.steps if today_metric else None,
        active_calories=today_metric.active_calories if today_metric else None,
        stress_average=None,  # Computed on-device
        health_monitor=health_monitor,
        stress_timeline=[],  # Computed on-device from HealthKit
        weekly_history=weekly_history,
        journal_week=[],  # TODO: wire journal repo
        active_plan=None,  # TODO: wire plans
        hrv_baseline=hrv_baseline,
        rhr_baseline=rhr_baseline,
        vo2_max_baseline=vo2_baseline,
        calories_baseline=cal_baseline,
        steps_baseline=int(steps_baseline) if steps_baseline else None,
    )


def _compute_health_monitor(today_metric, history) -> HealthMonitorStatus:
    if not today_metric:
        return HealthMonitorStatus(metrics_in_range=0, total_metrics=5, is_within_range=False)

    import statistics
    in_range = 0
    total = 0

    checks = [
        ("hrv_rmssd", today_metric.hrv_rmssd),
        ("resting_heart_rate", today_metric.resting_heart_rate),
        ("spo2", today_metric.spo2),
        ("respiratory_rate", today_metric.respiratory_rate),
    ]

    for attr, current_val in checks:
        historical = [getattr(m, attr) for m in history if getattr(m, attr) is not None]
        if not historical or current_val is None:
            continue
        total += 1
        mean = statistics.mean(historical)
        stdev = statistics.stdev(historical) if len(historical) > 1 else mean * 0.1
        if abs(current_val - mean) <= 1.5 * stdev:
            in_range += 1

    if total == 0:
        return HealthMonitorStatus(metrics_in_range=0, total_metrics=0, is_within_range=True)

    return HealthMonitorStatus(
        metrics_in_range=in_range, total_metrics=total, is_within_range=(in_range == total)
    )


def _empty_dashboard(d: date) -> DashboardSummaryResponse:
    return DashboardSummaryResponse(
        date=d, recovery_score=None, recovery_zone=None, strain_score=None,
        sleep_performance=None, hrv_rmssd=None, resting_heart_rate=None,
        vo2_max=None, steps=None, active_calories=None, stress_average=None,
        health_monitor=HealthMonitorStatus(metrics_in_range=0, total_metrics=0, is_within_range=True),
        stress_timeline=[], weekly_history=[], journal_week=[],
        active_plan=None, hrv_baseline=None, rhr_baseline=None,
        vo2_max_baseline=None, calories_baseline=None, steps_baseline=None,
    )
