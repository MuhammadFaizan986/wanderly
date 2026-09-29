import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, Trip


class TripRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, trip: Trip) -> Trip:
        self.session.add(trip)
        await self.session.flush()
        await self.session.refresh(trip)
        return trip

    async def get(self, trip_id: uuid.UUID) -> Trip | None:
        return await self.session.get(Trip, trip_id)

    async def get_by_slug(self, slug: str) -> Trip | None:
        result = await self.session.execute(
            select(Trip).where(Trip.share_slug == slug, Trip.is_public.is_(True))
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> Sequence[Trip]:
        result = await self.session.execute(
            select(Trip).where(Trip.user_id == user_id).order_by(Trip.updated_at.desc())
        )
        return result.scalars().all()

    async def conversation_for(self, trip_id: uuid.UUID) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.trip_id == trip_id)
            .order_by(Conversation.updated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
