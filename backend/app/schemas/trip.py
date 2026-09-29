import uuid
from datetime import date, datetime

from pydantic import Field

from app.schemas.common import ApiModel
from app.schemas.itinerary import Itinerary


class TripCreate(ApiModel):
    conversation_id: uuid.UUID = Field(description="Save the itinerary drafted in this chat")


class TripUpdate(ApiModel):
    title: str | None = Field(default=None, min_length=3, max_length=100)
    start_date: date | None = None


class TripSummary(ApiModel):
    id: uuid.UUID
    title: str
    destination: str
    start_date: date | None
    end_date: date | None
    day_count: int
    is_public: bool
    share_slug: str | None
    updated_at: datetime


class TripRead(TripSummary):
    itinerary: Itinerary
    conversation_id: uuid.UUID | None = None
    created_at: datetime


class PublicTrip(ApiModel):
    title: str
    destination: str
    start_date: date | None
    end_date: date | None
    itinerary: Itinerary
    owner_first_name: str | None = None
