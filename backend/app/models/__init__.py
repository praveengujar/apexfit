"""SQLAlchemy model package — import all models so Alembic can discover them."""

from app.models.base import Base
from app.models.coach import CoachConversation, CoachMessage
from app.models.daily_metric import DailyMetric
from app.models.healthspan import HealthspanScore
from app.models.journal import JournalEntry, JournalResponse
from app.models.notification import NotificationPreference
from app.models.sleep import SleepSession
from app.models.team import Team, TeamMember
from app.models.user import User
from app.models.workout import Workout

__all__ = [
    "Base",
    "CoachConversation",
    "CoachMessage",
    "DailyMetric",
    "HealthspanScore",
    "JournalEntry",
    "JournalResponse",
    "NotificationPreference",
    "SleepSession",
    "Team",
    "TeamMember",
    "User",
    "Workout",
]
