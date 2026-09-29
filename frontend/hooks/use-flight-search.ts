import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { FlightSearchRequest, FlightSearchResponse } from "@/lib/types";

export function useFlightSearch(request: FlightSearchRequest | null) {
  return useQuery({
    queryKey: ["flights", "search", request],
    queryFn: () => api.post<FlightSearchResponse>("/flights/search", request),
    enabled: request !== null,
    // Offers expire server-side after ~10–30 min; don't show stale prices for long.
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
