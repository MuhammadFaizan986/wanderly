import uuid
from datetime import UTC, date, datetime
from typing import Any

from dateutil.relativedelta import relativedelta
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.duffel import DuffelClient
from app.clients.sample_flights import sample_order
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.models import Booking, BookingStatus, User, UserRole
from app.repositories.bookings import BookingRepository
from app.schemas.booking import BookingCreate, BookingRead, BookingSummary
from app.schemas.flight import FlightOffer, OfferPassenger
from app.services.flight_service import FlightService

logger = get_logger(__name__)

IDEMPOTENCY_TTL_SECONDS = 600
AGE_RULES = {
    "adult": (12, None, "Adults must be 12 or older on the travel date"),
    "child": (2, 11, "Children must be 2-11 years old on the travel date"),
    "infant_without_seat": (0, 1, "Infants must be under 2 on the travel date"),
}


class PriceChangedError(AppError):
    status_code = 409
    code = "price_changed"


def _age_on(born_on: date, on: date) -> int:
    return relativedelta(on, born_on).years


def _as_utc_label(local: datetime) -> datetime:
    # Offer times are local wall-clock; we label them UTC only so they sort consistently.
    return local.replace(tzinfo=UTC)


class BookingService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis
        self.bookings = BookingRepository(session)

    async def create(
        self, user: User, data: BookingCreate, idempotency_key: str | None
    ) -> BookingRead:
        lock_key = f"idem:booking:{user.id}:{idempotency_key}" if idempotency_key else None
        if lock_key:
            existing = await self.redis.get(lock_key)
            if existing and existing != "pending":
                return await self.get(user, uuid.UUID(existing))
            if existing == "pending" or not await self.redis.set(
                lock_key, "pending", nx=True, ex=IDEMPOTENCY_TTL_SECONDS
            ):
                raise ConflictError("This booking is already being processed.", code="in_progress")

        try:
            booking = await self._create(user, data)
        except BaseException:
            if lock_key:
                await self.redis.delete(lock_key)
            raise

        if lock_key:
            await self.redis.set(lock_key, str(booking.id), ex=IDEMPOTENCY_TTL_SECONDS)
        return self.to_read(booking)

    async def _create(self, user: User, data: BookingCreate) -> Booking:
        details = await FlightService(self.session, self.redis).get_offer(data.offer_id)
        offer = details.offer
        if offer.total_amount != data.expected_total_amount:
            raise PriceChangedError(
                "The fare changed since you started booking. Please review the new price.",
                details={
                    "previous_total_amount": str(data.expected_total_amount),
                    "total_amount": str(offer.total_amount),
                    "currency": offer.currency,
                },
            )
        self._validate_passengers(offer, data)

        booked_key = f"flights:offer:booked:{offer.id}"
        if await self.redis.exists(booked_key):
            raise ConflictError("This fare has already been booked.", code="offer_booked")

        order = await self._place_order(offer, data, details.source)
        await self.redis.set(booked_key, "1", ex=86_400)

        types = {p.id: p.type for p in offer.passengers}
        booking = Booking(
            user_id=user.id,
            duffel_order_id=order["id"],
            booking_reference=order.get("booking_reference"),
            status=BookingStatus.CONFIRMED,
            total_amount=offer.total_amount,
            currency=offer.currency,
            origin=offer.slices[0].origin.iata_code,
            destination=offer.slices[0].destination.iata_code,
            departure_at=_as_utc_label(offer.slices[0].departing_at),
            return_at=_as_utc_label(offer.slices[1].departing_at)
            if len(offer.slices) > 1
            else None,
            contact_email=str(data.contact_email),
            contact_phone=data.contact_phone,
            passengers=[
                {**p.model_dump(mode="json"), "type": types[p.id]} for p in data.passengers
            ],
            raw_offer=offer.model_dump(mode="json"),
        )
        booking = await self.bookings.add(booking)
        logger.info(
            "booking_created",
            booking_id=str(booking.id),
            reference=booking.booking_reference,
            source=details.source,
        )
        return booking

    def _validate_passengers(self, offer: FlightOffer, data: BookingCreate) -> None:
        expected = {p.id: p for p in offer.passengers}
        given = [p.id for p in data.passengers]
        if sorted(given) != sorted(expected):
            raise AppError(
                "Passenger details don't match this fare. Please start the booking again.",
                code="passenger_mismatch",
            )
        travel_date = offer.slices[0].departing_at.date()
        errors: list[dict[str, Any]] = []
        for index, passenger in enumerate(data.passengers):
            kind = expected[passenger.id].type
            low, high, message = AGE_RULES[kind]
            age = _age_on(passenger.born_on, travel_date)
            if passenger.born_on >= date.today() or age < low or (high is not None and age > high):
                errors.append({"loc": ["body", "passengers", index, "born_on"], "msg": message})
        if errors:
            raise AppError(
                "Please check the dates of birth.", code="validation_error", details=errors
            )

    async def _place_order(
        self, offer: FlightOffer, data: BookingCreate, source: str
    ) -> dict[str, Any]:
        if source == "sample":
            return sample_order(offer.id)
        return await DuffelClient().create_order(_duffel_order_payload(offer, data))

    async def get(self, user: User, booking_id: uuid.UUID) -> BookingRead:
        booking = await self.bookings.get(booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.")
        if booking.user_id != user.id and user.role != UserRole.ADMIN:
            # Don't reveal that someone else's booking exists.
            raise NotFoundError("Booking not found.")
        return self.to_read(booking)

    async def list(self, user: User) -> list[BookingSummary]:
        return [_summary(b) for b in await self.bookings.list_for_user(user.id)]

    @staticmethod
    def to_read(booking: Booking) -> BookingRead:
        read = BookingRead.model_validate(booking)
        read.source = (
            "sample" if (booking.duffel_order_id or "").startswith("ord_sample_") else "duffel"
        )
        return read


def _summary(booking: Booking) -> BookingSummary:
    offer = FlightOffer.model_validate(booking.raw_offer)
    return BookingSummary(
        id=booking.id,
        booking_reference=booking.booking_reference,
        status=booking.status,
        total_amount=booking.total_amount,
        currency=booking.currency,
        origin=booking.origin,
        destination=booking.destination,
        origin_city=offer.slices[0].origin.city,
        destination_city=offer.slices[0].destination.city,
        departure_at=booking.departure_at,
        return_at=booking.return_at,
        passenger_count=len(booking.passengers),
        airline=offer.owner.name,
        airline_logo_url=offer.owner.logo_url,
        created_at=booking.created_at,
    )


def _duffel_order_payload(offer: FlightOffer, data: BookingCreate) -> dict[str, Any]:
    kinds: dict[str, OfferPassenger] = {p.id: p for p in offer.passengers}
    infants = [p.id for p in data.passengers if kinds[p.id].type == "infant_without_seat"]
    passengers = []
    for p in data.passengers:
        entry: dict[str, Any] = {
            "id": p.id,
            "title": p.title,
            "gender": p.gender,
            "given_name": p.given_name,
            "family_name": p.family_name,
            "born_on": p.born_on.isoformat(),
            "email": str(data.contact_email),
            "phone_number": data.contact_phone,
        }
        # Each lap infant travels with one adult.
        if kinds[p.id].type == "adult" and infants:
            entry["infant_passenger_id"] = infants.pop(0)
        passengers.append(entry)
    return {
        "type": "instant",
        "selected_offers": [offer.id],
        "passengers": passengers,
        # Test mode pays from the Duffel sandbox balance; no card details are collected.
        "payments": [
            {"type": "balance", "currency": offer.currency, "amount": str(offer.total_amount)}
        ],
    }
