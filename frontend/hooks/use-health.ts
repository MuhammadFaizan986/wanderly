import { useQuery } from "@tanstack/react-query";

import { apiFetch, type HealthResponse } from "@/lib/api";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
    refetchInterval: 30_000,
    retry: false,
  });
}
