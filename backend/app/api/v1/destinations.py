from fastapi import APIRouter, Response

from app.api.deps import RedisClient
from app.schemas.destination import Destination
from app.services.destination_service import popular_destinations

router = APIRouter(prefix="/destinations", tags=["destinations"])


@router.get("/popular", response_model=list[Destination])
async def get_popular_destinations(redis: RedisClient, response: Response) -> list[Destination]:
    response.headers["Cache-Control"] = "public, max-age=3600"
    return await popular_destinations(redis)
