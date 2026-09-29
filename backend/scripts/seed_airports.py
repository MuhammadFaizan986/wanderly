"""Seed the airports table from the OurAirports open dataset.

Keeps large and medium airports that have an IATA code and scheduled passenger service
(~4k rows). Safe to re-run: rows are upserted.

    uv run python -m scripts.seed_airports
    uv run python -m scripts.seed_airports --if-empty   # used on container start
"""

import asyncio
import csv
import io
import sys

import httpx
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.session import SessionLocal, engine
from app.models import Airport

AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
COUNTRIES_URL = "https://davidmegginson.github.io/ourairports-data/countries.csv"
BATCH_SIZE = 1000

logger = get_logger("seed_airports")


async def _download(client: httpx.AsyncClient, url: str) -> list[dict[str, str]]:
    response = await client.get(url)
    response.raise_for_status()
    return list(csv.DictReader(io.StringIO(response.text)))


def _to_row(raw: dict[str, str], countries: dict[str, str]) -> dict[str, object] | None:
    iata = raw["iata_code"].strip().upper()
    if (
        len(iata) != 3
        or not iata.isalpha()
        or raw["type"] not in {"large_airport", "medium_airport"}
        or raw["scheduled_service"] != "yes"
    ):
        return None
    country_code = raw["iso_country"].strip().upper()
    name = raw["name"].strip()
    return {
        "iata_code": iata,
        "name": name,
        # A few airports have no municipality; fall back to the airport name.
        "city": raw["municipality"].strip() or name,
        "country": countries.get(country_code, country_code),
        "country_code": country_code,
        "lat": float(raw["latitude_deg"]),
        "lng": float(raw["longitude_deg"]),
        "is_major": raw["type"] == "large_airport",
    }


async def main() -> None:
    configure_logging(get_settings())
    if "--if-empty" in sys.argv:
        async with SessionLocal() as session:
            count = await session.scalar(select(func.count()).select_from(Airport))
        if count:
            logger.info("airports_already_seeded", count=count)
            await engine.dispose()
            return
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        airports_raw, countries_raw = await asyncio.gather(
            _download(client, AIRPORTS_URL), _download(client, COUNTRIES_URL)
        )
    countries = {c["code"]: c["name"] for c in countries_raw}

    # Dedupe on IATA (a handful of codes appear twice); prefer the large airport.
    rows: dict[str, dict[str, object]] = {}
    for raw in airports_raw:
        row = _to_row(raw, countries)
        if row and (row["iata_code"] not in rows or row["is_major"]):
            rows[str(row["iata_code"])] = row

    values = list(rows.values())
    async with SessionLocal() as session:
        for start in range(0, len(values), BATCH_SIZE):
            batch = values[start : start + BATCH_SIZE]
            stmt = insert(Airport).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=[Airport.iata_code],
                set_={
                    col: stmt.excluded[col]
                    for col in ("name", "city", "country", "country_code", "lat", "lng", "is_major")
                },
            )
            await session.execute(stmt)
        await session.commit()
    await engine.dispose()
    logger.info(
        "airports_seeded", count=len(values), major=sum(bool(v["is_major"]) for v in values)
    )


if __name__ == "__main__":
    asyncio.run(main())
