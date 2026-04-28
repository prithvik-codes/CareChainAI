from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.report import Report
from app.models.vital import Vital
from app.models.medication import Medication
from app.models.appointment import Appointment
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch Reports
    report_stmt = select(Report).where(Report.user_id == current_user.id).order_by(Report.id.desc())
    report_result = await db.execute(report_stmt)
    reports = report_result.scalars().all()

    # Fetch Vitals
    vitals_stmt = select(Vital).where(Vital.user_id == current_user.id).order_by(Vital.recorded_at.desc())
    vitals_result = await db.execute(vitals_stmt)
    vitals = vitals_result.scalars().all()

    # Fetch Medications
    meds_stmt = select(Medication).where(Medication.user_id == current_user.id)
    meds_result = await db.execute(meds_stmt)
    medications = meds_result.scalars().all()

    # Fetch Appointments
    appt_stmt = select(Appointment).where(Appointment.user_id == current_user.id).order_by(Appointment.date.asc())
    appt_result = await db.execute(appt_stmt)
    appointments = appt_result.scalars().all()

    return {
        "reports": reports,
        "vitals": vitals,
        "medications": medications,
        "appointments": appointments,
    }
