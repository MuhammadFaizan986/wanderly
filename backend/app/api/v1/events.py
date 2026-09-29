"""
Front-of-house events: someone opened the demo.

The only unauthenticated write endpoint in the API, so it's kept boring:

- it stores nothing about the visitor and returns nothing;
- the work happens in a background task, so the response is immediate and a slow
  email can't hold up a page load;
- one browser session triggers at most one notification (the browser sends a
  session id it generates once), and the sender caps emails per hour regardless.
"""

from fastapi import APIRouter, BackgroundTasks, Request, status
from pydantic import BaseModel, Field

from app.api.deps import RedisClient
from app.core.logging import get_logger
from app.core.rate_limit import client_ip
from app.services.notify import Visit, first_visit_in_session, notify_visit

log = get_logger(__name__)
router = APIRouter(prefix="/events", tags=["events"])


class VisitIn(BaseModel):
    path: str = Field(default="/", max_length=200)
    referrer: str | None = Field(default=None, max_length=500)
    ref: str | None = Field(default=None, max_length=64, description="?ref= tag from the link")
    session_id: str = Field(min_length=8, max_length=64)


@router.post("/visit", status_code=status.HTTP_204_NO_CONTENT)
async def record_visit(
    body: VisitIn, request: Request, background: BackgroundTasks, redis: RedisClient
) -> None:
    """Tell the owner that somebody opened the demo."""
    if not await first_visit_in_session(redis, body.session_id):
        return

    # Requests arrive via the Next.js proxy (and the host's load balancer), so the
    # visitor's address is the first X-Forwarded-For entry, not the socket peer.
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() or client_ip(request)

    visit = Visit(
        path=body.path,
        referrer=body.referrer,
        ref=body.ref,
        user_agent=request.headers.get("user-agent"),
        ip=ip,
    )
    log.info("visit", path=visit.path, source=visit.source, device=visit.device)
    background.add_task(notify_visit, visit, redis)
