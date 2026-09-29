from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import StrEnum
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator

from app.schemas.common import ApiModel

MAX_DAYS_AHEAD = 330


class CabinClass(StrEnum):
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"
    FIRST = "first"


class FlightSearchRequest(ApiModel):
    origin: str = Field(min_length=3, max_length=3, examples=["LHE"])
    destination: str = Field(min_length=3, max_length=3, examples=["DXB"])
    departure_date: date
    return_date: date | None = None
    adults: int = Field(default=1, ge=1, le=9)
    children: int = Field(default=0, ge=0, le=8)
    infants: int = Field(default=0, ge=0, le=4)
    cabin_class: CabinClass = CabinClass.ECONOMY

    @field_validator("origin", "destination")
    @classmethod
    def _iata(cls, value: str) -> str:
        value = value.upper()
        if not value.isalpha():
            raise ValueError("Must be a 3-letter IATA code")
        return value

    @model_validator(mode="after")
    def _check(self) -> Self:
        today = date.today()
        if self.origin == self.destination:
            raise ValueError("Origin and destination must be different")
        if self.departure_date < today:
            raise ValueError("Departure date can't be in the past")
        if self.departure_date > today + timedelta(days=MAX_DAYS_AHEAD):
            raise ValueError("Flights can only be searched about 11 months ahead")
        if self.return_date and self.return_date < self.departure_date:
            raise ValueError("Return date must be on or after the departure date")
        if self.adults + self.children > 9:
            raise ValueError("A maximum of 9 seated travelers per booking")
        if self.infants > self.adults:
            raise ValueError("Each infant needs an accompanying adult")
        return self


class Carrier(ApiModel):
    iata_code: str
    name: str
    logo_url: str | None = None


class Place(ApiModel):
    iata_code: str
    name: str
    city: str


class Segment(ApiModel):
    flight_number: str
    marketing_carrier: Carrier
    operating_carrier: Carrier
    aircraft: str | None
    origin: Place
    destination: Place
    departing_at: datetime  # local time at origin (no offset, as airlines publish it)
    arriving_at: datetime  # local time at destination
    duration_minutes: int


class Layover(ApiModel):
    airport: Place
    duration_minutes: int


class Slice(ApiModel):
    origin: Place
    destination: Place
    departing_at: datetime
    arriving_at: datetime
    duration_minutes: int
    stops: int
    segments: list[Segment]
    layovers: list[Layover]


class OfferPassenger(ApiModel):
    id: str
    type: Literal["adult", "child", "infant_without_seat"]
    age: int | None = None


class FlightOffer(ApiModel):
    id: str
    total_amount: Decimal
    base_amount: Decimal | None
    tax_amount: Decimal | None
    currency: str
    expires_at: datetime | None
    owner: Carrier
    slices: list[Slice]
    cabin_class: CabinClass
    checked_bags: int
    carry_on_bags: int
    refundable: bool
    changeable: bool
    change_penalty: Decimal | None
    emissions_kg: int | None
    total_duration_minutes: int
    max_stops: int
    passengers: list[OfferPassenger] = Field(default_factory=list)
    tags: list[Literal["best", "cheapest", "fastest"]] = Field(default_factory=list)
    score: float = 0


class AirlineSummary(ApiModel):
    iata_code: str
    name: str
    logo_url: str | None
    min_price: Decimal
    offer_count: int


class FlightSearchResponse(ApiModel):
    search_id: str
    source: Literal["duffel", "sample"]
    currency: str
    offers: list[FlightOffer]
    airlines: list[AirlineSummary]
    min_price: Decimal | None
    max_price: Decimal | None
    min_duration_minutes: int | None
    max_duration_minutes: int | None
    expires_at: datetime | None
    cached: bool = False


class OfferDetailsResponse(ApiModel):
    offer: FlightOffer
    source: Literal["duffel", "sample"]
    price_changed: bool = False
    previous_total_amount: Decimal | None = None
