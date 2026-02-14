"""Team management and leaderboard routes."""

from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.db.repositories import team_repo, user_repo
from app.db.session import get_session
from app.schemas.team import (
    LeaderboardResponse,
    TeamCreate,
    TeamMemberResponse,
    TeamResponse,
)
from app.services.team_service import build_leaderboard

router = APIRouter()


@router.post("/", response_model=TeamResponse)
async def create_team(
    body: TeamCreate,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TeamResponse:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    invite_code = secrets.token_urlsafe(8)[:8].upper()
    team = await team_repo.create(
        session,
        name=body.name,
        description=body.description,
        invite_code=invite_code,
        owner_id=user.id,
    )
    # Auto-add creator as admin
    await team_repo.add_member(session, team.id, user.id, role="admin")

    resp = TeamResponse.model_validate(team)
    resp.member_count = 1
    return resp


@router.post("/{invite_code}/join", response_model=TeamResponse)
async def join_team(
    invite_code: str,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TeamResponse:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    team = await team_repo.get_by_invite_code(session, invite_code)
    if not team:
        raise NotFoundError("Team", invite_code)

    # Check if already a member
    team_full = await team_repo.get_by_id(session, team.id)
    if team_full and any(m.user_id == user.id for m in team_full.members):
        raise ConflictError("Already a member of this team")

    await team_repo.add_member(session, team.id, user.id)
    team_full = await team_repo.get_by_id(session, team.id)

    resp = TeamResponse.model_validate(team_full)
    resp.member_count = len(team_full.members) if team_full else 0
    return resp


@router.get("/", response_model=list[TeamResponse])
async def list_my_teams(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[TeamResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return []

    teams = await team_repo.list_user_teams(session, user.id)
    results = []
    for t in teams:
        resp = TeamResponse.model_validate(t)
        resp.member_count = len(t.members)
        results.append(resp)
    return results


@router.get("/{team_id}/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    team_id: uuid.UUID,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LeaderboardResponse:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        raise NotFoundError("User")

    team = await team_repo.get_by_id(session, team_id)
    if not team:
        raise NotFoundError("Team")

    if not any(m.user_id == user.id for m in team.members):
        raise ForbiddenError("Not a member of this team")

    return await build_leaderboard(session, team)
