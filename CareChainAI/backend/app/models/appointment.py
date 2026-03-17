"""Appointment ORM model."""
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class AppointmentStatus(str, enum.Enum):
    UPCOMING  = "upcoming"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Appointment(Base):
    __tablename__ = "appointments"

    id:           Mapped[int]               = mapped_column(primary_key=True, index=True)
    user_id:      Mapped[int]               = mapped_column(ForeignKey("users.id"), index=True)
    doctor_name:  Mapped[str]               = mapped_column(String(256))
    hospital:     Mapped[str | None]        = mapped_column(String(256))
    specialty:    Mapped[str | None]        = mapped_column(String(128))
    date:         Mapped[date]              = mapped_column(Date)
    time:         Mapped[str | None]        = mapped_column(String(16))   # "10:30 AM"
    reason:       Mapped[str | None]        = mapped_column(String(512))
    notes:        Mapped[str | None]        = mapped_column(Text)
    status:       Mapped[AppointmentStatus] = mapped_column(SAEnum(AppointmentStatus), default=AppointmentStatus.UPCOMING)
    created_at:   Mapped[datetime]          = mapped_column(DateTime, server_default=func.now())