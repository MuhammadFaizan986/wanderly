"""Open-Meteo weather: live forecast within 16 days, last year's actuals beyond that."""

import json
from datetime import date, timedelta
from statistics import mean
from typing import Any

import httpx
from redis.asyncio import Redis

from app.clients.http import DEFAULT_TIMEOUT, request_with_retry
from app.core.exceptions import ExternalServiceError

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_DAYS = 16

# WMO weather codes -> short human description.
WMO = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "fog",
    51: "light drizzle",
    53: "drizzle",
    55: "heavy drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "freezing rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    77: "snow grains",
    80: "rain showers",
    81: "rain showers",
    82: "violent rain showers",
    85: "snow showers",
    86: "snow showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "thunderstorm with hail",
}


class WeatherClient:
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def geocode(self, name: str) -> dict[str, Any] | None:
        data = await self._get_json(
            GEOCODE_URL, {"name": name, "count": 1, "language": "en"}, 86_400 * 30
        )
        results = data.get("results") or []
        return results[0] if results else None

    async def summary(self, lat: float, lng: float, start: date, end: date) -> dict[str, Any]:
        """Daily weather for [start, end]; forecast if soon, else the same dates last year."""
        today = date.today()
        if start <= today + timedelta(days=FORECAST_DAYS - 1):
            end = min(end, today + timedelta(days=FORECAST_DAYS - 1))
            data = await self._get_json(
                FORECAST_URL,
                {
                    "latitude": lat,
                    "longitude": lng,
                    "start_date": max(start, today).isoformat(),
                    "end_date": end.isoformat(),
                    "daily": (
                        "temperature_2m_max,temperature_2m_min,"
                        "precipitation_probability_max,weather_code"
                    ),
                    "timezone": "auto",
                },
                3 * 3600,
            )
            daily = data["daily"]
            days = [
                {
                    "date": d,
                    "high_c": round(hi),
                    "low_c": round(lo),
                    "rain_chance_pct": rain,
                    "conditions": WMO.get(code, "mixed"),
                }
                for d, hi, lo, rain, code in zip(
                    daily["time"],
                    daily["temperature_2m_max"],
                    daily["temperature_2m_min"],
                    daily["precipitation_probability_max"],
                    daily["weather_code"],
                    strict=True,
                )
                if hi is not None and lo is not None
            ]
            return {"kind": "forecast", "days": days, **_averages(days)}

        # Too far out for a forecast: use what actually happened on those dates last year.
        last_year = [_shift_year(start, -1), _shift_year(end, -1)]
        data = await self._get_json(
            ARCHIVE_URL,
            {
                "latitude": lat,
                "longitude": lng,
                "start_date": last_year[0].isoformat(),
                "end_date": last_year[1].isoformat(),
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "timezone": "auto",
            },
            30 * 86_400,
        )
        daily = data["daily"]
        highs = [v for v in daily["temperature_2m_max"] if v is not None]
        lows = [v for v in daily["temperature_2m_min"] if v is not None]
        rain = [v for v in daily["precipitation_sum"] if v is not None]
        return {
            "kind": "typical",
            "note": f"Based on actual weather for the same dates in {last_year[0].year}",
            "avg_high_c": round(mean(highs)) if highs else None,
            "avg_low_c": round(mean(lows)) if lows else None,
            "rainy_days": sum(1 for r in rain if r >= 1),
            "total_days": len(rain),
        }

    async def _get_json(self, url: str, params: dict[str, Any], ttl: int) -> dict[str, Any]:
        key = "weather:" + url.rsplit("/", 1)[-1] + ":" + json.dumps(params, sort_keys=True)
        if cached := await self.redis.get(key):
            result: dict[str, Any] = json.loads(cached)
            return result
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                response = await request_with_retry(client, "GET", url, params=params)
        except httpx.HTTPError as exc:
            raise ExternalServiceError("Weather data is unavailable right now.") from exc
        data: dict[str, Any] = response.json()
        await self.redis.set(key, json.dumps(data), ex=ttl)
        return data


def _averages(days: list[dict[str, Any]]) -> dict[str, Any]:
    if not days:
        return {}
    return {
        "avg_high_c": round(mean(d["high_c"] for d in days)),
        "avg_low_c": round(mean(d["low_c"] for d in days)),
    }


def _shift_year(day: date, years: int) -> date:
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # Feb 29
        return day.replace(year=day.year + years, day=28)
