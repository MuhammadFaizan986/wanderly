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
  passengers?: OfferPassenger[];
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

export interface OfferPassenger {
  id: string;
  type: "adult" | "child" | "infant_without_seat";
  age: number | null;
}

export interface OfferDetailsResponse {
  offer: FlightOffer & { passengers: OfferPassenger[] };
  source: "duffel" | "sample";
  price_changed: boolean;
  previous_total_amount: string | null;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "failed";
export type PassengerTitle = "mr" | "ms" | "mrs" | "miss" | "dr";

export interface BookedPassenger {
  id: string;
  type: OfferPassenger["type"];
  title: PassengerTitle;
  given_name: string;
  family_name: string;
  gender: "m" | "f";
  born_on: string;
}

export interface Booking {
  id: string;
  booking_reference: string | null;
  order_id: string | null;
  status: BookingStatus;
  total_amount: string;
  currency: string;
  origin: string;
  destination: string;
  departure_at: string;
  return_at: string | null;
  passengers: BookedPassenger[];
  contact_email: string | null;
  offer: FlightOffer;
  created_at: string;
  source: "duffel" | "sample";
}

export interface BookingSummary {
  id: string;
  booking_reference: string | null;
  status: BookingStatus;
  total_amount: string;
  currency: string;
  origin: string;
  destination: string;
  origin_city: string;
  destination_city: string;
  departure_at: string;
  return_at: string | null;
  passenger_count: number;
  airline: string;
  airline_logo_url: string | null;
  created_at: string;
}
