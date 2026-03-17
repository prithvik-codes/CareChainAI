"""Report-related Pydantic schemas."""
from datetime import date, datetime
from pydantic import BaseModel
from app.models.report import ReportType, ProcessingStatus


class ReportOut(BaseModel):
    id: int
    original_filename: str
    file_type: str
    report_type: ReportType
    report_date: date | None
    hospital_name: str | None
    doctor_name: str | None
    summary: str | None
    status: ProcessingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineEntry(BaseModel):
    id: int
    report_date: date | None
    report_type: ReportType
    hospital_name: str | None
    summary: str | None
    original_filename: str

    model_config = {"from_attributes": True}
