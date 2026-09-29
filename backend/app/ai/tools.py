"""Tools the travel agent can call. Inputs are validated with Pydantic before running."""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_client import ToolSpec
from app.clients.weather import WeatherClient
from app.core.exceptions import AppError
from app.repositories.airports import AirportRepository
from app.schemas.flight import CabinClass, FlightOffer, FlightSearchRequest
from app.schemas.itinerary import Itinerary, ItineraryUpdate
from app.services.flight_service import FlightService
from app.services.itinerary_service import ItineraryService, apply_update

MAX_OFFERS_FOR_MODEL = 5  # trimmed results keep tokens (and cost) down
MAX_CARDS = 5


@dataclass
class ToolOutput:
    content: str | dict[str, Any] | list[Any]
    is_error: bool = False
    ui: list[dict[str, Any]] = field(default_factory=list)  # rich events for the chat UI


@dataclass
class ToolContext:
    session: AsyncSession
    redis: Redis
    conversation_id: uuid.UUID


# ---- Inputs ------------------------------------------------------------------------


class SearchAirportsInput(BaseModel):
    query: str = Field(min_length=2, max_length=64, description="City, airport name or IATA code")


class SearchFlightsInput(BaseModel):
    origin: str = Field(description="3-letter IATA airport code, e.g. LHE")
    destination: str = Field(description="3-letter IATA airport code, e.g. DXB")
    departure_date: date = Field(description="YYYY-MM-DD")
    return_date: date | None = Field(default=None, description="YYYY-MM-DD; omit for one-way")
    adults: int = Field(default=1, ge=1, le=9)
    children: int = Field(default=0, ge=0, le=8, description="Ages 2-11")
    infants: int = Field(default=0, ge=0, le=4, description="Under 2, on an adult's lap")
    cabin_class: Literal["economy", "premium_economy", "business", "first"] = "economy"


class GetWeatherInput(BaseModel):
    location: str = Field(min_length=2, max_length=80, description="City name or IATA code")
    start_date: date = Field(description="YYYY-MM-DD")
    end_date: date = Field(description="YYYY-MM-DD, at most 30 days after start_date")


def _spec(
    name: str, description: str, model: type[BaseModel], hide: tuple[str, ...] = ()
) -> ToolSpec:
    schema = model.model_json_schema()
    schema.pop("title", None)
    for key in hide:  # server-managed fields the model shouldn't fill in
        schema.get("properties", {}).pop(key, None)
    return ToolSpec(name=name, description=description, input_schema=schema)


TOOL_SPECS = [
    _spec(
        "search_airports",
        "Find airports by city, airport name or IATA code. Returns up to 5 matches with codes. "
        "Use it to resolve a place the traveler mentions into an airport code before "
        "searching flights.",
        SearchAirportsInput,
    ),
    _spec(
        "search_flights",
        "Search live flight offers between two airports. Returns the best few offers with prices "
        "(USD, total for all travelers), times in local time, stops and baggage, and shows them "
        "to the traveler as bookable cards. Use it whenever the traveler wants flight options "
        "or prices.",
        SearchFlightsInput,
    ),
    _spec(
        "get_weather",
        "Get the weather for a place and date range: a daily forecast when the dates are within 16 "
        "days, otherwise typical conditions based on the same dates last year. Use it to compare "
        "destinations or advise on packing.",
        GetWeatherInput,
    ),
    _spec(
        "create_itinerary",
        "Create a day-by-day itinerary for the trip. It appears in the traveler's itinerary "
        "panel with a map, so include accurate coordinates for every place. Use it once the "
        "destination and trip length are known. Replaces any existing itinerary.",
        Itinerary,
        hide=("center",),
    ),
    _spec(
        "update_itinerary",
        "Change the current itinerary. Send only what changes: full replacements for edited "
        "or added days (with their day number), day numbers to remove, or new title/summary/"
        "tips/start_date. Use for refinements like 'more food on day 2' or 'make day 3 relaxed'.",
        ItineraryUpdate,
    ),
]


# ---- Handlers ----------------------------------------------------------------------


