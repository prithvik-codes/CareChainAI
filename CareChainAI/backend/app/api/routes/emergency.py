"""
Emergency profile routes.
  GET  /emergency/profile       — authenticated user fetches their own profile
  PUT  /emergency/profile       — update emergency info
  GET  /emergency/qr            — generate a signed QR code URL
  GET  /emergency/public/{token} — public read-only view (no auth required)
"""
import base64
import hashlib
import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmergencyProfileIn(BaseModel):
    blood_group: str | None = None
    allergies: str | None = None
    emergency_contact: str | None = None
    current_medications: str | None = None


class EmergencyProfileOut(BaseModel):
    name: str
    blood_group: str | None
    allergies: str | None
    emergency_contact: str | None
    current_medications: str | None

    model_config = {"from_attributes": True}


class QRResponse(BaseModel):
    token: str
    url: str
    expires_at: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_token(user_id: int, secret: str) -> str:
    """
    Simple signed token: base64( user_id | timestamp | hmac_signature )
    For production use proper signing (e.g. itsdangerous).
    """
    expires = int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp())
    payload = f"{user_id}:{expires}"
    sig = hashlib.sha256(f"{payload}:{secret}".encode()).hexdigest()[:16]
    raw = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_token(token: str, secret: str) -> int:
    """Returns user_id or raises HTTPException."""
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        user_id_str, expires_str, sig = raw.rsplit(":", 2)
        payload = f"{user_id_str}:{expires_str}"
        expected_sig = hashlib.sha256(f"{payload}:{secret}".encode()).hexdigest()[:16]
        if sig != expected_sig:
            raise ValueError("Bad signature")
        if int(expires_str) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("Token expired")
        return int(user_id_str)
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid or expired emergency token")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=EmergencyProfileOut)
async def get_emergency_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=EmergencyProfileOut)
async def update_emergency_profile(
    body: EmergencyProfileIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/qr", response_model=QRResponse)
async def generate_qr(current_user: User = Depends(get_current_user)):
    token = _make_token(current_user.id, settings.SECRET_KEY)
    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    url = f"/emergency/public/{token}"
    return QRResponse(token=token, url=url, expires_at=expires)


@router.get("/public/{token}", response_model=EmergencyProfileOut)
async def public_emergency_view(token: str, db: AsyncSession = Depends(get_db)):
    """No authentication required — anyone with the QR token can view critical info."""
    user_id = _decode_token(token, settings.SECRET_KEY)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    return user
