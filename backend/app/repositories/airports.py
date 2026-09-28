from collections.abc import Sequence

from sqlalchemy import case, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Airport


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class AirportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, iata_code: str) -> Airport | None:
        return await self.session.get(Airport, iata_code.upper())

    async def search(self, query: str, limit: int = 8) -> Sequence[Airport]:
        """Rank: exact IATA code > city prefix > airport-name prefix > country > fuzzy match.

        Fuzzy matching uses pg_trgm (`%` operator + similarity) so typos like "istambul"
        still find Istanbul.
        """
        q = " ".join(query.split())
        prefix = f"{_escape_like(q)}%"
        contains = f"%{_escape_like(q)}%"
        iata = q.upper()

        rank = case(
            (Airport.iata_code == iata, 0),
            (Airport.city.ilike(prefix), 1),
            (Airport.name.ilike(prefix), 2),
            (Airport.country.ilike(prefix), 3),
            (Airport.name.ilike(contains), 4),
            else_=5,
        )
        similarity = func.greatest(
            func.similarity(Airport.city, q), func.similarity(Airport.name, q)
        )

        stmt = (
            select(Airport)
            .where(
                or_(
                    Airport.iata_code == iata,
                    Airport.city.ilike(prefix),
                    Airport.name.ilike(contains),
                    Airport.country.ilike(prefix),
                    Airport.city.op("%")(literal(q)),
                    Airport.name.op("%")(literal(q)),
                )
            )
            .order_by(rank, Airport.is_major.desc(), similarity.desc(), Airport.city)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
