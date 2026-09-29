"use client";

import { useQueries } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, FlaskConical, Pencil, SlidersHorizontal, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { FilterPanel } from "@/components/flights/filter-panel";
import { FlightCard } from "@/components/flights/flight-card";
import { ResultsEmpty, ResultsError, ResultsLoading } from "@/components/flights/results-states";
import { SortTabs } from "@/components/flights/sort-tabs";
import { SearchCard } from "@/components/search/search-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlightSearch } from "@/hooks/use-flight-search";
import { api, ApiError } from "@/lib/api";
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  sortOffers,
  type FlightFilters,
  type SortKey,
} from "@/lib/flights";
import { CABIN_LABELS, parseSearchQuery, toIsoDate } from "@/lib/search";
import type { Airport, FlightSearchRequest } from "@/lib/types";

const PAGE_SIZE = 12;

export function SearchPage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const parsed = useMemo(() => parseSearchQuery(new URLSearchParams(queryString)), [queryString]);

  const [origin, destination] = useQueries({
    queries: [parsed.from, parsed.to].map((code) => ({
      queryKey: ["airport", code],
      queryFn: () => api.get<Airport>(`/airports/${code}`),
      enabled: !!code,
      staleTime: Infinity,
      retry: false,
    })),
  });

  const request: FlightSearchRequest | null =
    parsed.from && parsed.to && parsed.depart
      ? {
          origin: parsed.from,
          destination: parsed.to,
          departure_date: toIsoDate(parsed.depart),
          return_date: parsed.return ? toIsoDate(parsed.return) : undefined,
          adults: parsed.travelers.adults,
          children: parsed.travelers.children,
          infants: parsed.travelers.infants,
          cabin_class: parsed.travelers.cabin,
        }
      : null;

  const search = useFlightSearch(request);
  const [editing, setEditing] = useState(false);
  const [sort, setSort] = useState<SortKey>("best");
  const [filters, setFilters] = useState<FlightFilters>(EMPTY_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  // Reset view state whenever a new search runs (React's "adjust state on prop change").
  const [lastQuery, setLastQuery] = useState(queryString);
  if (lastQuery !== queryString) {
    setLastQuery(queryString);
    setFilters(EMPTY_FILTERS);
    setVisible(PAGE_SIZE);
    setEditing(false);
  }

  const results = useMemo(() => {
    const data = search.data;
    return data ? sortOffers(applyFilters(data.offers, filters), sort) : [];
  }, [search.data, filters, sort]);

  const travelers = parsed.travelers.adults + parsed.travelers.children + parsed.travelers.infants;
  const airportsLoading = (parsed.from && origin.isPending) || (parsed.to && destination.isPending);
  const showFullForm = !request || editing;
  const filterCount = activeFilterCount(filters);

  const updateFilters = (next: FlightFilters) => {
    setFilters(next);
    setVisible(PAGE_SIZE);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6">
      {/* Search summary / editor */}
      <div className="sticky top-18 z-30 -mx-4 bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        {airportsLoading ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {showFullForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative"
              >
                <SearchCard
                  key={queryString}
                  showTabs={false}
                  defaultValues={{
                    tripType: parsed.tripType,
                    origin: origin.data ?? null,
                    destination: destination.data ?? null,
                    dates: { from: parsed.depart, to: parsed.return },
                    travelers: parsed.travelers,
                  }}
                />
                {request && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    aria-label="Close search editor"
                    className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.button
                key="summary"
                type="button"
                onClick={() => setEditing(true)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left shadow-soft border-gradient [--gradient-fill:var(--card)] sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {origin.data?.city ?? parsed.from}{" "}
                    <span className="text-muted-foreground">{parsed.from}</span>
                    <span className="mx-2 text-primary">{parsed.return ? "⇄" : "→"}</span>
                    {destination.data?.city ?? parsed.to}{" "}
                    <span className="text-muted-foreground">{parsed.to}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {format(parsed.depart!, "d MMM")}
                      {parsed.return && ` – ${format(parsed.return, "d MMM")}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {travelers} · {CABIN_LABELS[parsed.travelers.cabin]}
                    </span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Pencil className="size-3.5" /> Edit
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>

      {!request ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">Where to next?</h1>
          <p className="mt-2 text-muted-foreground">
            Choose your airports and dates above to search flights.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-8 lg:grid-cols-[17rem_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-44 max-h-[calc(100vh-12rem)] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-soft">
              {search.data ? (
                <FilterPanel data={search.data} filters={filters} onChange={updateFilters} />
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-5" />
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            {search.isError ? (
              <ResultsError
                message={
                  search.error instanceof ApiError
                    ? search.error.message
                    : "Something went wrong. Please try again."
                }
                onRetry={() => search.refetch()}
              />
            ) : search.isPending || (search.isFetching && search.isPlaceholderData) ? (
              <ResultsLoading />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{results.length}</span> of{" "}
                    {search.data.offers.length} flights
                  </p>
                  <div className="flex items-center gap-2">
                    {search.data.source === "sample" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-4/15 px-2.5 py-1 text-xs font-medium text-foreground">
                        <FlaskConical className="size-3.5 text-brand-4" /> Sample data
                      </span>
                    )}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="rounded-full lg:hidden">
                          <SlidersHorizontal /> Filters
                          {filterCount > 0 && (
                            <span className="grid size-5 place-items-center rounded-full bg-primary text-[0.7rem] text-primary-foreground">
                              {filterCount}
                            </span>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent
                        side="bottom"
                        className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-5"
                      >
                        <SheetTitle className="sr-only">Filters</SheetTitle>
                        <FilterPanel
                          data={search.data}
                          filters={filters}
                          onChange={updateFilters}
                        />
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>

                {search.data.offers.length > 0 && (
                  <SortTabs
                    offers={applyFilters(search.data.offers, filters)}
                    value={sort}
                    onChange={setSort}
                  />
                )}

                {results.length === 0 ? (
                  <ResultsEmpty
                    filtered={search.data.offers.length > 0}
                    onReset={() => updateFilters(EMPTY_FILTERS)}
                  />
                ) : (
                  <div className="space-y-4">
                    {results.slice(0, visible).map((offer, i) => (
                      <FlightCard key={offer.id} offer={offer} travelers={travelers} index={i} />
                    ))}
                    {visible < results.length && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="gradient-outline"
                          className="h-11 px-8"
                          onClick={() => setVisible((v) => v + PAGE_SIZE)}
                        >
                          Show more flights ({results.length - visible} left)
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  Prices include taxes and fees. Fares can change until you book.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
