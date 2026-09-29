from typing import Any

import httpx

from app.clients.http import request_with_retry
from app.core.config import get_settings
from app.core.exceptions import AppError, ExternalServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)

# Airlines can take a while to answer; Duffel waits up to supplier_timeout for them.
SEARCH_TIMEOUT = httpx.Timeout(45.0, connect=5.0)
SUPPLIER_TIMEOUT_MS = 20_000


class DuffelClient:
    """Thin wrapper over the Duffel Flights API (v2). Returns raw `data` payloads."""

    def __init__(self) -> None:
        settings = get_settings()
        if settings.duffel_api_token is None:
            raise RuntimeError("DUFFEL_API_TOKEN is not configured")
        self._base_url = settings.duffel_api_url
        self._headers = {
            "Authorization": f"Bearer {settings.duffel_api_token.get_secret_value()}",
            "Duffel-Version": settings.duffel_api_version,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        }

    async def create_offer_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._send(
            "POST",
            "/air/offer_requests",
            params={"return_offers": "true", "supplier_timeout": SUPPLIER_TIMEOUT_MS},
            json={"data": payload},
        )

    async def get_offer(self, offer_id: str) -> dict[str, Any]:
        return await self._send("GET", f"/air/offers/{offer_id}")

    async def _send(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        async with httpx.AsyncClient(
            base_url=self._base_url, headers=self._headers, timeout=SEARCH_TIMEOUT
        ) as client:
            try:
                response = await request_with_retry(client, method, path, attempts=2, **kwargs)
            except httpx.HTTPStatusError as exc:
                errors = _duffel_errors(exc.response)
                logger.warning("duffel_error", status=exc.response.status_code, errors=errors)
                if exc.response.status_code in (400, 404, 422):
                    message = errors[0].get("message") if errors else None
                    raise AppError(
                        message or "The airline couldn't process this request.",
                        code="flight_request_invalid",
                    ) from exc
                raise ExternalServiceError("Flight search is temporarily unavailable.") from exc
            except httpx.TransportError as exc:
                logger.warning("duffel_unreachable", error=str(exc))
                raise ExternalServiceError("Flight search is temporarily unavailable.") from exc
        data: dict[str, Any] = response.json()["data"]
        return data


def _duffel_errors(response: httpx.Response) -> list[dict[str, Any]]:
    try:
        errors: list[dict[str, Any]] = response.json().get("errors", [])
    except ValueError:
        return []
    return errors
