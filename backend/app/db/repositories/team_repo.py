"""Team repository — data-access helpers for team tables."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.team import Team, TeamMember


async def get_by_id(session: AsyncSession, team_id: uuid.UUID) -> Team | None:
    stmt = (
        select(Team)
        .options(selectinload(Team.members))
        .where(Team.id == team_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_invite_code(session: AsyncSession, invite_code: str) -> Team | None:
    stmt = select(Team).where(Team.invite_code == invite_code)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create(session: AsyncSession, **kwargs) -> Team:
    team = Team(**kwargs)
    session.add(team)
    await session.flush()
    return team


async def add_member(
    session: AsyncSession,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    role: str = "member",
) -> TeamMember:
    member = TeamMember(team_id=team_id, user_id=user_id, role=role)
    session.add(member)
    await session.flush()
    return member


async def remove_member(
    session: AsyncSession, team_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    stmt = select(TeamMember).where(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    )
    result = await session.execute(stmt)
    member = result.scalar_one_or_none()
    if member:
        await session.delete(member)
        return True
    return False


async def list_user_teams(
    session: AsyncSession, user_id: uuid.UUID
) -> list[Team]:
    stmt = (
        select(Team)
        .join(TeamMember)
        .where(TeamMember.user_id == user_id)
        .options(selectinload(Team.members))
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
