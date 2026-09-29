"""Build, update and persist itineraries produced by the travel agent."""

import math
import uuid
from typing import Any

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.weather import WeatherClient
from app.models import Conversation, Trip
from app.schemas.itinerary import Itinerary, ItineraryUpdate

# Pins further than this from the destination centre are treated as wrong and dropped.
MAX_PIN_DISTANCE_KM = 80


def _km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def apply_update(current: Itinerary, update: ItineraryUpdate) -> Itinerary:
    """Merge an update into the current itinerary and re-validate the result."""
    days = {d.day: d for d in current.days}
    for number in update.remove_days:
        days.pop(number, None)
    for day in update.days:
        days[day.day] = day
    # Renumber so removals don't leave gaps.
    ordered = [days[k] for k in sorted(days)]
    for index, day in enumerate(ordered, start=1):
        day.day = index
    data = current.model_dump()
    data["days"] = [d.model_dump() for d in ordered]
    for field in ("title", "summary", "tips", "start_date"):
        value = getattr(update, field)
        if value is not None:
            data[field] = value
    return Itinerary.model_validate(data)


class ItineraryService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis

    async def check_pins(self, itinerary: Itinerary) -> tuple[Itinerary, int]:
        """Geocode the destination and drop pins that land implausibly far from it."""
        geo = await WeatherClient(self.redis).geocode(itinerary.destination)
        if geo is None:
            return itinerary, 0
        lat, lng = float(geo["latitude"]), float(geo["longitude"])
        itinerary.center = {"lat": lat, "lng": lng}
        dropped = 0
        for day in itinerary.days:
            for activity in day.activities:
                if activity.lat is None or activity.lng is None:
                    continue
                if _km(lat, lng, activity.lat, activity.lng) > MAX_PIN_DISTANCE_KM:
                    activity.lat = activity.lng = None
                    dropped += 1
        return itinerary, dropped

    async def current(self, conversation_id: uuid.UUID) -> Itinerary | None:
        conversation = await self.session.get(Conversation, conversation_id)
        if conversation is None or not conversation.itinerary:
            return None
        return Itinerary.model_validate(conversation.itinerary)

    async def save_to_conversation(
        self, conversation_id: uuid.UUID, itinerary: Itinerary
    ) -> dict[str, Any]:
        conversation = await self.session.get(Conversation, conversation_id)
        if conversation is None:
            raise RuntimeError("conversation not found")
        data = itinerary.model_dump(mode="json")
        conversation.itinerary = data
        # Once saved as a trip, chat edits keep the trip in sync.
        if conversation.trip_id:
            trip = await self.session.get(Trip, conversation.trip_id)
            if trip is not None:
                apply_to_trip(trip, itinerary)
        await self.session.commit()
        return data


def apply_to_trip(trip: Trip, itinerary: Itinerary) -> None:
    trip.itinerary = itinerary.model_dump(mode="json")
    trip.title = itinerary.title
    trip.destination = f"{itinerary.destination}, {itinerary.country}".strip(", ")
    trip.start_date = itinerary.start_date
    trip.end_date = itinerary.end_date
