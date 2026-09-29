import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { OfferDetailsResponse } from "@/lib/types";

export function useOffer(offerId: string) {
  return useQuery({
    queryKey: ["offer", offerId],
    queryFn: () => api.get<OfferDetailsResponse>(`/flights/offers/${offerId}`),
    staleTime: 60_000,
    retry: false,
  });
}
