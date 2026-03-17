"""Appointments CRUD routes."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
# CORRECT
from app.models.appointment import Appointment, AppointmentStatus
from app.api.deps import get_current_user

router = APIRouter()


class AppointmentIn(BaseModel):
    doctor_name: str
    hospital:    str | None = None
    specialty:   str | None = None
    date:        str
    time:        str | None = None
    reason:      str | None = None
    notes:       str | None = None


class AppointmentOut(BaseModel):
    id:          int
    user_id:     int
    doctor_name: str
    hospital:    str | None
    specialty:   str | None
    date:        str
    time:        str | None
    reason:      str | None
    notes:       str | None
    status:      str
    created_at:  str
    model_config = {"from_attributes": True}


@router.post("/", response_model=AppointmentOut, status_code=201)
async def book_appointment(
    body: AppointmentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = Appointment(
        user_id=current_user.id,
        doctor_name=body.doctor_name,
        hospital=body.hospital,
        specialty=body.specialty,
        date=date.fromisoformat(body.date),
        time=body.time,
        reason=body.reason,
        notes=body.notes,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return _to_out(appt)


@router.get("/", response_model=list[AppointmentOut])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment)
        .where(Appointment.user_id == current_user.id)
        .order_by(Appointment.date.asc())
    )
    return [_to_out(a) for a in result.scalars().all()]


@router.patch("/{appt_id}/status", response_model=AppointmentOut)
async def update_status(
    appt_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = await db.get(Appointment, appt_id)
    if not appt or appt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    appt.status = AppointmentStatus(status)
    await db.commit()
    await db.refresh(appt)
    return _to_out(appt)


@router.delete("/{appt_id}", status_code=204)
async def delete_appointment(
    appt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = await db.get(Appointment, appt_id)
    if not appt or appt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(appt)
    await db.commit()


def _to_out(a: Appointment) -> dict:
    return {
        "id": a.id, "user_id": a.user_id,
        "doctor_name": a.doctor_name, "hospital": a.hospital,
        "specialty": a.specialty, "date": str(a.date),
        "time": a.time, "reason": a.reason, "notes": a.notes,
        "status": a.status.value, "created_at": str(a.created_at),
    }