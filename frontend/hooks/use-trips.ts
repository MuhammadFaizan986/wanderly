import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Trip, TripSummary } from "@/lib/types";

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: () => api.get<TripSummary[]>("/trips") });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ["trips", id],
    queryFn: () => api.get<Trip>(`/trips/${id}`),
    retry: false,
  });
}
