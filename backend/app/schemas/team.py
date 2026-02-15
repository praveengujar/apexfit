"""Team Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    invite_code: str
    owner_id: uuid.UUID
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class TeamMemberResponse(BaseModel):
    user_id: uuid.UUID
    display_name: str | None
    role: str
    joined_at: datetime


class LeaderboardEntry(BaseModel):
    user_id: uuid.UUID
    display_name: str | None
    rank: int
    recovery_score: float | None
    strain_score: float | None


class LeaderboardResponse(BaseModel):
    team_id: uuid.UUID
    team_name: str
    entries: list[LeaderboardEntry]
    updated_at: datetime
