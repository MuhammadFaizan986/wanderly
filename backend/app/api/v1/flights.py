from fastapi import APIRouter, Depends

from app.api.deps import DbSession, RedisClient
from app.core.config import get_settings
from app.core.rate_limit import rate_limit
from app.schemas.flight import FlightSearchRequest, FlightSearchResponse, OfferDetailsResponse
from app.services.flight_service import FlightService

router = APIRouter(prefix="/flights", tags=["flights"])


@router.post(
    "/search",
    response_model=FlightSearchResponse,
    dependencies=[
        Depends(
            rate_limit(
                "flight-search",
                lambda: get_settings().flight_search_rate_limit_per_minute,
                window_seconds=60,
            )
        )
    ],
)
async def search_flights(
    data: FlightSearchRequest, db: DbSession, redis: RedisClient
) -> FlightSearchResponse:
    """Search flight offers. Results are cached for ~10 minutes per identical search."""
    return await FlightService(db, redis).search(data)


@router.get("/offers/{offer_id}", response_model=OfferDetailsResponse)
async def get_offer(offer_id: str, db: DbSession, redis: RedisClient) -> OfferDetailsResponse:
    """Offer details with a live price re-check. Returns 410 once the fare has expired."""
    return await FlightService(db, redis).get_offer(offer_id)
