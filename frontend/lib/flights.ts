import { differenceInCalendarDays, format, parseISO } from "date-fns";

import type { FlightOffer, FlightSlice } from "@/lib/types";

export type SortKey = "best" | "cheapest" | "fastest";
export type TimeBucket = "night" | "morning" | "afternoon" | "evening";
export type StopsFilter = 0 | 1 | 2; // 2 means "2 or more"

export interface FlightFilters {
  stops: StopsFilter[];
  airlines: string[];
  maxPrice: number | null;
  departTimes: TimeBucket[];
  maxDuration: number | null;
}

export const EMPTY_FILTERS: FlightFilters = {
  stops: [],
  airlines: [],
  maxPrice: null,
  departTimes: [],
  maxDuration: null,
};

export const TIME_BUCKETS: {
  id: TimeBucket;
  label: string;
  range: string;
  from: number;
  to: number;
}[] = [
  { id: "morning", label: "Morning", range: "5am – 12pm", from: 5, to: 12 },
  { id: "afternoon", label: "Afternoon", range: "12pm – 6pm", from: 12, to: 18 },
  { id: "evening", label: "Evening", range: "6pm – 12am", from: 18, to: 24 },
  { id: "night", label: "Night", range: "12am – 5am", from: 0, to: 5 },
];

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/** Times are local wall-clock strings; parse without timezone conversion. */
export const localTime = (iso: string) => format(parseISO(iso), "HH:mm");
export const localDate = (iso: string) => format(parseISO(iso), "EEE, d MMM");

export function dayOffset(slice: FlightSlice) {
  return differenceInCalendarDays(parseISO(slice.arriving_at), parseISO(slice.departing_at));
}

export function formatMoney(amount: string | number, currency: string, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 0 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(Number(amount));
}

export function stopsLabel(stops: number) {
  return stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`;
}

function bucketOf(iso: string): TimeBucket {
  const hour = parseISO(iso).getHours();
  return TIME_BUCKETS.find((b) => hour >= b.from && hour < b.to)!.id;
}

export function applyFilters(offers: FlightOffer[], filters: FlightFilters) {
  return offers.filter((offer) => {
    if (
      filters.stops.length &&
      !filters.stops.includes(Math.min(offer.max_stops, 2) as StopsFilter)
    )
      return false;
    if (filters.airlines.length && !filters.airlines.includes(offer.owner.iata_code)) return false;
    if (filters.maxPrice !== null && Number(offer.total_amount) > filters.maxPrice) return false;
    if (filters.maxDuration !== null && offer.total_duration_minutes > filters.maxDuration)
      return false;
    if (
      filters.departTimes.length &&
      !filters.departTimes.includes(bucketOf(offer.slices[0].departing_at))
    )
      return false;
    return true;
  });
}

export function sortOffers(offers: FlightOffer[], sort: SortKey) {
  const sorted = [...offers];
  if (sort === "cheapest")
    sorted.sort((a, b) => Number(a.total_amount) - Number(b.total_amount) || a.score - b.score);
  else if (sort === "fastest")
    sorted.sort((a, b) => a.total_duration_minutes - b.total_duration_minutes || a.score - b.score);
  else sorted.sort((a, b) => a.score - b.score);
  return sorted;
}

export function activeFilterCount(filters: FlightFilters) {
  return (
    filters.stops.length +
    filters.airlines.length +
    filters.departTimes.length +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.maxDuration !== null ? 1 : 0)
  );
}

/** Rebuild the search URL an offer came from (used for "search again" on expiry). */
export function offerSearchQuery(offer: FlightOffer) {
  const out = offer.slices[0];
  const back = offer.slices[1];
  const count = (type: string) => offer.passengers?.filter((p) => p.type === type).length ?? 0;
  const query = new URLSearchParams({
    from: out.origin.iata_code,
    to: out.destination.iata_code,
    depart: out.departing_at.slice(0, 10),
    adults: String(Math.max(count("adult"), 1)),
    children: String(count("child")),
    infants: String(count("infant_without_seat")),
    cabin: offer.cabin_class,
  });
  if (back) query.set("return", back.departing_at.slice(0, 10));
  return query.toString();
}

export const PASSENGER_TYPE_LABELS = {
  adult: "Adult",
  child: "Child",
  infant_without_seat: "Infant",
} as const;
