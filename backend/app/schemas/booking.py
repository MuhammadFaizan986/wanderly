import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.models.enums import BookingStatus
from app.schemas.common import ApiModel
from app.schemas.flight import FlightOffer

_PHONE = re.compile(r"^\+[1-9]\d{6,14}$")
_NAME = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$")


def _clean_phone(value: str) -> str:
    value = re.sub(r"[\s()-]", "", value)
    if not _PHONE.fullmatch(value):
        raise ValueError("Use international format, e.g. +923001234567")
    return value


class PassengerInput(ApiModel):
    id: str = Field(description="Passenger id from the offer")
    title: Literal["mr", "ms", "mrs", "miss", "dr"]
    given_name: str = Field(min_length=1, max_length=50)
    family_name: str = Field(min_length=1, max_length=50)
    gender: Literal["m", "f"]
    born_on: date

    @field_validator("given_name", "family_name")
    @classmethod
    def _name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not _NAME.fullmatch(value):
            raise ValueError("Use letters only, as shown on the passport")
        return value


class BookingCreate(ApiModel):
    offer_id: str
    expected_total_amount: Decimal = Field(
        description="The price the traveler saw; booking stops if the fare has changed"
    )
    passengers: list[PassengerInput] = Field(min_length=1, max_length=13)
    contact_email: EmailStr
    contact_phone: str

    @field_validator("contact_phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        return _clean_phone(value)


class BookedPassenger(ApiModel):
    id: str
    type: str
    title: str
    given_name: str
    family_name: str
    gender: str
    born_on: date


class BookingRead(ApiModel):
    id: uuid.UUID
    booking_reference: str | None
    order_id: str | None = Field(validation_alias="duffel_order_id")
    status: BookingStatus
    total_amount: Decimal
    currency: str
    origin: str
    destination: str
    departure_at: datetime
    return_at: datetime | None
    passengers: list[BookedPassenger]
    contact_email: str | None = None
    offer: FlightOffer = Field(validation_alias="raw_offer")
    created_at: datetime
    source: Literal["duffel", "sample"] = "sample"


class BookingSummary(ApiModel):
    id: uuid.UUID
    booking_reference: str | None
    status: BookingStatus
    total_amount: Decimal
    currency: str
    origin: str
    destination: str
    origin_city: str
    destination_city: str
    departure_at: datetime
    return_at: datetime | None
    passenger_count: int
    airline: str
    airline_logo_url: str | None
    created_at: datetime
