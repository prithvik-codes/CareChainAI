"""Timeline API route — returns chronological health events for the current user."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.report import Report, ProcessingStatus
from app.schemas.report import TimelineEntry
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=list[TimelineEntry])
async def get_timeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all processed reports sorted by report_date ascending."""
    result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user.id)
        .where(Report.status == ProcessingStatus.DONE)
        .order_by(Report.report_date.asc().nulls_last())
    )
    return result.scalars().all()
