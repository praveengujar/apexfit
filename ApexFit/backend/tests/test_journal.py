"""Tests for journal entry endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_submit_journal_entry(client: AsyncClient):
    """POST /api/v1/journal should create a journal entry."""
    payload = {
        "date": "2025-01-15",
        "responses": [
            {
                "behavior_key": "caffeine",
                "response_type": "toggle",
                "bool_value": True,
            },
            {
                "behavior_key": "sleep_quality",
                "response_type": "scale",
                "scale_value": 4,
            },
        ],
    }
    response = await client.post("/api/v1/journal/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2025-01-15"
    assert len(data["responses"]) == 2


@pytest.mark.asyncio
async def test_duplicate_journal_entry_rejected(client: AsyncClient):
    """Submitting a journal for the same date should return 409."""
    payload = {
        "date": "2025-03-10",
        "responses": [
            {"behavior_key": "alcohol", "response_type": "toggle", "bool_value": False}
        ],
    }
    r1 = await client.post("/api/v1/journal/", json=payload)
    assert r1.status_code == 200

    r2 = await client.post("/api/v1/journal/", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_get_journal_impacts(client: AsyncClient):
    """GET /api/v1/journal/impacts should return a list."""
    response = await client.get("/api/v1/journal/impacts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
