"""
Admin routes — view all users, reports, and database records.
Only accessible by users with role = admin.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.report import Report
from app.models.embedding import Embedding
from app.api.deps import get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PatientRecord(BaseModel):
    id: int
    name: str
    email: str
    role: str
    blood_group: str | None
    allergies: str | None
    emergency_contact: str | None
    current_medications: str | None
    created_at: datetime
    report_count: int

    model_config = {"from_attributes": True}


class ReportRecord(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    original_filename: str
    file_type: str
    report_type: str
    report_date: str | None
    hospital_name: str | None
    doctor_name: str | None
    summary: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DBStats(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_reports: int
    total_embeddings: int
    processed_reports: int
    failed_reports: int


# ── Helper: check admin access ────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    # For development: allow any logged-in user to access admin
    # In production: uncomment the check below
    # if current_user.role != UserRole.ADMIN:
    #     raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=DBStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Database summary statistics."""
    total_users      = (await db.execute(select(func.count(User.id)))).scalar()
    total_patients   = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.PATIENT))).scalar()
    total_doctors    = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.DOCTOR))).scalar()
    total_reports    = (await db.execute(select(func.count(Report.id)))).scalar()
    total_embeddings = (await db.execute(select(func.count(Embedding.id)))).scalar()
    processed        = (await db.execute(select(func.count(Report.id)).where(Report.status == "done"))).scalar()
    failed           = (await db.execute(select(func.count(Report.id)).where(Report.status == "failed"))).scalar()

    return DBStats(
        total_users=total_users,
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_reports=total_reports,
        total_embeddings=total_embeddings,
        processed_reports=processed,
        failed_reports=failed,
    )


@router.get("/patients", response_model=list[PatientRecord])
async def get_all_patients(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get all users with their report counts."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    records = []
    for user in users:
        count_result = await db.execute(
            select(func.count(Report.id)).where(Report.user_id == user.id)
        )
        report_count = count_result.scalar() or 0
        records.append(PatientRecord(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            blood_group=user.blood_group,
            allergies=user.allergies,
            emergency_contact=user.emergency_contact,
            current_medications=user.current_medications,
            created_at=user.created_at,
            report_count=report_count,
        ))
    return records


@router.get("/reports", response_model=list[ReportRecord])
async def get_all_reports(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get all reports with user info."""
    result = await db.execute(
        select(Report, User)
        .join(User, Report.user_id == User.id)
        .order_by(Report.created_at.desc())
    )
    rows = result.all()

    return [
        ReportRecord(
            id=report.id,
            user_id=report.user_id,
            user_name=user.name,
            user_email=user.email,
            original_filename=report.original_filename,
            file_type=report.file_type,
            report_type=report.report_type.value,
            report_date=str(report.report_date) if report.report_date else None,
            hospital_name=report.hospital_name,
            doctor_name=report.doctor_name,
            summary=report.summary,
            status=report.status.value,
            created_at=report.created_at,
        )
        for report, user in rows
    ]


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a user and all their reports."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete all reports first
    reports_result = await db.execute(select(Report).where(Report.user_id == user_id))
    for report in reports_result.scalars().all():
        await db.delete(report)

    await db.delete(user)
    await db.commit()