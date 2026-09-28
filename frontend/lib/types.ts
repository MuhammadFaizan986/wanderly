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