async def search_airports(ctx: ToolContext, data: SearchAirportsInput) -> ToolOutput:
    airports = await AirportRepository(ctx.session).search(data.query, limit=5)
    if not airports:
        return ToolOutput(f"No airports match '{data.query}'.", is_error=True)
    return ToolOutput(
        [
            {"iata": a.iata_code, "name": a.name, "city": a.city, "country": a.country}
            for a in airports
        ]
    )


def _slice_summary(offer: FlightOffer) -> list[dict[str, Any]]:
    return [
        {
            "from": s.origin.iata_code,
            "to": s.destination.iata_code,
            "depart_local": s.departing_at.isoformat(timespec="minutes"),
            "arrive_local": s.arriving_at.isoformat(timespec="minutes"),
            "duration_min": s.duration_minutes,
            "stops": s.stops,
            "via": [layover.airport.iata_code for layover in s.layovers],
        }
        for s in offer.slices
    ]


async def search_flights(ctx: ToolContext, data: SearchFlightsInput) -> ToolOutput:
    try:
        request = FlightSearchRequest(
            origin=data.origin,
            destination=data.destination,
            departure_date=data.departure_date,
            return_date=data.return_date,
            adults=data.adults,
            children=data.children,
            infants=data.infants,
            cabin_class=CabinClass(data.cabin_class),
        )
    except ValidationError as exc:
        return ToolOutput(f"Invalid search: {exc.errors()[0]['msg']}", is_error=True)

    try:
        result = await FlightService(ctx.session, ctx.redis).search(request)
    except AppError as exc:
        return ToolOutput(exc.message, is_error=True)

    if not result.offers:
        return ToolOutput("No flights found for this route and date.")

    # Offers arrive sorted by our best-value score; make sure cheapest and fastest are included.
    picks: list[FlightOffer] = []
    for offer in [
        *result.offers[:MAX_OFFERS_FOR_MODEL],
        *(o for o in result.offers if "cheapest" in o.tags or "fastest" in o.tags),
    ]:
        if offer not in picks:
            picks.append(offer)

    query = {
        "from": request.origin,
        "to": request.destination,
        "depart": request.departure_date.isoformat(),
        "adults": request.adults,
        "children": request.children,
        "infants": request.infants,
        "cabin": request.cabin_class.value,
    }
    if request.return_date:
        query["return"] = request.return_date.isoformat()

    return ToolOutput(
        {
            "total_offers": len(result.offers),
            "price_range_usd": [str(result.min_price), str(result.max_price)],
            "offers": [
                {
                    "offer_id": o.id,
                    "airline": o.owner.name,
                    "price_usd": str(o.total_amount),
                    "tags": o.tags,
                    "checked_bags": o.checked_bags,
                    "refundable": o.refundable,
                    "slices": _slice_summary(o),
                }
                for o in picks
            ],
            "note": "The traveler sees these as cards with Book buttons.",
        },
        ui=[
            {
                "type": "flight_cards",
                "offers": [o.model_dump(mode="json") for o in picks[:MAX_CARDS]],
                "total": len(result.offers),
                "search": query,
                "source": result.source,
            }
        ],
    )


async def get_weather(ctx: ToolContext, data: GetWeatherInput) -> ToolOutput:
    if data.end_date < data.start_date:
        return ToolOutput("end_date must be on or after start_date.", is_error=True)
    if data.start_date < date.today() - timedelta(days=1):
        return ToolOutput("Dates must be today or later.", is_error=True)
    end = min(data.end_date, data.start_date + timedelta(days=30))

    place: dict[str, Any] | None = None
    code = data.location.strip().upper()
    if len(code) == 3 and code.isalpha():
        airport = await AirportRepository(ctx.session).get(code)
        if airport:
            place = {
                "name": f"{airport.city}, {airport.country}",
                "lat": airport.lat,
                "lng": airport.lng,
            }
    weather = WeatherClient(ctx.redis)
    if place is None:
        geo = await weather.geocode(data.location)
        if geo is None:
            return ToolOutput(f"Couldn't find a place called '{data.location}'.", is_error=True)
        place = {
            "name": ", ".join(p for p in (geo.get("name"), geo.get("country")) if p),
            "lat": geo["latitude"],
            "lng": geo["longitude"],
        }

    try:
        summary = await weather.summary(place["lat"], place["lng"], data.start_date, end)
    except AppError as exc:
        return ToolOutput(exc.message, is_error=True)
    return ToolOutput(
        {"location": place["name"], **summary},
        ui=[{"type": "weather", "location": place["name"], **summary}],
    )


