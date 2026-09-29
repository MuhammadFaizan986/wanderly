import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Booking, BookingSummary } from "@/lib/types";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingSummary[]>("/bookings"),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => api.get<Booking>(`/bookings/${id}`),
    retry: false,
  });
}
