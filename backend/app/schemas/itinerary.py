import datetime as dt
from typing import Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

Category = Literal[
    "sight", "food", "activity", "nature", "shopping", "nightlife", "transport", "rest"
]
TimeSlot = Literal["morning", "afternoon", "evening", "night"]


class Activity(BaseModel):
    time: TimeSlot
    start_time: str | None = Field(
        default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="HH:MM, optional"
    )
    title: str = Field(min_length=2, max_length=90)
    description: str = Field(max_length=320, description="One or two helpful sentences")
    place: str = Field(max_length=120, description="Name of the specific place or neighborhood")
    category: Category
    lat: float | None = Field(default=None, ge=-90, le=90, description="Latitude of the place")
    lng: float | None = Field(default=None, ge=-180, le=180, description="Longitude of the place")
    duration_minutes: int | None = Field(default=None, ge=10, le=720)
    cost_usd: int | None = Field(
        default=None, ge=0, le=5000, description="Estimated cost per person"
    )


class ItineraryDay(BaseModel):
    day: int = Field(ge=1, le=21)
    date: dt.date | None = None
    title: str = Field(min_length=2, max_length=80, description="Theme of the day")
    activities: list[Activity] = Field(min_length=1, max_length=8)


class Itinerary(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    destination: str = Field(min_length=2, max_length=80, description="Main city or region")
    country: str = Field(max_length=80)
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    travelers: int | None = Field(default=None, ge=1, le=20)
    summary: str = Field(max_length=600)
    days: list[ItineraryDay] = Field(min_length=1, max_length=21)
    tips: list[str] = Field(default_factory=list, max_length=8)
    center: dict[str, float] | None = Field(default=None, description="Set by the server")

    @field_validator("tips")
    @classmethod
    def _short_tips(cls, tips: list[str]) -> list[str]:
        return [t.strip()[:240] for t in tips if t.strip()]

    @model_validator(mode="after")
    def _normalize_days(self) -> Self:
        self.days.sort(key=lambda d: d.day)
        if [d.day for d in self.days] != list(range(1, len(self.days) + 1)):
            raise ValueError("Days must be numbered 1, 2, 3... with no gaps or repeats")
        if self.start_date:
            for d in self.days:
                d.date = self.start_date + dt.timedelta(days=d.day - 1)
            self.end_date = self.start_date + dt.timedelta(days=len(self.days) - 1)
        return self


class ItineraryUpdate(BaseModel):
    """Changes to the current itinerary. Only include what changes."""

    days: list[ItineraryDay] = Field(
        default_factory=list, description="Full replacement for each changed or added day"
    )
    remove_days: list[int] = Field(default_factory=list, description="Day numbers to delete")
    title: str | None = Field(default=None, max_length=100)
    summary: str | None = Field(default=None, max_length=600)
    tips: list[str] | None = Field(default=None, max_length=8)
    start_date: dt.date | None = None
