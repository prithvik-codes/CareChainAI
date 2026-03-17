"""Report ORM model — represents a single uploaded medical document."""
from datetime import datetime, date
from sqlalchemy import String, Text, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import enum

from app.db.session import Base


class ReportType(str, enum.Enum):
    LAB = "lab"
    PRESCRIPTION = "prescription"
    MRI = "mri"
    XRAY = "xray"
    DISCHARGE = "discharge"
    OTHER = "other"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # File metadata
    original_filename: Mapped[str] = mapped_column(String(512))
    file_path: Mapped[str] = mapped_column(String(1024))
    file_type: Mapped[str] = mapped_column(String(16))  # pdf | image

    # AI-extracted fields
    report_type: Mapped[ReportType] = mapped_column(SAEnum(ReportType), default=ReportType.OTHER)
    report_date: Mapped[date | None] = mapped_column(Date)
    hospital_name: Mapped[str | None] = mapped_column(String(256))
    doctor_name: Mapped[str | None] = mapped_column(String(256))
    summary: Mapped[str | None] = mapped_column(Text)
    extracted_text: Mapped[str | None] = mapped_column(Text)

    status: Mapped[ProcessingStatus] = mapped_column(SAEnum(ProcessingStatus), default=ProcessingStatus.PENDING)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="reports")  # noqa: F821
    embeddings: Mapped[list["Embedding"]] = relationship("Embedding", back_populates="report", lazy="selectin")  # noqa: F821
