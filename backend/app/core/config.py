from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables and `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_ignore_empty=True, extra="ignore"
    )

    # App
    app_name: str = "Wanderly API"
    environment: Literal["local", "test", "staging", "production"] = "local"
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3100"]
    )

    # Infrastructure
    database_url: str = "postgresql+asyncpg://wanderly:wanderly@localhost:5442/wanderly"
    database_echo: bool = False
    redis_url: str = "redis://localhost:6390/0"

    # Auth
    jwt_secret: SecretStr = SecretStr("change-me-in-production-please-32-bytes-min")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 14
    refresh_cookie_name: str = "wanderly_refresh"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    demo_login_enabled: bool = True
    demo_user_email: str = "demo@wanderly.app"
    auth_rate_limit_per_minute: int = 10

    # LLM
    llm_provider: Literal["anthropic", "openai"] = "anthropic"
    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-opus-5"
    # Chat works well at medium effort; raise to "high" if answers feel shallow.
    llm_effort: Literal["low", "medium", "high", "xhigh", "max"] = "medium"
    llm_max_tokens: int = 16_000
    # Retry safety-classifier refusals on Anthropic's recommended fallback model.
    llm_refusal_fallbacks: bool = True
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-5-mini"
    llm_max_tool_rounds: int = 5

    # External APIs
    # "auto" uses Duffel when DUFFEL_API_TOKEN is set, otherwise realistic sample data.
    flight_provider: Literal["auto", "duffel", "sample"] = "auto"
    duffel_api_token: SecretStr | None = None
    duffel_api_url: str = "https://api.duffel.com"
    duffel_api_version: str = "v2"
    unsplash_access_key: SecretStr | None = None
    unsplash_app_name: str = "wanderly"
    resend_api_key: SecretStr | None = None
    email_from: str = "Wanderly <onboarding@resend.dev>"

    # Visit notifications: an email to the owner when someone opens the app.
    # Both RESEND_API_KEY and NOTIFY_EMAIL_TO must be set or nothing is sent. Resend's
    # shared sender needs no domain but only delivers to the account owner's address.
    notify_email_to: str | None = None
    notify_email_from: str = "Wanderly <onboarding@resend.dev>"
    notify_max_per_hour: int = 12
    # Look up the visitor's rough location from their IP (ipapi.co, best effort).
    visit_geo_lookup: bool = True

    # Caching / limits
    flight_search_cache_ttl_seconds: int = 600
    flight_search_rate_limit_per_minute: int = 30
    chat_rate_limit_per_hour: int = 30

    @field_validator("database_url")
    @classmethod
    def _asyncpg_scheme(cls, value: str) -> str:
        # Hosting platforms (Render, Railway, Heroku) hand out plain postgres:// URLs.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+asyncpg://" + value[len(prefix) :]
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            # Browsers send origins without a trailing slash, so strip any that were pasted in.
            return [o.strip().rstrip("/") for o in value.split(",") if o.strip()]
        return value

    @model_validator(mode="after")
    def _require_real_secrets_in_production(self) -> "Settings":
        if self.environment == "production":
            secret = self.jwt_secret.get_secret_value()
            if secret.startswith("change-me") or len(secret) < 32:
                raise ValueError(
                    "JWT_SECRET must be set to a random value of 32+ chars in production"
                )
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
