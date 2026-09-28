import httpx
from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.TransportError):
        return True
    return isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code >= 500


async def request_with_retry(
    client: httpx.AsyncClient, method: str, url: str, *, attempts: int = 3, **kwargs: object
) -> httpx.Response:
    """Send a request, retrying network errors and 5xx responses with jittered backoff."""
    async for attempt in AsyncRetrying(
        stop=stop_after_attempt(attempts),
        wait=wait_exponential_jitter(initial=0.3, max=3),
        retry=retry_if_exception(_is_retryable),
        reraise=True,
    ):
        with attempt:
            response = await client.request(method, url, **kwargs)  # type: ignore[arg-type]
            response.raise_for_status()
            return response
    raise AssertionError("unreachable")
