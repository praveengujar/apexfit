"""Coach service — AI coach RAG pipeline (placeholder)."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import coach_repo, metrics_repo
from app.models.coach import CoachMessage

logger = logging.getLogger(__name__)


async def generate_response(
    session: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_message: str,
) -> CoachMessage:
    """Generate an AI coach response.

    In production this would:
    1. Retrieve recent metrics as context (RAG).
    2. Build a prompt with user history.
    3. Call Vertex AI (Gemini) or Claude API.
    4. Return the generated response.

    Currently returns a contextual placeholder.
    """
    # Fetch recent metrics for context
    from datetime import date, timedelta

    today = date.today()
    week_ago = today - timedelta(days=7)
    recent_metrics, _ = await metrics_repo.list_by_date_range(
        session, user_id, week_ago, today, limit=7
    )

    # Build context summary
    if recent_metrics:
        avg_recovery = sum(
            m.recovery_score for m in recent_metrics if m.recovery_score
        ) / max(1, sum(1 for m in recent_metrics if m.recovery_score))
        context = f"Your average recovery this week is {avg_recovery:.0f}%. "
    else:
        context = "I don't have recent metrics to analyze yet. "

    # Placeholder AI response
    response_text = (
        f"{context}"
        f"Based on your question: '{user_message[:100]}', "
        "I recommend maintaining consistent sleep habits and "
        "adjusting your training intensity based on your daily recovery score."
    )

    return await coach_repo.add_message(
        session, conversation_id, "assistant", response_text
    )
