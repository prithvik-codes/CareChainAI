"""Audit log ORM model — tracks all user actions."""
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id:         Mapped[int]      = mapped_column(primary_key=True, index=True)
    user_id:    Mapped[int]      = mapped_column(ForeignKey("users.id"), index=True)
    action:     Mapped[str]      = mapped_column(String(64))    # e.g. "upload", "view", "delete", "ask_ai"
    resource:   Mapped[str]      = mapped_column(String(64))    # e.g. "report", "timeline"
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detail:     Mapped[str | None]  = mapped_column(String(512))
    ip_address: Mapped[str | None]  = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())