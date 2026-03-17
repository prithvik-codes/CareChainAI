"""
Preview endpoint — extracts metadata from an uploaded file WITHOUT saving it.
Used by the frontend to auto-fill the upload form fields before final submission.
"""
import os
import uuid
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from pydantic import BaseModel

from app.models.user import User
from app.api.deps import get_current_user
from app.agents.ingestion_agent import IngestionAgent
from app.agents.timeline_agent import TimelineAgent

router = APIRouter()

ingestion = IngestionAgent()
timeline  = TimelineAgent()


class PreviewResult(BaseModel):
    report_date:   str | None
    report_type:   str | None
    hospital_name: str | None
    doctor_name:   str | None
    medications:   list[str]
    summary:       str | None
    confidence:    str   # "high" | "medium" | "low"


@router.post("/preview", response_model=PreviewResult)
async def preview_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Run ingestion + timeline agents on the uploaded file and return
    extracted metadata — does NOT save anything to DB or disk permanently.
    """
    ALLOWED = {
        "application/pdf", "image/jpeg", "image/png",
        "image/tiff", "image/webp",
    }
    if (file.content_type or "") not in ALLOWED:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    # Write to a temp file so agents can read it
    suffix = Path(file.filename or "file").suffix or ".tmp"
    file_bytes = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # Step 1 — Extract text
        ingestion_result = ingestion.run(tmp_path)
        if not ingestion_result["success"] or not ingestion_result["clean_text"].strip():
            return PreviewResult(
                report_date=None,
                report_type="other",
                hospital_name=None,
                doctor_name=None,
                medications=[],
                summary=None,
                confidence="low",
            )

        clean_text = ingestion_result["clean_text"]

        # Step 2 — Extract metadata
        meta = timeline.run(clean_text)

        # Determine confidence based on how many fields were found
        found = sum([
            bool(meta["report_date"]),
            bool(meta["hospital_name"]),
            bool(meta["doctor_name"]),
            meta["report_type"] != "other",
        ])
        confidence = "high" if found >= 3 else "medium" if found >= 1 else "low"

        return PreviewResult(
            report_date=meta["report_date"].isoformat() if meta["report_date"] else None,
            report_type=meta["report_type"],
            hospital_name=meta["hospital_name"],
            doctor_name=meta["doctor_name"],
            medications=meta["medications"],
            summary=meta["summary"],
            confidence=confidence,
        )

    finally:
        # Always clean up temp file
        try:
            os.remove(tmp_path)
        except Exception:
            pass