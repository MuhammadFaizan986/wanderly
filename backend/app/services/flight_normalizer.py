"""Map raw Duffel offers into Wanderly's compact FlightOffer shape."""

import itertools
import re
from datetime import datetime
from decimal import Decimal
from typing import Any

from app.schemas.flight import Carrier, FlightOffer, Layover, Place, Segment, Slice

_DURATION = re.compile(r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?")


def parse_duration(value: str | None) -> int:
    """ISO-8601 duration ("P1DT2H30M") -> minutes."""
    match = _DURATION.fullmatch(value or "")
    if not match:
        return 0
    days, hours, minutes = (int(g) if g else 0 for g in match.groups())
    return days * 1440 + hours * 60 + minutes


def _naive_local(value: str) -> datetime:
    # Duffel publishes local wall-clock times; drop any offset so the UI shows them as-is.
    return datetime.fromisoformat(value).replace(tzinfo=None)


def _carrier(raw: dict[str, Any] | None) -> Carrier:
    raw = raw or {}
    return Carrier(
        iata_code=raw.get("iata_code") or "??",
        name=raw.get("name") or "Unknown airline",
        logo_url=raw.get("logo_symbol_url"),
    )


def _place(raw: dict[str, Any]) -> Place:
    return Place(
        iata_code=raw["iata_code"],
        name=raw.get("name") or raw["iata_code"],
        city=raw.get("city_name") or (raw.get("city") or {}).get("name") or raw["iata_code"],
    )


def _segment(raw: dict[str, Any]) -> Segment:
    departing, arriving = _naive_local(raw["departing_at"]), _naive_local(raw["arriving_at"])
    marketing = _carrier(raw.get("marketing_carrier"))
    number = raw.get("marketing_carrier_flight_number") or ""
    return Segment(
        flight_number=f"{marketing.iata_code} {number}".strip(),
        marketing_carrier=marketing,
        operating_carrier=_carrier(raw.get("operating_carrier") or raw.get("marketing_carrier")),
        aircraft=(raw.get("aircraft") or {}).get("name"),
        origin=_place(raw["origin"]),
        destination=_place(raw["destination"]),
        departing_at=departing,
        arriving_at=arriving,
        duration_minutes=parse_duration(raw.get("duration")),
    )


def _slice(raw: dict[str, Any]) -> Slice:
    segments = [_segment(s) for s in raw["segments"]]
    layovers = []
    for prev, nxt in itertools.pairwise(segments):
        # Same airport for arrival and next departure; local clocks match, so subtract directly.
        gap = int((nxt.departing_at - prev.arriving_at).total_seconds() // 60)
        layovers.append(Layover(airport=prev.destination, duration_minutes=max(gap, 0)))
    duration = parse_duration(raw.get("duration")) or (
        sum(s.duration_minutes for s in segments) + sum(lay.duration_minutes for lay in layovers)
    )
    return Slice(
        origin=_place(raw["origin"]),
        destination=_place(raw["destination"]),
        departing_at=segments[0].departing_at,
        arriving_at=segments[-1].arriving_at,
        duration_minutes=duration,
        stops=len(segments) - 1,
        segments=segments,
        layovers=layovers,
    )


def _bags(raw_slices: list[dict[str, Any]], bag_type: str) -> int:
    # The allowance that applies to the whole trip is the smallest across segments.
    counts = [
        sum(b.get("quantity", 0) for b in pax.get("baggages", []) if b.get("type") == bag_type)
        for s in raw_slices
        for seg in s["segments"]
        for pax in seg.get("passengers", [])[:1]
    ]
    return min(counts) if counts else 0


def normalize_offer(raw: dict[str, Any], cabin_class: str) -> FlightOffer:
    slices = [_slice(s) for s in raw["slices"]]
    conditions = raw.get("conditions") or {}
    refund = conditions.get("refund_before_departure") or {}
    change = conditions.get("change_before_departure") or {}
    emissions = raw.get("total_emissions_kg")
    return FlightOffer(
        id=raw["id"],
        total_amount=Decimal(raw["total_amount"]),
        base_amount=Decimal(raw["base_amount"]) if raw.get("base_amount") else None,
        tax_amount=Decimal(raw["tax_amount"]) if raw.get("tax_amount") else None,
        currency=raw["total_currency"],
        expires_at=datetime.fromisoformat(raw["expires_at"]) if raw.get("expires_at") else None,
        owner=_carrier(raw.get("owner")),
        slices=slices,
        cabin_class=cabin_class,
        checked_bags=_bags(raw["slices"], "checked"),
        carry_on_bags=_bags(raw["slices"], "carry_on"),
        refundable=bool(refund.get("allowed")),
        changeable=bool(change.get("allowed")),
        change_penalty=Decimal(change["penalty_amount"]) if change.get("penalty_amount") else None,
        emissions_kg=int(emissions) if emissions else None,
        total_duration_minutes=sum(s.duration_minutes for s in slices),
        max_stops=max(s.stops for s in slices),
    )
