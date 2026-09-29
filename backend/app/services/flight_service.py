import hashlib
from collections import defaultdict
from typing import Any, Literal

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.duffel import DuffelClient
from app.clients.sample_flights import HUB_CODES, SampleFlightSource
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.models import Airport
from app.schemas.flight import (
    AirlineSummary,
    FlightOffer,
    FlightSearchRequest,
    FlightSearchResponse,
)
from app.services.flight_normalizer import normalize_offer

logger = get_logger(__name__)

FlightSource = Literal["duffel", "sample"]

# Weights for the "Best" sort: mostly price, then total travel time, then connections.
PRICE_WEIGHT, DURATION_WEIGHT, STOPS_WEIGHT = 0.6, 0.3, 0.1


def active_source() -> FlightSource:
    settings = get_settings()
    if settings.flight_provider == "auto":
        return "duffel" if settings.duffel_api_token else "sample"
    return settings.flight_provider


def _search_cache_key(request: FlightSearchRequest, source: FlightSource) -> str:
    digest = hashlib.sha256(request.model_dump_json().encode()).hexdigest()[:32]
    return f"flights:search:{source}:{digest}"


def offer_cache_key(offer_id: str) -> str:
    return f"flights:offer:{offer_id}"


class FlightService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis
        self.settings = get_settings()

    async def search(self, request: FlightSearchRequest) -> FlightSearchResponse:
        source = active_source()
        cache_key = _search_cache_key(request, source)
        if cached := await self.redis.get(cache_key):
            response = FlightSearchResponse.model_validate_json(cached)
            response.cached = True
            return response

        airports = await self._airports({request.origin, request.destination, *HUB_CODES})
        for code in (request.origin, request.destination):
            if code not in airports:
                raise AppError(
                    f"We don't know an airport with code {code}.", code="unknown_airport"
                )

        raw = await self._fetch(request, source, airports)
        offers = [normalize_offer(o, request.cabin_class.value) for o in raw.get("offers", [])]
        offers = [o for o in offers if o.slices]
        _score_and_tag(offers)
        offers.sort(key=lambda o: o.score)

        response = _build_response(raw["id"], source, offers)
        ttl = self.settings.flight_search_cache_ttl_seconds
        async with self.redis.pipeline(transaction=False) as pipe:
            pipe.set(cache_key, response.model_dump_json(), ex=ttl)
            # Offers are kept individually so the details/booking pages can look them up.
            for offer in offers:
                pipe.set(offer_cache_key(offer.id), offer.model_dump_json(), ex=ttl * 3)
            await pipe.execute()

        logger.info(
            "flight_search",
            source=source,
            route=f"{request.origin}-{request.destination}",
            offers=len(offers),
        )
        return response

    async def _fetch(
        self, request: FlightSearchRequest, source: FlightSource, airports: dict[str, Airport]
    ) -> dict[str, Any]:
        if source == "sample":
            return SampleFlightSource(airports).search(request)
        return await DuffelClient().create_offer_request(_duffel_payload(request))

    async def _airports(self, codes: set[str]) -> dict[str, Airport]:
        result = await self.session.execute(select(Airport).where(Airport.iata_code.in_(codes)))
        return {a.iata_code: a for a in result.scalars()}


def _duffel_payload(request: FlightSearchRequest) -> dict[str, Any]:
    slices = [
        {
            "origin": request.origin,
            "destination": request.destination,
            "departure_date": request.departure_date.isoformat(),
        }
    ]
    if request.return_date:
        slices.append(
            {
                "origin": request.destination,
                "destination": request.origin,
                "departure_date": request.return_date.isoformat(),
            }
        )
    passengers: list[dict[str, Any]] = [{"type": "adult"} for _ in range(request.adults)]
    # Duffel takes children by age; 8 is a representative 2-11 age.
    passengers += [{"age": 8} for _ in range(request.children)]
    passengers += [{"type": "infant_without_seat"} for _ in range(request.infants)]
    return {
        "slices": slices,
        "passengers": passengers,
        "cabin_class": request.cabin_class.value,
        "max_connections": 1,
    }


def _score_and_tag(offers: list[FlightOffer]) -> None:
    if not offers:
        return
    prices = [float(o.total_amount) for o in offers]
    durations = [o.total_duration_minutes for o in offers]
    p_min, p_span = min(prices), (max(prices) - min(prices)) or 1
    d_min, d_span = min(durations), (max(durations) - min(durations)) or 1

    for offer, price, duration in zip(offers, prices, durations, strict=True):
        offer.score = round(
            PRICE_WEIGHT * (price - p_min) / p_span
            + DURATION_WEIGHT * (duration - d_min) / d_span
            + STOPS_WEIGHT * min(offer.max_stops, 2) / 2,
            4,
        )

    min(offers, key=lambda o: o.score).tags.append("best")
    min(offers, key=lambda o: (o.total_amount, o.score)).tags.append("cheapest")
    min(offers, key=lambda o: (o.total_duration_minutes, o.score)).tags.append("fastest")


def _build_response(
    search_id: str, source: FlightSource, offers: list[FlightOffer]
) -> FlightSearchResponse:
    by_airline: dict[str, list[FlightOffer]] = defaultdict(list)
    for offer in offers:
        by_airline[offer.owner.iata_code].append(offer)
    airlines = sorted(
        (
            AirlineSummary(
                iata_code=code,
                name=group[0].owner.name,
                logo_url=group[0].owner.logo_url,
                min_price=min(o.total_amount for o in group),
                offer_count=len(group),
            )
            for code, group in by_airline.items()
        ),
        key=lambda a: a.min_price,
    )
    prices = [o.total_amount for o in offers]
    durations = [o.total_duration_minutes for o in offers]
    expiries = [o.expires_at for o in offers if o.expires_at]
    return FlightSearchResponse(
        search_id=search_id,
        source=source,
        currency=offers[0].currency if offers else "USD",
        offers=offers,
        airlines=airlines,
        min_price=min(prices, default=None),
        max_price=max(prices, default=None),
        min_duration_minutes=min(durations, default=None),
        max_duration_minutes=max(durations, default=None),
        expires_at=min(expiries, default=None),
    )
