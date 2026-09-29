export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface Airport {
  iata_code: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  is_major: boolean;
}

export interface Photo {
  url: string;
  blur_hash: string | null;
  color: string | null;
  alt: string | null;
  photographer: string;
  photographer_url: string;
  unsplash_url: string;
}

export interface Destination {
  slug: string;
  city: string;
  country: string;
  country_code: string;
  iata_code: string;
  tagline: string;
  best_months: string;
  photo: Photo | null;
}

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

// ---- Flights -------------------------------------------------------------------------

export interface Carrier {
  iata_code: string;
  name: string;
  logo_url: string | null;
}

export interface Place {
  iata_code: string;
  name: string;
  city: string;
}

export interface Segment {
  flight_number: string;
  marketing_carrier: Carrier;
  operating_carrier: Carrier;
  aircraft: string | null;
  origin: Place;
  destination: Place;
  departing_at: string; // local wall-clock time, no offset
  arriving_at: string;
  duration_minutes: number;
}

export interface Layover {
  airport: Place;
  duration_minutes: number;
}

export interface FlightSlice {
  origin: Place;
  destination: Place;
  departing_at: string;
  arriving_at: string;
  duration_minutes: number;
  stops: number;
  segments: Segment[];
  layovers: Layover[];
}

export type OfferTag = "best" | "cheapest" | "fastest";

export interface FlightOffer {
  id: string;
  total_amount: string;
  base_amount: string | null;
  tax_amount: string | null;
  currency: string;
  expires_at: string | null;
  owner: Carrier;
  slices: FlightSlice[];
  cabin_class: CabinClass;
  checked_bags: number;
  carry_on_bags: number;
  refundable: boolean;
  changeable: boolean;
  change_penalty: string | null;
  emissions_kg: number | null;
  total_duration_minutes: number;
  max_stops: number;
  tags: OfferTag[];
  score: number;
}

export interface AirlineSummary {
  iata_code: string;
  name: string;
  logo_url: string | null;
  min_price: string;
  offer_count: number;
}

export interface FlightSearchResponse {
  search_id: string;
  source: "duffel" | "sample";
  currency: string;
  offers: FlightOffer[];
  airlines: AirlineSummary[];
  min_price: string | null;
  max_price: string | null;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  expires_at: string | null;
  cached: boolean;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  cabin_class: CabinClass;
}
