"""
Reports routes: upload medical documents, list user reports.
File processing is delegated to the Orchestrator via a BackgroundTask.
Accepts optional metadata fields (report_date, report_type, hospital_name,
doctor_name) from the upload form — these override AI extraction when provided.
"""
import os
import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.report import Report, ReportType
from app.schemas.report import ReportOut
from app.api.deps import get_current_user
from app.agents.orchestrator import orchestrator
from app.core.config import settings

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/tiff": "image",
    "image/webp": "image",
}


@router.post("/upload", response_model=ReportOut, status_code=202)
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    # Optional user-provided metadata
    report_date: str | None = Form(None),
    report_type: str | None = Form(None),
    hospital_name: str | None = Form(None),
    doctor_name: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a medical document upload with optional metadata.
    Returns immediately (202 Accepted); AI processing runs in the background.
    User-provided fields take priority over AI-extracted values.
    """
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Allowed: PDF, JPEG, PNG, TIFF, WEBP",
        )

    # Check file size
    MAX_BYTES = settings.MAX_UPLOAD_MB * 1024 * 1024
    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit")

    # Save file with unique name
    upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "file").suffix or (".pdf" if "pdf" in content_type else ".jpg")
    dest = upload_dir / f"{uuid.uuid4()}{ext}"

    with open(dest, "wb") as f:
        f.write(file_bytes)

    # Parse user-provided date
    parsed_date = None
    if report_date:
        try:
            parsed_date = date.fromisoformat(report_date)
        except ValueError:
            pass

    # Parse user-provided report type
    parsed_type = ReportType.OTHER
    if report_type:
        try:
            parsed_type = ReportType(report_type)
        except ValueError:
            pass

    # Create Report row — pre-fill with user-provided metadata
    report = Report(
        user_id=current_user.id,
        original_filename=file.filename or dest.name,
        file_path=str(dest),
        file_type=ALLOWED_TYPES[content_type],
        # User-provided metadata (AI will fill remaining gaps)
        report_date=parsed_date,
        report_type=parsed_type,
        hospital_name=hospital_name or None,
        doctor_name=doctor_name or None,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Kick off background AI processing
    background_tasks.add_task(
        _run_orchestrator,
        report_id=report.id,
        file_path=str(dest),
        # Pass user-supplied fields so orchestrator won't overwrite them
        user_metadata={
            "report_date": parsed_date,
            "report_type": parsed_type,
            "hospital_name": hospital_name,
            "doctor_name": doctor_name,
        }
    )

    return report


async def _run_orchestrator(report_id: int, file_path: str, user_metadata: dict):
    """Background task wrapper — creates its own DB session."""
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await orchestrator.process_report(
            report_id, file_path, db, user_metadata=user_metadata
        )


@router.get("/", response_model=list[ReportOut])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Report).where(Report.user_id == current_user.id).order_by(Report.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = await db.get(Report, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = await db.get(Report, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete embeddings first to avoid NOT NULL constraint error
    from sqlalchemy import delete as sql_delete
    from app.models.embedding import Embedding
    await db.execute(sql_delete(Embedding).where(Embedding.report_id == report_id))

    # Delete file from disk
    try:
        os.remove(report.file_path)
    except FileNotFoundError:
        pass

    await db.delete(report)
    await db.commit()