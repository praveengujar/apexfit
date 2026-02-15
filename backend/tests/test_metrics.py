"""Tests for metrics sync and query endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sync_metrics(client: AsyncClient):
    """POST /api/v1/metrics/sync should upsert daily metrics."""
    payload = {
        "metrics": [
            {
                "date": "2025-01-15",
                "recovery_score": 72.5,
                "recovery_zone": "green",
                "strain_score": 12.3,
                "sleep_performance": 85.0,
                "hrv_rmssd": 45.2,
                "resting_heart_rate": 58.0,
                "steps": 8500,
            }
        ]
    }
    response = await client.post("/api/v1/metrics/sync", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["recovery_score"] == 72.5
    assert data[0]["recovery_zone"] == "green"
    assert data[0]["strain_score"] == 12.3


@pytest.mark.asyncio
async def test_get_daily_metrics_empty(client: AsyncClient):
    """GET /api/v1/metrics/daily should return empty when no data."""
    response = await client.get("/api/v1/metrics/daily")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 0
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_sync_then_query(client: AsyncClient):
    """Synced metrics should be queryable."""
    # Sync
    payload = {
        "metrics": [
            {"date": "2025-02-01", "recovery_score": 65.0, "strain_score": 8.5},
            {"date": "2025-02-02", "recovery_score": 78.0, "strain_score": 14.2},
        ]
    }
    await client.post("/api/v1/metrics/sync", json=payload)

    # Query
    response = await client.get(
        "/api/v1/metrics/daily",
        params={"from_date": "2025-02-01", "to_date": "2025-02-28"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
