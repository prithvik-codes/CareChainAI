"""Medication tracker ORM model."""
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class Medication(Base):
    __tablename__ = "medications"

    id:            Mapped[int]           = mapped_column(primary_key=True, index=True)
    user_id:       Mapped[int]           = mapped_column(ForeignKey("users.id"), index=True)
    name:          Mapped[str]           = mapped_column(String(256))
    dosage:        Mapped[str]           = mapped_column(String(128))
    frequency:     Mapped[str]           = mapped_column(String(128))
    start_date:    Mapped[date]          = mapped_column(Date)
    end_date:      Mapped[date | None]   = mapped_column(Date, nullable=True)
    prescribed_by: Mapped[str | None]    = mapped_column(String(256))
    notes:         Mapped[str | None]    = mapped_column(String(512))
    is_active:     Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())