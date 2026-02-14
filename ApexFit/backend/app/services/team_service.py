"""Team service — leaderboard computation and team management."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_metric import DailyMetric
from app.models.team import Team
from app.models.user import User
from app.schemas.team import LeaderboardEntry, LeaderboardResponse


async def build_leaderboard(
    session: AsyncSession, team: Team
) -> LeaderboardResponse:
    """Build a leaderboard for a team from today's metrics."""
    today = date.today()
    entries: list[LeaderboardEntry] = []

    for member in team.members:
        # Fetch today's metric for this member
        stmt = select(DailyMetric).where(
            DailyMetric.user_id == member.user_id,
            DailyMetric.date == today,
        )
        result = await session.execute(stmt)
        metric = result.scalar_one_or_none()

        # Fetch display name
        user = await session.get(User, member.user_id)

        entries.append(
            LeaderboardEntry(
                user_id=member.user_id,
                display_name=user.display_name if user else None,
                rank=0,  # Will be set after sorting
                recovery_score=metric.recovery_score if metric else None,
                strain_score=metric.strain_score if metric else None,
            )
        )

    # Sort by recovery score descending (None values last)
    entries.sort(
        key=lambda e: e.recovery_score if e.recovery_score is not None else -1,
        reverse=True,
    )
    for i, entry in enumerate(entries):
        entry.rank = i + 1

    return LeaderboardResponse(
        team_id=team.id,
        team_name=team.name,
        entries=entries,
        updated_at=datetime.now(timezone.utc),
    )
