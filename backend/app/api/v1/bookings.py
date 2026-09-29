import uuid
from typing import Annotated

from fastapi import APIRouter, Header, status

from app.api.deps import CurrentUser, DbSession, RedisClient
from app.schemas.booking import BookingCreate, BookingRead, BookingSummary
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    user: CurrentUser,
    db: DbSession,
    redis: RedisClient,
    idempotency_key: Annotated[str | None, Header(max_length=64)] = None,
) -> BookingRead:
    """Book an offer. Send an `Idempotency-Key` header so retries never double-book."""
    return await BookingService(db, redis).create(user, data, idempotency_key)


@router.get("", response_model=list[BookingSummary])
async def list_bookings(
    user: CurrentUser, db: DbSession, redis: RedisClient
) -> list[BookingSummary]:
    return await BookingService(db, redis).list(user)


@router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: uuid.UUID, user: CurrentUser, db: DbSession, redis: RedisClient
) -> BookingRead:
    return await BookingService(db, redis).get(user, booking_id)
