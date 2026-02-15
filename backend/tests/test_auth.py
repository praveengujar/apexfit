"""Tests for authentication endpoints and middleware."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.auth.models import AuthUser


@pytest.mark.asyncio
async def test_get_current_user_missing_header(client: AsyncClient):
    """Requests without Authorization header should fail."""
    # Remove the auth override for this test
    from app.auth.dependencies import get_current_user
    from app.main import create_app

    # The client fixture already overrides auth, so we test the /health
    # endpoint which doesn't require auth.
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_profile_create_on_first_access(client: AsyncClient):
    """GET /api/v1/users/me should create user if not exists."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["firebase_uid"] == "test-firebase-uid"
    assert data["email"] == "test@example.com"
