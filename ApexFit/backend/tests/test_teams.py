"""Tests for team management endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_team(client: AsyncClient):
    """POST /api/v1/teams should create a team."""
    payload = {"name": "Test Fitness Crew", "description": "Our test team"}
    response = await client.post("/api/v1/teams/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Fitness Crew"
    assert data["invite_code"]
    assert data["member_count"] == 1


@pytest.mark.asyncio
async def test_list_teams(client: AsyncClient):
    """GET /api/v1/teams should list user's teams."""
    # Create a team first
    await client.post(
        "/api/v1/teams/", json={"name": "List Test Team"}
    )

    response = await client.get("/api/v1/teams/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_leaderboard(client: AsyncClient):
    """GET /api/v1/teams/{id}/leaderboard should return rankings."""
    # Create team
    create_resp = await client.post(
        "/api/v1/teams/", json={"name": "Leaderboard Team"}
    )
    team_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/teams/{team_id}/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert data["team_name"] == "Leaderboard Team"
    assert isinstance(data["entries"], list)
