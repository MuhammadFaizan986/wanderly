import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking


class BookingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, booking: Booking) -> Booking:
        self.session.add(booking)
        await self.session.flush()
        await self.session.refresh(booking)
        return booking

    async def get(self, booking_id: uuid.UUID) -> Booking | None:
        return await self.session.get(Booking, booking_id)

    async def list_for_user(self, user_id: uuid.UUID) -> Sequence[Booking]:
        result = await self.session.execute(
            select(Booking).where(Booking.user_id == user_id).order_by(Booking.departure_at)
        )
        return result.scalars().all()
