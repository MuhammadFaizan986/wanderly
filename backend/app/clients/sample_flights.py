"""Realistic sample flight offers in Duffel's response format.

Used when no Duffel token is configured, so the whole search flow (normalizing, tagging,
caching, UI) runs exactly as it will against the live API. Results are deterministic for
a given search, so refreshing shows the same flights.

Local times use a longitude-based UTC offset approximation — good enough for demo data.
"""

import hashlib
import itertools
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from app.models import Airport
from app.schemas.flight import CabinClass, FlightSearchRequest

LOGO_BASE = "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo"


@dataclass(frozen=True)
class SampleAirline:
    iata: str
    name: str
    hubs: tuple[str, ...]
    price_factor: float
    low_cost: bool = False


AIRLINES: tuple[SampleAirline, ...] = (
    SampleAirline("ZZ", "Duffel Airways", (), 0.9),
    SampleAirline("EK", "Emirates", ("DXB",), 1.15),
    SampleAirline("FZ", "flydubai", ("DXB",), 0.82, low_cost=True),
    SampleAirline("QR", "Qatar Airways", ("DOH",), 1.12),
    SampleAirline("EY", "Etihad Airways", ("AUH",), 1.05),
    SampleAirline("G9", "Air Arabia", ("SHJ",), 0.7, low_cost=True),
    SampleAirline("TK", "Turkish Airlines", ("IST",), 1.0),
    SampleAirline("PK", "Pakistan International Airlines", ("KHI", "LHE", "ISB"), 0.92),
    SampleAirline("PA", "Airblue", ("KHI", "LHE", "ISB"), 0.8, low_cost=True),
    SampleAirline("SV", "Saudia", ("JED", "RUH"), 0.95),
    SampleAirline("WY", "Oman Air", ("MCT",), 0.98),
    SampleAirline("GF", "Gulf Air", ("BAH",), 0.9),
    SampleAirline("BA", "British Airways", ("LHR",), 1.2),
    SampleAirline("VS", "Virgin Atlantic", ("LHR",), 1.15),
    SampleAirline("LH", "Lufthansa", ("FRA", "MUC"), 1.15),
    SampleAirline("AF", "Air France", ("CDG",), 1.12),
    SampleAirline("KL", "KLM", ("AMS",), 1.1),
    SampleAirline("SQ", "Singapore Airlines", ("SIN",), 1.18),
    SampleAirline("TG", "Thai Airways", ("BKK",), 0.95),
    SampleAirline("MH", "Malaysia Airlines", ("KUL",), 0.93),
    SampleAirline("AI", "Air India", ("DEL", "BOM"), 0.9),
    SampleAirline("UL", "SriLankan Airlines", ("CMB",), 0.9),
    SampleAirline("J2", "Azerbaijan Airlines", ("GYD",), 0.9),
    SampleAirline("CX", "Cathay Pacific", ("HKG",), 1.15),
    SampleAirline("DL", "Delta Air Lines", ("ATL", "JFK"), 1.1),
    SampleAirline("UA", "United Airlines", ("ORD", "EWR"), 1.1),
    SampleAirline("AC", "Air Canada", ("YYZ",), 1.08),
    SampleAirline("QF", "Qantas", ("SYD",), 1.15),
    SampleAirline("MS", "EgyptAir", ("CAI",), 0.85),
    SampleAirline("ET", "Ethiopian Airlines", ("ADD",), 0.88),
)

HUB_CODES = sorted({hub for airline in AIRLINES for hub in airline.hubs})

DEPARTURE_TIMES = [
    (1, 30),
    (3, 15),
    (6, 40),
    (8, 25),
    (10, 5),
    (12, 50),
    (14, 35),
    (16, 45),
    (19, 10),
    (21, 55),
    (23, 40),
]

CABIN_MULTIPLIER = {
    CabinClass.ECONOMY: 1.0,
    CabinClass.PREMIUM_ECONOMY: 1.65,
    CabinClass.BUSINESS: 3.3,
    CabinClass.FIRST: 5.2,
}


@dataclass(frozen=True)
class Itinerary:
    airline: SampleAirline
    path: tuple[Airport, ...]  # origin, [hub], destination


def _km(a: Airport, b: Airport) -> float:
    lat1, lng1, lat2, lng2 = map(math.radians, (a.lat, a.lng, b.lat, b.lng))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    )
    return 6371 * 2 * math.asin(math.sqrt(h))


def _utc_offset(airport: Airport) -> timedelta:
    return timedelta(minutes=round(airport.lng / 15 * 2) * 30)


