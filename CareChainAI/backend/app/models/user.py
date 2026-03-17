"""User ORM model."""
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import enum

from app.db.session import Base


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.PATIENT)

    # Emergency profile fields
    blood_group: Mapped[str | None] = mapped_column(String(10))
    allergies: Mapped[str | None] = mapped_column(String(1024))
    emergency_contact: Mapped[str | None] = mapped_column(String(256))
    current_medications: Mapped[str | None] = mapped_column(String(2048))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="owner", lazy="selectin")  # noqa: F821
