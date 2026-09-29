import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.trip import PublicTrip, TripCreate, TripRead, TripSummary, TripUpdate
from app.services.trip_service import TripService

router = APIRouter(prefix="/trips", tags=["trips"])
public_router = APIRouter(prefix="/public", tags=["public"])


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
async def save_trip(data: TripCreate, user: CurrentUser, db: DbSession) -> TripRead:
    """Save the itinerary drafted in a chat as a trip (idempotent per chat)."""
    return await TripService(db).save_from_conversation(user, data.conversation_id)


@router.get("", response_model=list[TripSummary])
async def list_trips(user: CurrentUser, db: DbSession) -> list[TripSummary]:
    return await TripService(db).list(user)


@router.get("/{trip_id}", response_model=TripRead)
async def get_trip(trip_id: uuid.UUID, user: CurrentUser, db: DbSession) -> TripRead:
    return await TripService(db).get(user, trip_id)


@router.patch("/{trip_id}", response_model=TripRead)
async def update_trip(
    trip_id: uuid.UUID, data: TripUpdate, user: CurrentUser, db: DbSession
) -> TripRead:
    return await TripService(db).update(user, trip_id, data)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(trip_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    await TripService(db).delete(user, trip_id)


@router.post("/{trip_id}/share", response_model=TripRead)
async def share_trip(trip_id: uuid.UUID, user: CurrentUser, db: DbSession) -> TripRead:
    """Create (or re-enable) a public link to this trip."""
    return await TripService(db).set_sharing(user, trip_id, public=True)


@router.delete("/{trip_id}/share", response_model=TripRead)
async def unshare_trip(trip_id: uuid.UUID, user: CurrentUser, db: DbSession) -> TripRead:
    return await TripService(db).set_sharing(user, trip_id, public=False)


@public_router.get("/trips/{slug}", response_model=PublicTrip)
async def public_trip(slug: str, db: DbSession) -> PublicTrip:
    return await TripService(db).public(slug)
