import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.redis import get_redis
from app.db.session import get_session
from app.models import User, UserRole
from app.repositories.users import UserRepository

DbSession = Annotated[AsyncSession, Depends(get_session)]
RedisClient = Annotated[Redis, Depends(get_redis)]

_bearer = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


async def get_optional_user(db: DbSession, credentials: BearerCredentials) -> User | None:
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials, "access")
    user = await UserRepository(db).get(uuid.UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise UnauthorizedError("Please log in.", code="invalid_token")
    return user


async def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise UnauthorizedError("Please log in.", code="not_authenticated")
    return user


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise ForbiddenError()
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
