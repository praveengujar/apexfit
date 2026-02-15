"""Initial schema — all tables.

Revision ID: 001
Revises:
Create Date: 2025-01-15 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), nullable=False, unique=True, index=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("biological_sex", sa.String(20), nullable=True),
        sa.Column("height_cm", sa.Float, nullable=True),
        sa.Column("weight_kg", sa.Float, nullable=True),
        sa.Column("max_heart_rate", sa.Integer, nullable=True),
        sa.Column("sleep_baseline_hours", sa.Float, nullable=True),
        sa.Column("preferred_units", sa.String(20), server_default="metric"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # --- daily_metrics ---
    op.create_table(
        "daily_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("recovery_score", sa.Float, nullable=True),
        sa.Column("recovery_zone", sa.String(20), nullable=True),
        sa.Column("strain_score", sa.Float, nullable=True),
        sa.Column("sleep_performance", sa.Float, nullable=True),
        sa.Column("hrv_rmssd", sa.Float, nullable=True),
        sa.Column("hrv_sdnn", sa.Float, nullable=True),
        sa.Column("resting_heart_rate", sa.Float, nullable=True),
        sa.Column("respiratory_rate", sa.Float, nullable=True),
        sa.Column("spo2", sa.Float, nullable=True),
        sa.Column("steps", sa.Integer, nullable=True),
        sa.Column("active_calories", sa.Float, nullable=True),
        sa.Column("vo2_max", sa.Float, nullable=True),
        sa.Column("sleep_duration_hours", sa.Float, nullable=True),
        sa.Column("sleep_need_hours", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "date", name="uq_daily_metrics_user_date"),
    )

    # --- workouts ---
    op.create_table(
        "workouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("daily_metric_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_metrics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("workout_type", sa.String(100), nullable=True),
        sa.Column("workout_name", sa.String(255), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Float, nullable=True),
        sa.Column("strain_score", sa.Float, nullable=True),
        sa.Column("average_heart_rate", sa.Float, nullable=True),
        sa.Column("max_heart_rate", sa.Float, nullable=True),
        sa.Column("active_calories", sa.Float, nullable=True),
        sa.Column("zone1_minutes", sa.Float, nullable=True),
        sa.Column("zone2_minutes", sa.Float, nullable=True),
        sa.Column("zone3_minutes", sa.Float, nullable=True),
        sa.Column("zone4_minutes", sa.Float, nullable=True),
        sa.Column("zone5_minutes", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- sleep_sessions ---
    op.create_table(
        "sleep_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("daily_metric_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_metrics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_main_sleep", sa.Boolean, server_default="true"),
        sa.Column("total_sleep_minutes", sa.Integer, nullable=True),
        sa.Column("light_minutes", sa.Integer, nullable=True),
        sa.Column("deep_minutes", sa.Integer, nullable=True),
        sa.Column("rem_minutes", sa.Integer, nullable=True),
        sa.Column("awake_minutes", sa.Integer, nullable=True),
        sa.Column("sleep_efficiency", sa.Float, nullable=True),
        sa.Column("sleep_performance", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- journal_entries ---
    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "date", name="uq_journal_entries_user_date"),
    )

    # --- journal_responses ---
    op.create_table(
        "journal_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("behavior_key", sa.String(100), nullable=False),
        sa.Column("response_type", sa.String(20), nullable=False),
        sa.Column("bool_value", sa.Boolean, nullable=True),
        sa.Column("numeric_value", sa.Float, nullable=True),
        sa.Column("scale_value", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- coach_conversations ---
    op.create_table(
        "coach_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- coach_messages ---
    op.create_table(
        "coach_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coach_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- teams ---
    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("invite_code", sa.String(20), nullable=False, unique=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_teams_invite_code", "teams", ["invite_code"])

    # --- team_members ---
    op.create_table(
        "team_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
    )

    # --- healthspan_scores ---
    op.create_table(
        "healthspan_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("vitalos_age", sa.Float, nullable=False),
        sa.Column("biological_age", sa.Float, nullable=True),
        sa.Column("cardiovascular_score", sa.Float, nullable=True),
        sa.Column("recovery_score", sa.Float, nullable=True),
        sa.Column("sleep_score", sa.Float, nullable=True),
        sa.Column("activity_score", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "date", name="uq_healthspan_scores_user_date"),
    )

    # --- notification_preferences ---
    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_type", sa.String(50), nullable=False),
        sa.Column("enabled", sa.Boolean, server_default="true"),
        sa.Column("preferred_time", sa.Time, nullable=True),
        sa.Column("device_token", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "notification_type", name="uq_notification_prefs_user_type"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_table("healthspan_scores")
    op.drop_table("team_members")
    op.drop_table("teams")
    op.drop_table("coach_messages")
    op.drop_table("coach_conversations")
    op.drop_table("journal_responses")
    op.drop_table("journal_entries")
    op.drop_table("sleep_sessions")
    op.drop_table("workouts")
    op.drop_table("daily_metrics")
    op.drop_table("users")
