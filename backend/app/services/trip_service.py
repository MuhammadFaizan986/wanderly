import secrets
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from app.models import Conversation, Trip, User, UserRole
from app.repositories.trips import TripRepository
from app.schemas.itinerary import Itinerary
from app.schemas.trip import PublicTrip, TripRead, TripSummary, TripUpdate
from app.services.itinerary_service import apply_to_trip


def _summary(trip: Trip) -> TripSummary:
    return TripSummary(
        id=trip.id,
        title=trip.title,
        destination=trip.destination,
        start_date=trip.start_date,
        end_date=trip.end_date,
        day_count=len(trip.itinerary.get("days", [])),
        is_public=trip.is_public,
        share_slug=trip.share_slug if trip.is_public else None,
        updated_at=trip.updated_at,
    )


class TripService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.trips = TripRepository(session)

    async def save_from_conversation(self, user: User, conversation_id: uuid.UUID) -> TripRead:
        conversation = await self.session.get(Conversation, conversation_id)
        if conversation is None or conversation.user_id not in (None, user.id):
            raise NotFoundError("Conversation not found.")
        if not conversation.itinerary:
            raise AppError("There's no itinerary in this chat yet.", code="no_itinerary")
        if conversation.trip_id:
            existing = await self.trips.get(conversation.trip_id)
            if existing is not None and existing.user_id == user.id:
                return await self._read(existing)

        itinerary = Itinerary.model_validate(conversation.itinerary)
        trip = Trip(user_id=user.id, title=itinerary.title, destination=itinerary.destination)
        apply_to_trip(trip, itinerary)
        trip = await self.trips.add(trip)
        # A guest chat becomes the traveler's once they save from it.
        conversation.user_id = user.id
        conversation.trip_id = trip.id
        await self.session.flush()
        return await self._read(trip)

    async def list(self, user: User) -> list[TripSummary]:
        return [_summary(t) for t in await self.trips.list_for_user(user.id)]

    async def get(self, user: User, trip_id: uuid.UUID) -> TripRead:
        return await self._read(await self._owned(user, trip_id))

    async def update(self, user: User, trip_id: uuid.UUID, data: TripUpdate) -> TripRead:
        trip = await self._owned(user, trip_id)
        itinerary = Itinerary.model_validate(trip.itinerary)
        if data.title is not None:
            itinerary.title = data.title
        if "start_date" in data.model_fields_set:
            itinerary.start_date = data.start_date
            itinerary = Itinerary.model_validate(itinerary.model_dump())
        apply_to_trip(trip, itinerary)
        conversation = await self.trips.conversation_for(trip.id)
        if conversation is not None:
            conversation.itinerary = trip.itinerary
        await self.session.flush()
        await self.session.refresh(trip)
        return await self._read(trip)

    async def delete(self, user: User, trip_id: uuid.UUID) -> None:
        trip = await self._owned(user, trip_id)
        await self.session.delete(trip)

    async def set_sharing(self, user: User, trip_id: uuid.UUID, public: bool) -> TripRead:
        trip = await self._owned(user, trip_id)
        trip.is_public = public
        if public and not trip.share_slug:
            trip.share_slug = secrets.token_urlsafe(9)
        await self.session.flush()
        await self.session.refresh(trip)
        return await self._read(trip)

    async def public(self, slug: str) -> PublicTrip:
        trip = await self.trips.get_by_slug(slug)
        if trip is None:
            raise NotFoundError("This itinerary isn't shared, or the link has changed.")
        owner = await self.session.get(User, trip.user_id)
        return PublicTrip(
            title=trip.title,
            destination=trip.destination,
            start_date=trip.start_date,
            end_date=trip.end_date,
            itinerary=Itinerary.model_validate(trip.itinerary),
            owner_first_name=owner.full_name.split(" ")[0] if owner else None,
        )

    async def _owned(self, user: User, trip_id: uuid.UUID) -> Trip:
        trip = await self.trips.get(trip_id)
        if trip is None or (trip.user_id != user.id and user.role != UserRole.ADMIN):
            raise NotFoundError("Trip not found.")
        return trip

    async def _read(self, trip: Trip) -> TripRead:
        conversation = await self.trips.conversation_for(trip.id)
        return TripRead(
            **_summary(trip).model_dump(),
            itinerary=Itinerary.model_validate(trip.itinerary),
            conversation_id=conversation.id if conversation else None,
            created_at=trip.created_at,
        )
