from collections.abc import Awaitable, Callable

from fastapi import Request
from redis.asyncio import Redis

from app.core.exceptions import RateLimitedError
from app.db.redis import get_redis


def client_ip(request: Request) -> str:
    # uvicorn --proxy-headers already resolves X-Forwarded-For into request.client.
    return request.client.host if request.client else "unknown"


async def hit(redis: Redis, key: str, limit: int, window_seconds: int) -> None:
    """Fixed-window counter. Raises RateLimitedError once `limit` is exceeded in the window."""
    redis_key = f"ratelimit:{key}"
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(redis_key)
        pipe.expire(redis_key, window_seconds, nx=True)
        count, _ = await pipe.execute()
    if int(count) > limit:
        ttl = await redis.ttl(redis_key)
        raise RateLimitedError(
            f"Too many attempts. Try again in {max(ttl, 1)} seconds.",
            details={"retry_after": max(ttl, 1)},
        )


def rate_limit(
    scope: str, limit: int | Callable[[], int], window_seconds: int
) -> Callable[[Request], Awaitable[None]]:
    """Dependency factory: limit a route per client IP."""

    async def dependency(request: Request) -> None:
        max_hits = limit() if callable(limit) else limit
        await hit(get_redis(), f"{scope}:{client_ip(request)}", max_hits, window_seconds)

    return dependency
