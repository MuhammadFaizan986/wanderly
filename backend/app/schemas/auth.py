import uuid
from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.models.enums import UserRole
from app.schemas.common import ApiModel


class UserRead(ApiModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    created_at: datetime


class RegisterRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)

    @field_validator("full_name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name is required")
        return value

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        if value.isdigit() or value.isalpha():
            raise ValueError("Use a mix of letters and numbers or symbols")
        return value


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(ApiModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105
    expires_in: int
    user: UserRead
