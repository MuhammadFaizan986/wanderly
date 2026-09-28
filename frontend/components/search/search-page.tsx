"use client";

import { useQueries } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plane } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { SearchCard } from "@/components/search/search-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { CABIN_LABELS, parseSearchQuery } from "@/lib/search";
import type { Airport } from "@/lib/types";

export function SearchPage() {
  const searchParams = useSearchParams();
  const parsed = parseSearchQuery(new URLSearchParams(searchParams.toString()));
  const codes = [parsed.from, parsed.to];

  const [origin, destination] = useQueries({
    queries: codes.map((code) => ({
      queryKey: ["airport", code],
      queryFn: () => api.get<Airport>(`/airports/${code}`),
      enabled: !!code,
      staleTime: Infinity,
      retry: false,
    })),
  });
  const loading = (parsed.from && origin.isPending) || (parsed.to && destination.isPending);
  const ready = parsed.from && parsed.to && parsed.depart && origin.data && destination.data;
  const travelers = parsed.travelers.adults + parsed.travelers.children + parsed.travelers.infants;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {loading ? (
        <Skeleton className="h-44 rounded-[1.75rem]" />
      ) : (
        <SearchCard
          // Remount when the URL changes so the form picks up the new values.
          key={searchParams.toString()}
          showTabs={false}
          defaultValues={{
            tripType: parsed.tripType,
            origin: origin.data ?? null,
            destination: destination.data ?? null,
            dates: { from: parsed.depart, to: parsed.return },
            travelers: parsed.travelers,
          }}
        />
      )}

      <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
        <span className="grid size-16 animate-float place-items-center rounded-2xl bg-secondary text-primary">
          <Plane className="size-7" />
        </span>
        {ready ? (
          <>
            <h1 className="text-2xl font-bold">
              {origin.data!.city} → {destination.data!.city}
            </h1>
            <p className="text-muted-foreground">
              {format(parsed.depart!, "EEE, d MMM")}
              {parsed.return && ` – ${format(parsed.return, "EEE, d MMM")}`} · {travelers} traveler
              {travelers === 1 ? "" : "s"} · {CABIN_LABELS[parsed.travelers.cabin]}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Live flight results are being wired up next — your search is saved in the link.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Where to next?</h1>
            <p className="max-w-md text-muted-foreground">
              Choose your airports and dates above to search flights.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
