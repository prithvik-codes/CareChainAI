"""Vital signs ORM model."""
from datetime import datetime, date
from sqlalchemy import String, Float, Date, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class VitalSign(Base):
    __tablename__ = "vital_signs"

    id:           Mapped[int]          = mapped_column(primary_key=True, index=True)
    user_id:      Mapped[int]          = mapped_column(ForeignKey("users.id"), index=True)
    recorded_at:  Mapped[date]         = mapped_column(Date, default=date.today)
    created_at:   Mapped[datetime]     = mapped_column(DateTime, server_default=func.now())

    # Vitals
    blood_pressure_sys:  Mapped[float | None] = mapped_column(Float)   # mmHg systolic
    blood_pressure_dia:  Mapped[float | None] = mapped_column(Float)   # mmHg diastolic
    heart_rate:          Mapped[float | None] = mapped_column(Float)   # bpm
    blood_sugar:         Mapped[float | None] = mapped_column(Float)   # mg/dL
    weight:              Mapped[float | None] = mapped_column(Float)   # kg
    temperature:         Mapped[float | None] = mapped_column(Float)   # °C
    oxygen_saturation:   Mapped[float | None] = mapped_column(Float)   # %
    notes:               Mapped[str | None]   = mapped_column(String(512))