def _flight_minutes(a: Airport, b: Airport) -> int:
    return int(round((_km(a, b) / 800 * 60 + 35) / 5) * 5)


def _money(value: float) -> str:
    return str(Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _iso_duration(minutes: int) -> str:
    days, rem = divmod(minutes, 1440)
    hours, mins = divmod(rem, 60)
    return f"P{f'{days}D' if days else ''}T{hours}H{mins}M"


def _place(airport: Airport) -> dict[str, Any]:
    return {
        "type": "airport",
        "iata_code": airport.iata_code,
        "name": airport.name,
        "city_name": airport.city,
        "iata_country_code": airport.country_code,
        "latitude": airport.lat,
        "longitude": airport.lng,
    }


def _carrier(airline: SampleAirline) -> dict[str, Any]:
    return {
        "iata_code": airline.iata,
        "name": airline.name,
        "logo_symbol_url": f"{LOGO_BASE}/{airline.iata}.svg",
    }


class SampleFlightSource:
    def __init__(self, airports: dict[str, Airport]) -> None:
        """`airports` must include the origin, destination and every hub in HUB_CODES found."""
        self.airports = airports

    def search(self, request: FlightSearchRequest) -> dict[str, Any]:
        seed = hashlib.sha256(request.model_dump_json().encode()).hexdigest()
        rng = random.Random(seed)  # noqa: S311 (demo data, not security-sensitive)
        origin = self.airports[request.origin]
        destination = self.airports[request.destination]

        itineraries = self._itineraries(origin, destination)
        passengers = [
            {"id": f"pas_sample_{seed[:10]}{i}", "type": kind, "age": age}
            for i, (kind, age) in enumerate(
                [("adult", None)] * request.adults
                + [("child", 8)] * request.children
                + [("infant_without_seat", 1)] * request.infants
            )
        ]
        offers: list[dict[str, Any]] = []
        for itinerary in itineraries:
            out_times = rng.sample(DEPARTURE_TIMES, k=2 if itinerary.airline.iata != "ZZ" else 1)
            ret_times = rng.sample(DEPARTURE_TIMES, k=2) if request.return_date else [None]
            for out_t in out_times:
                for ret_t in ret_times:
                    offer = self._offer(request, itinerary, out_t, ret_t, rng)
                    offer["passengers"] = passengers
                    offers.append(offer)

        rng.shuffle(offers)
        now = datetime.now().astimezone()
        return {
            "id": f"orq_sample_{seed[:20]}",
            "live_mode": False,
            "cabin_class": request.cabin_class.value,
            "created_at": now.isoformat(),
            "passengers": passengers,
            "offers": offers[:60],
        }

    # -- itinerary building ----------------------------------------------------------

    def _itineraries(self, origin: Airport, destination: Airport) -> list[Itinerary]:
        direct_km = _km(origin, destination)
        route = {origin.iata_code, destination.iata_code}
        results: list[Itinerary] = []

        for airline in AIRLINES:
            if airline.iata == "ZZ":
                # Duffel's sandbox airline flies every route nonstop.
                results.append(Itinerary(airline, (origin, destination)))
                continue
            if route & set(airline.hubs):
                # Home carriers fly nonstop within their realistic range.
                max_nonstop_km = 3_800 if airline.low_cost else 8_000
                if direct_km < max_nonstop_km:
                    results.append(Itinerary(airline, (origin, destination)))
                continue
            best_hub = min(
                (self.airports[h] for h in airline.hubs if h in self.airports),
                key=lambda hub: _km(origin, hub) + _km(hub, destination),
                default=None,
            )
            if best_hub is None:
                continue
            detour = (_km(origin, best_hub) + _km(best_hub, destination)) / max(direct_km, 1)
            if detour < 1.3 and not (airline.low_cost and direct_km > 5000):
                results.append(Itinerary(airline, (origin, best_hub, destination)))

        return results

    # -- offer building --------------------------------------------------------------

    def _offer(
        self,
        request: FlightSearchRequest,
        itinerary: Itinerary,
        out_time: tuple[int, int],
        ret_time: tuple[int, int] | None,
        rng: random.Random,
    ) -> dict[str, Any]:
        airline = itinerary.airline
        slices = [self._slice(itinerary.path, request.departure_date, out_time, airline, rng)]
        if request.return_date and ret_time:
            back = tuple(reversed(itinerary.path))
            slices.append(self._slice(back, request.return_date, ret_time, airline, rng))

        total_km = sum(_km(a, b) for a, b in itertools.pairwise(itinerary.path)) * len(slices)
        fare = (70 + total_km * rng.uniform(0.05, 0.085)) * airline.price_factor
        fare *= CABIN_MULTIPLIER[request.cabin_class]
        fare *= 1.12 if len(itinerary.path) == 2 else 1.0  # people pay for nonstop
        days_out = (request.departure_date - date.today()).days
        fare *= 1.3 if days_out < 7 else 1.12 if days_out < 21 else 1.0
        per_adult = fare
        total = per_adult * (request.adults + 0.75 * request.children + 0.1 * request.infants)
        tax = total * rng.uniform(0.14, 0.22)

        business = request.cabin_class in (CabinClass.BUSINESS, CabinClass.FIRST)
        checked = 2 if business else (0 if airline.low_cost and rng.random() < 0.6 else 1)
        for slice_ in slices:
            for segment in slice_["segments"]:
                segment["passengers"] = [
                    {
                        "cabin_class": request.cabin_class.value,
                        "baggages": [
                            {"type": "checked", "quantity": checked},
                            {"type": "carry_on", "quantity": 1},
                        ],
                    }
                ]

        offer_id = hashlib.sha256(
            f"{request.model_dump_json()}{airline.iata}{out_time}{ret_time}".encode()
        ).hexdigest()[:22]
        refundable = business or rng.random() < 0.2
        return {
            "id": f"off_sample_{offer_id}",
            "total_amount": _money(total),
            "total_currency": "USD",
            "base_amount": _money(total - tax),
            "base_currency": "USD",
            "tax_amount": _money(tax),
            "tax_currency": "USD",
            "expires_at": (datetime.now().astimezone() + timedelta(minutes=30)).isoformat(),
            "total_emissions_kg": str(int(total_km * 0.09 * (2.5 if business else 1))),
            "owner": _carrier(airline),
            "slices": slices,
            "conditions": {
                "refund_before_departure": {"allowed": refundable},
                "change_before_departure": {
                    "allowed": not airline.low_cost or business,
                    "penalty_amount": None if business else _money(rng.choice([50, 75, 100])),
                    "penalty_currency": "USD",
                },
            },
        }

    def _slice(
        self,
        path: tuple[Airport, ...],
        day: date,
        dep_time: tuple[int, int],
        airline: SampleAirline,
        rng: random.Random,
    ) -> dict[str, Any]:
        # Work in UTC, render each timestamp in its airport's local time.
        local_dep = datetime.combine(day, datetime.min.time()).replace(
            hour=dep_time[0], minute=dep_time[1]
        )
        current_utc = local_dep - _utc_offset(path[0])
        start_utc = current_utc
        segments = []
        for i, (a, b) in enumerate(itertools.pairwise(path)):
            if i > 0:
                current_utc += timedelta(minutes=rng.choice([75, 95, 120, 150, 190, 260]))
            minutes = _flight_minutes(a, b)
            arrive_utc = current_utc + timedelta(minutes=minutes)
            km = _km(a, b)
            segments.append(
                {
                    "origin": _place(a),
                    "destination": _place(b),
                    "departing_at": (current_utc + _utc_offset(a)).isoformat(),
                    "arriving_at": (arrive_utc + _utc_offset(b)).isoformat(),
                    "duration": _iso_duration(minutes),
                    "marketing_carrier": _carrier(airline),
                    "operating_carrier": _carrier(airline),
                    "marketing_carrier_flight_number": str(rng.randint(100, 989)),
                    "aircraft": {
                        "name": rng.choice(
                            ["Airbus A320neo", "Boeing 737-800", "Airbus A321"]
                            if km < 2800
                            else ["Boeing 777-300ER", "Airbus A350-900", "Boeing 787-9"]
                        )
                    },
                }
            )
            current_utc = arrive_utc
        return {
            "origin": _place(path[0]),
            "destination": _place(path[-1]),
            "duration": _iso_duration(int((current_utc - start_utc).total_seconds() // 60)),
            "segments": segments,
        }


def sample_order(offer_id: str) -> dict[str, Any]:
    """Mimic Duffel's order response for a sample offer."""
    digest = hashlib.sha256(f"{offer_id}{datetime.now().isoformat()}".encode()).hexdigest()
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    reference = "".join(
        alphabet[int(digest[i : i + 2], 16) % len(alphabet)] for i in range(0, 12, 2)
    )
    return {"id": f"ord_sample_{digest[:22]}", "booking_reference": reference, "live_mode": False}
