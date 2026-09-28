from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status

from app.api.deps import CurrentUser, DbSession, RedisClient
from app.core.config import get_settings
from app.core.rate_limit import rate_limit
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.services.auth_service import AuthService, IssuedTokens

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

# The refresh cookie is only ever sent to the auth endpoints.
REFRESH_COOKIE_PATH = f"{settings.api_v1_prefix}/auth"
RefreshCookie = Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)]
auth_rate_limit = Depends(
    rate_limit("auth", lambda: get_settings().auth_rate_limit_per_minute, window_seconds=60)
)


def _respond(response: Response, tokens: IssuedTokens) -> TokenResponse:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=tokens.refresh_token,
        max_age=settings.refresh_token_expire_days * 86_400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path=REFRESH_COOKIE_PATH,
    )
    response.headers["Cache-Control"] = "no-store"
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        user=UserRead.model_validate(tokens.user),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[auth_rate_limit],
)
async def register(
    data: RegisterRequest, response: Response, db: DbSession, redis: RedisClient
) -> TokenResponse:
    return _respond(response, await AuthService(db, redis).register(data))


@router.post("/login", response_model=TokenResponse, dependencies=[auth_rate_limit])
async def login(
    data: LoginRequest, response: Response, db: DbSession, redis: RedisClient
) -> TokenResponse:
    return _respond(response, await AuthService(db, redis).login(data.email, data.password))


@router.post("/demo", response_model=TokenResponse, dependencies=[auth_rate_limit])
async def demo_login(response: Response, db: DbSession, redis: RedisClient) -> TokenResponse:
    """One-click login to the shared demo account."""
    return _respond(response, await AuthService(db, redis).demo_login())


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response, db: DbSession, redis: RedisClient, refresh_token: RefreshCookie = None
) -> TokenResponse:
    """Exchange the refresh cookie for a new access token (and rotate the cookie)."""
    return _respond(response, await AuthService(db, redis).refresh(refresh_token))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response, db: DbSession, redis: RedisClient, refresh_token: RefreshCookie = None
) -> None:
    await AuthService(db, redis).logout(refresh_token)
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