def _itinerary_ui(itinerary: dict[str, Any], action: str) -> dict[str, Any]:
    return {
        "type": "itinerary",
        "action": action,
        "title": itinerary["title"],
        "day_count": len(itinerary["days"]),
        "itinerary": itinerary,
    }


def _itinerary_ack(itinerary: Itinerary, dropped: int, action: str) -> dict[str, Any]:
    ack: dict[str, Any] = {
        "status": action,
        "days": [f"Day {d.day}: {d.title}" for d in itinerary.days],
        "note": "Shown in the traveler's itinerary panel with a map; don't repeat it in full.",
    }
    if dropped:
        ack["warning"] = (
            f"{dropped} place(s) had coordinates far from {itinerary.destination} "
            "and were left off the map."
        )
    return ack


async def create_itinerary(ctx: ToolContext, data: Itinerary) -> ToolOutput:
    service = ItineraryService(ctx.session, ctx.redis)
    itinerary, dropped = await service.check_pins(data)
    saved = await service.save_to_conversation(ctx.conversation_id, itinerary)
    return ToolOutput(
        _itinerary_ack(itinerary, dropped, "created"), ui=[_itinerary_ui(saved, "created")]
    )


async def update_itinerary(ctx: ToolContext, data: ItineraryUpdate) -> ToolOutput:
    service = ItineraryService(ctx.session, ctx.redis)
    current = await service.current(ctx.conversation_id)
    if current is None:
        return ToolOutput("There is no itinerary yet. Use create_itinerary first.", is_error=True)
    try:
        updated = apply_update(current, data)
    except ValidationError as exc:
        return ToolOutput(f"INVALID_UPDATE: {exc.errors()[0]['msg']}", is_error=True)
    itinerary, dropped = await service.check_pins(updated)
    saved = await service.save_to_conversation(ctx.conversation_id, itinerary)
    return ToolOutput(
        _itinerary_ack(itinerary, dropped, "updated"), ui=[_itinerary_ui(saved, "updated")]
    )


Handler = Callable[[ToolContext, Any], Awaitable[ToolOutput]]
HANDLERS: dict[str, tuple[type[BaseModel], Handler]] = {
    "search_airports": (SearchAirportsInput, search_airports),
    "search_flights": (SearchFlightsInput, search_flights),
    "get_weather": (GetWeatherInput, get_weather),
    "create_itinerary": (Itinerary, create_itinerary),
    "update_itinerary": (ItineraryUpdate, update_itinerary),
}


def parse_input(name: str, raw: Any) -> BaseModel:
    """Validate raw model output against the tool's schema (raises ValidationError)."""
    model, _ = HANDLERS[name]
    return model.model_validate(raw)


def status_label(name: str, raw: Any) -> str:
    """Human-friendly progress text shown while a tool runs."""
    args = raw if isinstance(raw, dict) else {}
    if name == "search_flights":
        return f"Searching flights {args.get('origin', '')} → {args.get('destination', '')}".strip()
    if name == "get_weather":
        return f"Checking the weather in {args.get('location', 'your destination')}"
    if name == "search_airports":
        return f"Looking up airports for “{args.get('query', '')}”"
    if name == "create_itinerary":
        return f"Building your {args.get('destination', 'trip')} itinerary"
    if name == "update_itinerary":
        return "Updating your itinerary"
    return "Working on it"


async def run_tool(ctx: ToolContext, name: str, raw: Any) -> ToolOutput:
    if name not in HANDLERS:
        return ToolOutput(f"Unknown tool {name}.", is_error=True)
    try:
        data = parse_input(name, raw)
    except ValidationError as exc:
        # Report every problem so the model can fix them all in one retry.
        problems = "; ".join(
            f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()[:8]
        )
        return ToolOutput(f"INVALID_INPUT: {problems}", is_error=True)
    _, handler = HANDLERS[name]
    return await handler(ctx, data)
