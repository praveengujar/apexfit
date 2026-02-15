"""Journal entry and impact routes."""

from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser
from app.core.exceptions import ConflictError
from app.db.repositories import journal_repo, user_repo
from app.db.session import get_session
from app.schemas.common import PaginatedResponse
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntryResponse,
    JournalImpact,
)

router = APIRouter()


@router.post("/", response_model=JournalEntryResponse)
async def submit_journal(
    body: JournalEntryCreate,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> JournalEntryResponse:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        user = await user_repo.create(
            session, firebase_uid=current_user.uid, email=current_user.email
        )

    existing = await journal_repo.get_by_user_and_date(session, user.id, body.date)
    if existing:
        raise ConflictError("Journal entry already exists for this date")

    entry = await journal_repo.create_entry(
        session,
        user.id,
        body.date,
        [r.model_dump() for r in body.responses],
    )
    # Reload with responses
    entry = await journal_repo.get_by_user_and_date(session, user.id, body.date)
    return JournalEntryResponse.model_validate(entry)


@router.get("/", response_model=PaginatedResponse[JournalEntryResponse])
async def get_journal_entries(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[JournalEntryResponse]:
    user = await user_repo.get_by_firebase_uid(session, current_user.uid)
    if not user:
        return PaginatedResponse.create([], 0, page, page_size)

    offset = (page - 1) * page_size
    entries, total = await journal_repo.list_entries(
        session, user.id, from_date=from_date, to_date=to_date,
        offset=offset, limit=page_size,
    )
    items = [JournalEntryResponse.model_validate(e) for e in entries]
    return PaginatedResponse.create(items, total, page, page_size)


@router.get("/impacts", response_model=list[JournalImpact])
async def get_journal_impacts(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[JournalImpact]:
    # Placeholder — full correlation analysis is done by JournalService
    return []
