from uuid import UUID

from pydantic import EmailStr, Field

from .base import BaseAPIModel


class LoginRequest(BaseAPIModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterRequest(BaseAPIModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class TokenResponse(BaseAPIModel):
    access_token: str
    refresh_token: str
    expires_in: int = 0
    token_type: str = "bearer"


class RefreshTokenRequest(BaseAPIModel):
    refresh_token: str = Field(min_length=1)


class UserProfile(BaseAPIModel):
    id: UUID
    name: str
    email: EmailStr
    layout: str = Field(alias="activeLayout")
    current_level: int = 0
    created_at: str


class UpdateLayoutRequest(BaseAPIModel):
    layout: str