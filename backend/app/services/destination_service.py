import asyncio

from redis.asyncio import Redis

from app.clients.unsplash import UnsplashClient
from app.schemas.destination import Destination, Photo

# Curated for the landing page; popular with travelers from South Asia and the Gulf.
POPULAR_DESTINATIONS: list[dict[str, str]] = [
    {
        "slug": "dubai",
        "city": "Dubai",
        "country": "United Arab Emirates",
        "country_code": "AE",
        "iata_code": "DXB",
        "tagline": "Skyline, souks and desert dunes",
        "best_months": "Nov – Mar",
        "query": "dubai skyline",
    },
    {
        "slug": "istanbul",
        "city": "Istanbul",
        "country": "Türkiye",
        "country_code": "TR",
        "iata_code": "IST",
        "tagline": "Where two continents meet",
        "best_months": "Apr – Jun",
        "query": "istanbul bosphorus mosque",
    },
    {
        "slug": "bali",
        "city": "Bali",
        "country": "Indonesia",
        "country_code": "ID",
        "iata_code": "DPS",
        "tagline": "Rice terraces and beach sunsets",
        "best_months": "Apr – Oct",
        "query": "bali rice terrace",
    },
    {
        "slug": "baku",
        "city": "Baku",
        "country": "Azerbaijan",
        "country_code": "AZ",
        "iata_code": "GYD",
        "tagline": "Old walls, flame towers",
        "best_months": "May – Sep",
        "query": "baku flame towers",
    },
    {
        "slug": "maldives",
        "city": "Malé",
        "country": "Maldives",
        "country_code": "MV",
        "iata_code": "MLE",
        "tagline": "Overwater villas, turquoise lagoons",
        "best_months": "Dec – Apr",
        "query": "maldives overwater villa",
    },
    {
        "slug": "bangkok",
        "city": "Bangkok",
        "country": "Thailand",
        "country_code": "TH",
        "iata_code": "BKK",
        "tagline": "Temples, street food and night markets",
        "best_months": "Nov – Feb",
        "query": "bangkok temple",
    },
    {
        "slug": "london",
        "city": "London",
        "country": "United Kingdom",
        "country_code": "GB",
        "iata_code": "LHR",
        "tagline": "Royal parks and West End nights",
        "best_months": "May – Sep",
        "query": "london tower bridge",
    },
    {
        "slug": "kuala-lumpur",
        "city": "Kuala Lumpur",
        "country": "Malaysia",
        "country_code": "MY",
        "iata_code": "KUL",
        "tagline": "Twin towers and rainforest escapes",
        "best_months": "Dec – Feb",
        "query": "kuala lumpur petronas",
    },
]


async def popular_destinations(redis: Redis) -> list[Destination]:
    unsplash = UnsplashClient(redis)
    photos = await asyncio.gather(*(unsplash.photo_for(d["query"]) for d in POPULAR_DESTINATIONS))
    return [
        Destination(
            **{k: v for k, v in d.items() if k != "query"},
            photo=Photo.model_validate(photo) if photo else None,
        )
        for d, photo in zip(POPULAR_DESTINATIONS, photos, strict=True)
    ]
