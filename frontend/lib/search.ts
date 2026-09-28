import { addDays, format, isValid, parseISO, startOfToday } from "date-fns";

import type { Airport, CabinClass } from "@/lib/types";

export type TripType = "round_trip" | "one_way";

export interface Travelers {
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
}

export interface FlightSearchParams extends Travelers {
  tripType: TripType;
  from: string;
  to: string;
  depart: string; // yyyy-MM-dd
  return?: string;
}

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

export const MAX_TRAVELERS = 9;
/** Airlines publish schedules roughly 11 months out. */
export const MAX_DAYS_AHEAD = 330;

export const DEFAULT_TRAVELERS: Travelers = {
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "economy",
};

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) && date >= startOfToday() ? date : undefined;
}

export function searchToQuery(params: FlightSearchParams): string {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    depart: params.depart,
    adults: String(params.adults),
    children: String(params.children),
    infants: String(params.infants),
    cabin: params.cabin,
  });
  if (params.tripType === "round_trip" && params.return) query.set("return", params.return);
  return query.toString();
}

export function parseSearchQuery(query: URLSearchParams) {
  const int = (key: string, fallback: number, min: number, max: number) => {
    const value = Number.parseInt(query.get(key) ?? "", 10);
    return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
  };
  const cabin = query.get("cabin");
  const depart = parseIsoDate(query.get("depart"));
  const ret = parseIsoDate(query.get("return"));
  return {
    from: query.get("from")?.toUpperCase() ?? undefined,
    to: query.get("to")?.toUpperCase() ?? undefined,
    depart,
    return: ret && depart && ret >= depart ? ret : undefined,
    tripType: (query.get("depart") && !query.get("return") ? "one_way" : "round_trip") as TripType,
    travelers: {
      adults: int("adults", 1, 1, MAX_TRAVELERS),
      children: int("children", 0, 0, MAX_TRAVELERS - 1),
      infants: int("infants", 0, 0, 4),
      cabin: (cabin && cabin in CABIN_LABELS ? cabin : "economy") as CabinClass,
    },
  };
}

export function defaultDates() {
  const depart = addDays(startOfToday(), 14);
  return { depart, return: addDays(depart, 7) };
}

/** Shown before the user types: common routes for the demo audience. */
export const SUGGESTED_AIRPORTS: Airport[] = [
  {
    iata_code: "LHE",
    name: "Allama Iqbal International Airport",
    city: "Lahore",
    country: "Pakistan",
    country_code: "PK",
    lat: 31.52,
    lng: 74.4,
    is_major: true,
  },
  {
    iata_code: "KHI",
    name: "Jinnah International Airport",
    city: "Karachi",
    country: "Pakistan",
    country_code: "PK",
    lat: 24.9,
    lng: 67.16,
    is_major: true,
  },
  {
    iata_code: "ISB",
    name: "Islamabad International Airport",
    city: "Islamabad",
    country: "Pakistan",
    country_code: "PK",
    lat: 33.55,
    lng: 72.83,
    is_major: true,
  },
  {
    iata_code: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "United Arab Emirates",
    country_code: "AE",
    lat: 25.25,
    lng: 55.36,
    is_major: true,
  },
  {
    iata_code: "IST",
    name: "İstanbul Airport",
    city: "Istanbul",
    country: "Turkey",
    country_code: "TR",
    lat: 41.26,
    lng: 28.74,
    is_major: true,
  },
  {
    iata_code: "LHR",
    name: "London Heathrow Airport",
    city: "London",
    country: "United Kingdom",
    country_code: "GB",
    lat: 51.47,
    lng: -0.45,
    is_major: true,
  },
];
