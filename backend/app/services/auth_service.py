import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models import User
from app.repositories.users import UserRepository
from app.schemas.auth import RegisterRequest

# Precomputed hash so failed logins for unknown emails take as long as real ones.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    expires_in: int
    user: User


class AuthService:
    """Registration, login and refresh-token rotation.

    Refresh tokens are single-use: each one's `jti` is stored in Redis and deleted when it
    is exchanged, so a stolen-and-replayed or logged-out token is rejected.
    """

    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.users = UserRepository(session)
        self.redis = redis
        self.settings = get_settings()

    async def register(self, data: RegisterRequest) -> IssuedTokens:
        if await self.users.get_by_email(data.email):
            raise ConflictError("An account with this email already exists.", code="email_taken")
        user = await self.users.create(
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
        )
        return await self._issue(user)

    async def login(self, email: str, password: str) -> IssuedTokens:
        user = await self.users.get_by_email(email)
        if user is None:
            verify_password(password, _DUMMY_HASH)
            raise UnauthorizedError("Incorrect email or password.", code="invalid_credentials")
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError("Incorrect email or password.", code="invalid_credentials")
        if not user.is_active:
            raise ForbiddenError("This account is disabled.", code="account_disabled")
        return await self._issue(user)

    async def demo_login(self) -> IssuedTokens:
        if not self.settings.demo_login_enabled:
            raise ForbiddenError("Demo login is disabled.", code="demo_disabled")
        user = await self.users.get_by_email(self.settings.demo_user_email)
        if user is None:
            user = await self.users.create(
                email=self.settings.demo_user_email,
                # Nobody knows this password; the demo account is reachable only via /auth/demo.
                password_hash=hash_password(secrets.token_urlsafe(32)),
                full_name="Demo Traveler",
            )
        return await self._issue(user)

    async def refresh(self, refresh_token: str | None) -> IssuedTokens:
        if not refresh_token:
            raise UnauthorizedError("Please log in.", code="no_session")
        payload = decode_token(refresh_token, "refresh")
        stored_user_id = await self.redis.getdel(self._refresh_key(payload["jti"]))
        if stored_user_id is None or stored_user_id != payload["sub"]:
            raise UnauthorizedError("Session expired. Please log in again.", code="session_revoked")

        user = await self.users.get(uuid.UUID(payload["sub"]))
        if user is None or not user.is_active:
            raise UnauthorizedError("Please log in.", code="no_session")
        return await self._issue(user, touch_login=False)

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token, "refresh")
        except UnauthorizedError:
            return
        await self.redis.delete(self._refresh_key(payload["jti"]))

    async def _issue(self, user: User, *, touch_login: bool = True) -> IssuedTokens:
        if touch_login:
            user.last_login_at = datetime.now(UTC)
        subject = str(user.id)
        access = create_token(subject, "access", {"role": user.role.value})
        refresh = create_token(subject, "refresh")
        refresh_payload = decode_token(refresh, "refresh")
        await self.redis.set(
            self._refresh_key(refresh_payload["jti"]),
            subject,
            ex=self.settings.refresh_token_expire_days * 86_400,
        )
        return IssuedTokens(
            access_token=access,
            refresh_token=refresh,
            expires_in=self.settings.access_token_expire_minutes * 60,
            user=user,
        )

    @staticmethod
    def _refresh_key(jti: str) -> str:
        return f"refresh:{jti}"
