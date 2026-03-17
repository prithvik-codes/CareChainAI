"""Vital signs CRUD routes."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
# CORRECT
from app.models.vital import VitalSign
from app.api.deps import get_current_user

router = APIRouter()


class VitalIn(BaseModel):
    recorded_at:         str | None = None
    blood_pressure_sys:  float | None = None
    blood_pressure_dia:  float | None = None
    heart_rate:          float | None = None
    blood_sugar:         float | None = None
    weight:              float | None = None
    temperature:         float | None = None
    oxygen_saturation:   float | None = None
    notes:               str | None = None


class VitalOut(VitalIn):
    id: int
    user_id: int
    created_at: str
    model_config = {"from_attributes": True}


@router.post("/", response_model=VitalOut, status_code=201)
async def add_vital(
    body: VitalIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rec_date = date.fromisoformat(body.recorded_at) if body.recorded_at else date.today()
    vital = VitalSign(
        user_id=current_user.id,
        recorded_at=rec_date,
        **{k: v for k, v in body.model_dump(exclude={"recorded_at"}).items() if v is not None},
    )
    db.add(vital)
    await db.commit()
    await db.refresh(vital)
    return _to_out(vital)


@router.get("/", response_model=list[VitalOut])
async def list_vitals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VitalSign)
        .where(VitalSign.user_id == current_user.id)
        .order_by(VitalSign.recorded_at.desc())
    )
    return [_to_out(v) for v in result.scalars().all()]


@router.delete("/{vital_id}", status_code=204)
async def delete_vital(
    vital_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vital = await db.get(VitalSign, vital_id)
    if not vital or vital.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(vital)
    await db.commit()


def _to_out(v: VitalSign) -> dict:
    return {
        "id": v.id, "user_id": v.user_id,
        "recorded_at": str(v.recorded_at),
        "blood_pressure_sys": v.blood_pressure_sys,
        "blood_pressure_dia": v.blood_pressure_dia,
        "heart_rate": v.heart_rate,
        "blood_sugar": v.blood_sugar,
        "weight": v.weight,
        "temperature": v.temperature,
        "oxygen_saturation": v.oxygen_saturation,
        "notes": v.notes,
        "created_at": str(v.created_at),
    }