import asyncio
from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import DbSession, RedisClient
from app.core.config import get_settings

router = APIRouter(tags=["health"])

CHECK_TIMEOUT_SECONDS = 2.0


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    environment: str
    checks: dict[str, Literal["ok", "error"]]


@router.get("/health", response_model=HealthResponse)
async def health(db: DbSession, redis: RedisClient, response: Response) -> HealthResponse:
    """Liveness + dependency check used by the hosting platform's uptime probe."""

    async def check_db() -> None:
        await db.execute(text("SELECT 1"))

    async def check_redis() -> None:
        await redis.ping()

    checks: dict[str, Literal["ok", "error"]] = {}
    for name, check in (("database", check_db), ("redis", check_redis)):
        try:
            await asyncio.wait_for(check(), timeout=CHECK_TIMEOUT_SECONDS)
            checks[name] = "ok"
        except Exception:
            checks[name] = "error"

    healthy = all(v == "ok" for v in checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(
        status="ok" if healthy else "degraded",
        environment=get_settings().environment,
        checks=checks,
    )
