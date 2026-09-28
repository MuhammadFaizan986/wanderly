import { useQuery } from "@tanstack/react-query";

import { api, type HealthResponse } from "@/lib/api";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<HealthResponse>("/health"),
    refetchInterval: 30_000,
    retry: false,
  });
}
