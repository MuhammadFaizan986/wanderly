import json
from typing import Any
from urllib.parse import urlencode

import httpx
from redis.asyncio import Redis

from app.clients.http import DEFAULT_TIMEOUT, request_with_retry
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

API_URL = "https://api.unsplash.com"
CACHE_TTL_SECONDS = 7 * 86_400  # demo apps get 50 req/hour; photos rarely change


class UnsplashClient:
    """Fetches one landscape photo per query, cached in Redis.

    Returns None (never raises) when no key is configured or Unsplash fails, so callers
    can fall back to an illustration.
    """

    def __init__(self, redis: Redis) -> None:
        self.redis = redis
        self.settings = get_settings()

    async def photo_for(self, query: str) -> dict[str, Any] | None:
        key = self.settings.unsplash_access_key
        if key is None:
            return None

        cache_key = f"unsplash:photo:{query.lower()}"
        cached = await self.redis.get(cache_key)
        if cached is not None:
            return json.loads(cached) or None

        try:
            async with httpx.AsyncClient(
                base_url=API_URL,
                timeout=DEFAULT_TIMEOUT,
                headers={
                    "Authorization": f"Client-ID {key.get_secret_value()}",
                    "Accept-Version": "v1",
                },
            ) as client:
                response = await request_with_retry(
                    client,
                    "GET",
                    "/search/photos",
                    params={
                        "query": query,
                        "orientation": "landscape",
                        "per_page": 1,
                        "content_filter": "high",
                    },
                )
        except httpx.HTTPError as exc:
            logger.warning("unsplash_failed", query=query, error=str(exc))
            return None

        results = response.json().get("results", [])
        photo = self._to_photo(results[0]) if results else None
        # Cache misses too (as {}), so we don't burn the hourly quota retrying them.
        await self.redis.set(cache_key, json.dumps(photo or {}), ex=CACHE_TTL_SECONDS)
        return photo

    def _to_photo(self, raw: dict[str, Any]) -> dict[str, Any]:
        # Unsplash guidelines: hotlink their URLs and credit the photographer with UTM links.
        utm = urlencode({"utm_source": self.settings.unsplash_app_name, "utm_medium": "referral"})
        return {
            "url": f"{raw['urls']['raw']}&w=1200&q=80&fm=jpg&fit=crop",
            "blur_hash": raw.get("blur_hash"),
            "color": raw.get("color"),
            "alt": raw.get("alt_description"),
            "photographer": raw["user"]["name"],
            "photographer_url": f"{raw['user']['links']['html']}?{utm}",
            "unsplash_url": f"https://unsplash.com/?{utm}",
        }
