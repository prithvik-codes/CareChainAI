"""Auth-related Pydantic request/response schemas."""
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.PATIENT


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    name: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    blood_group: str | None
    allergies: str | None
    emergency_contact: str | None
    current_medications: str | None

    model_config = {"from_attributes": True}
