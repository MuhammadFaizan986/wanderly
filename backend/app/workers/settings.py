from typing import Any, ClassVar

from arq.connections import RedisSettings

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger

settings = get_settings()
logger = get_logger("app.worker")


async def startup(ctx: dict[str, Any]) -> None:
    configure_logging(settings)
    logger.info("worker_startup")


async def shutdown(ctx: dict[str, Any]) -> None:
    logger.info("worker_shutdown")


async def ping(ctx: dict[str, Any]) -> str:
    """Smoke-test job; real jobs (price checks, emails) arrive in week 7."""
    return "pong"


class WorkerSettings:
    functions: ClassVar[list[Any]] = [ping]
    cron_jobs: ClassVar[list[Any]] = []
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
