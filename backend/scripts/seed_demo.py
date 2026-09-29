"""Give the one-click demo account a saved, shared sample trip (idempotent).

A fresh deployment then has something to show straight away: the demo user's
"My Trips" lists the trip, and /share/istanbul-food-demo works as a public link.

    uv run python -m scripts.seed_demo
"""

import asyncio
import json
import secrets
from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.models import Trip, User
from app.schemas.itinerary import Itinerary
from app.services.itinerary_service import apply_to_trip

DEMO_SHARE_SLUG = "istanbul-food-demo"
FIXTURE = Path(__file__).parent / "demo_data" / "istanbul_trip.json"

logger = get_logger("seed_demo")


async def main() -> None:
    settings = get_settings()
    configure_logging(settings)
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == settings.demo_user_email))
        if user is None:
            user = User(
                email=settings.demo_user_email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                full_name="Demo Traveler",
            )
            session.add(user)
            await session.flush()

        existing = await session.scalar(select(Trip).where(Trip.share_slug == DEMO_SHARE_SLUG))
        if existing is None:
            itinerary = Itinerary.model_validate(json.loads(FIXTURE.read_text()))
            trip = Trip(user_id=user.id, title=itinerary.title, destination=itinerary.destination)
            apply_to_trip(trip, itinerary)
            trip.share_slug = DEMO_SHARE_SLUG
            trip.is_public = True
            session.add(trip)
            logger.info("demo_trip_created", slug=DEMO_SHARE_SLUG)
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
