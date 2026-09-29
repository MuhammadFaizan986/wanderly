"""
"Someone is looking at your demo" emails (ported from NEXA).

When the demo link goes out on LinkedIn or in an Upwork proposal, it's useful to know
the moment somebody opens it, and where they came from.

What this can honestly tell you:

    when · which page · where they came from (referrer or ?ref=) · rough location
    · phone or laptop, which browser

What it cannot tell you is who they are. IP addresses don't carry names.

Protections, because the endpoint that triggers this is public and unauthenticated:

- one email per browser session (checked in Redis, so it holds across restarts
  and multiple API containers);
- a cap on emails per hour, so nobody can use it to flood the inbox;
- the visitor's IP is used to look up a location and then dropped: never logged
  or stored.
"""

import ipaddress
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx
from redis.asyncio import Redis

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

RESEND_URL = "https://api.resend.com/emails"
GEO_URL = "https://ipapi.co/{ip}/json/"

KNOWN_SOURCES = (
    ("LinkedIn", "linkedin"),
    ("Upwork", "upwork"),
    ("GitHub", "github"),
    ("Google", "google"),
    ("X/Twitter", "t.co"),
    ("X/Twitter", "twitter"),
    ("Facebook", "facebook"),
    ("WhatsApp", "whatsapp"),
)


@dataclass
class Visit:
    """What we know about one arrival."""

    path: str
    referrer: str | None
    ref: str | None  # explicit ?ref= tag on the shared link
    user_agent: str | None
    ip: str | None = None

    @property
    def source(self) -> str:
        """Where they came from, in words: the single most useful field."""
        for value in (self.ref, self.referrer):
            if not value:
                continue
            for name, needle in KNOWN_SOURCES:
                if needle in value.lower():
                    return name
        if self.ref:
            return self.ref
        return self.referrer or "direct or unknown"

    @property
    def device(self) -> str:
        """A readable one-liner instead of a 200-character user agent."""
        agent = (self.user_agent or "").lower()
        if not agent:
            return "unknown"
        platforms = (
            ("iphone", "iPhone"),
            ("ipad", "iPad"),
            ("android", "Android"),
            ("macintosh", "Mac"),
            ("windows", "Windows"),
            ("linux", "Linux"),
        )
        platform = next((label for key, label in platforms if key in agent), "unknown device")
        browsers = (
            ("edg/", "Edge"),
            ("chrome", "Chrome"),
            ("firefox", "Firefox"),
            ("safari", "Safari"),
        )
        browser = next((label for key, label in browsers if key in agent), "browser")
        return f"{platform} · {browser}"


async def first_visit_in_session(redis: Redis, session_id: str) -> bool:
    """True the first time a browser session is seen (refreshes don't re-notify)."""
    return bool(await redis.set(f"visit:session:{session_id}", "1", nx=True, ex=12 * 3600))


async def _within_hourly_cap(redis: Redis) -> bool:
    """True if we may send one more email this hour (and counts it)."""
    key = f"notify:visits:{datetime.now(UTC):%Y%m%d%H}"
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(key)
        pipe.expire(key, 3600, nx=True)
        count, _ = await pipe.execute()
    return int(count) <= get_settings().notify_max_per_hour


def _is_public(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_global
    except ValueError:
        return False


async def _location_of(ip: str | None) -> str | None:
    """Best-effort "City, Country" from the IP, which is then discarded. Never raises."""
    if not ip or not get_settings().visit_geo_lookup or not _is_public(ip):
        return None  # local development and private networks have no location
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            data = (await client.get(GEO_URL.format(ip=ip))).json()
        parts = [data.get("city"), data.get("country_name")]
        return ", ".join(p for p in parts if p) or None
    except Exception:  # geography is a nicety, never a reason to fail
        return None


def _body(visit: Visit, location: str | None) -> tuple[str, str]:
    when = datetime.now(UTC).strftime("%d %b %Y, %H:%M UTC")
    subject = f"Wanderly demo: a visitor from {visit.source}"
    lines = [
        "Someone just opened your Wanderly demo.",
        "",
        f"When:      {when}",
        f"Page:      {visit.path}",
        f"Came from: {visit.source}",
        f"Where:     {location or 'unknown'}",
        f"Device:    {visit.device}",
        "",
        "Their IP was used to look up the location and then discarded.",
    ]
    return subject, "\n".join(lines)


async def notify_visit(visit: Visit, redis: Redis) -> None:
    """Send the email. Never raises: a notification must not break a page load.

    Runs as a background task, so the visitor's request has already been answered.
    """
    settings = get_settings()
    if not (settings.resend_api_key and settings.notify_email_to):
        return  # not configured: nothing to do, and nothing to warn about

    if not await _within_hourly_cap(redis):
        log.info("notify.throttled", path=visit.path)
        return

    location = await _location_of(visit.ip)
    subject, text = _body(visit, location)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}"},
                json={
                    "from": settings.notify_email_from,
                    "to": [settings.notify_email_to],
                    "subject": subject,
                    "text": text,
                },
            )
        if response.status_code >= 400:
            log.warning("notify.rejected", status=response.status_code, body=response.text[:200])
        else:
            log.info("notify.sent", source=visit.source, location=location)
    except Exception as exc:
        log.warning("notify.failed", error_type=type(exc).__name__)
