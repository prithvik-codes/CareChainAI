"""Medication tracker CRUD routes."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
# CORRECT
from app.models.medication import Medication
from app.api.deps import get_current_user

router = APIRouter()


class MedicationIn(BaseModel):
    name:          str
    dosage:        str
    frequency:     str
    start_date:    str
    end_date:      str | None = None
    prescribed_by: str | None = None
    notes:         str | None = None
    is_active:     bool = True


class MedicationOut(BaseModel):
    id:            int
    user_id:       int
    name:          str
    dosage:        str
    frequency:     str
    start_date:    str
    end_date:      str | None
    prescribed_by: str | None
    notes:         str | None
    is_active:     bool
    created_at:    str
    model_config = {"from_attributes": True}


@router.post("/", response_model=MedicationOut, status_code=201)
async def add_medication(
    body: MedicationIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = Medication(
        user_id=current_user.id,
        name=body.name,
        dosage=body.dosage,
        frequency=body.frequency,
        start_date=date.fromisoformat(body.start_date),
        end_date=date.fromisoformat(body.end_date) if body.end_date else None,
        prescribed_by=body.prescribed_by,
        notes=body.notes,
        is_active=body.is_active,
    )
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return _to_out(med)


@router.get("/", response_model=list[MedicationOut])
async def list_medications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Medication)
        .where(Medication.user_id == current_user.id)
        .order_by(Medication.is_active.desc(), Medication.start_date.desc())
    )
    return [_to_out(m) for m in result.scalars().all()]


@router.patch("/{med_id}/toggle", response_model=MedicationOut)
async def toggle_medication(
    med_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = await db.get(Medication, med_id)
    if not med or med.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    med.is_active = not med.is_active
    await db.commit()
    await db.refresh(med)
    return _to_out(med)


@router.delete("/{med_id}", status_code=204)
async def delete_medication(
    med_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = await db.get(Medication, med_id)
    if not med or med.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(med)
    await db.commit()


def _to_out(m: Medication) -> dict:
    return {
        "id": m.id, "user_id": m.user_id,
        "name": m.name, "dosage": m.dosage, "frequency": m.frequency,
        "start_date": str(m.start_date),
        "end_date": str(m.end_date) if m.end_date else None,
        "prescribed_by": m.prescribed_by, "notes": m.notes,
        "is_active": m.is_active, "created_at": str(m.created_at),
    }