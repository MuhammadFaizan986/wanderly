from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.api.deps import DbSession
from app.core.exceptions import NotFoundError
from app.repositories.airports import AirportRepository
from app.schemas.airport import AirportRead

router = APIRouter(prefix="/airports", tags=["airports"])


@router.get("/search", response_model=list[AirportRead])
async def search_airports(
    db: DbSession,
    response: Response,
    q: Annotated[str, Query(min_length=2, max_length=64, description="City, airport or IATA code")],
    limit: Annotated[int, Query(ge=1, le=20)] = 8,
) -> list[AirportRead]:
    airports = await AirportRepository(db).search(q, limit)
    # Airport data is static; let browsers and CDNs cache autocomplete results.
    response.headers["Cache-Control"] = "public, max-age=3600"
    return [AirportRead.model_validate(a) for a in airports]


@router.get("/{iata_code}", response_model=AirportRead)
async def get_airport(db: DbSession, iata_code: str) -> AirportRead:
    airport = await AirportRepository(db).get(iata_code)
    if airport is None:
        raise NotFoundError("Airport not found.")
    return AirportRead.model_validate(airport)
