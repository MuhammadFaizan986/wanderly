"use client";

import { AirlineLogo } from "@/components/flights/airline-logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  formatDuration,
  formatMoney,
  stopsLabel,
  TIME_BUCKETS,
  type FlightFilters,
  type StopsFilter,
} from "@/lib/flights";
import type { FlightOffer, FlightSearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border py-5 first:pt-0 last:border-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function FilterPanel({
  data,
  filters,
  onChange,
}: {
  data: FlightSearchResponse;
  filters: FlightFilters;
  onChange: (filters: FlightFilters) => void;
}) {
  const offers = data.offers;
  const minPrice = Math.floor(Number(data.min_price ?? 0));
  const maxPrice = Math.ceil(Number(data.max_price ?? 0));
  const minDur = data.min_duration_minutes ?? 0;
  const maxDur = data.max_duration_minutes ?? 0;

  // Cheapest price per stop count, computed with every other filter applied.
  const stopOptions = ([0, 1, 2] as StopsFilter[])
    .map((stops) => {
      const matching = applyFilters(offers, { ...filters, stops: [stops] });
      const cheapest = matching.reduce<FlightOffer | null>(
        (best, o) => (!best || Number(o.total_amount) < Number(best.total_amount) ? o : best),
        null,
      );
      const exists = offers.some((o) => Math.min(o.max_stops, 2) === stops);
      return { stops, cheapest, exists };
    })
    .filter((o) => o.exists);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        {activeFilterCount(filters) > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Reset all
          </button>
        )}
      </div>

      <Section title="Stops">
        {stopOptions.map(({ stops, cheapest }) => (
          <label key={stops} className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={filters.stops.includes(stops)}
              onCheckedChange={() => onChange({ ...filters, stops: toggle(filters.stops, stops) })}
            />
            <span className="flex-1">{stops === 2 ? "2+ stops" : stopsLabel(stops)}</span>
            <span className="text-xs text-muted-foreground tabular">
              {cheapest ? formatMoney(cheapest.total_amount, cheapest.currency, true) : "—"}
            </span>
          </label>
        ))}
      </Section>

      {maxPrice > minPrice && (
        <Section title="Max price">
          <Slider
            min={minPrice}
            max={maxPrice}
            step={10}
            value={[filters.maxPrice ?? maxPrice]}
            onValueChange={([v]) => onChange({ ...filters, maxPrice: v >= maxPrice ? null : v })}
          />
          <p className="text-sm text-muted-foreground">
            Up to{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(filters.maxPrice ?? maxPrice, data.currency, true)}
            </span>
          </p>
        </Section>
      )}

      <Section title="Outbound departure">
        <div className="grid grid-cols-2 gap-2">
          {TIME_BUCKETS.map((bucket) => {
            const active = filters.departTimes.includes(bucket.id);
            return (
              <button
                key={bucket.id}
                type="button"
                onClick={() =>
                  onChange({ ...filters, departTimes: toggle(filters.departTimes, bucket.id) })
                }
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                )}
              >
                <span className={cn("block text-sm font-medium", active && "text-primary")}>
                  {bucket.label}
                </span>
                <span className="block text-xs text-muted-foreground">{bucket.range}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {maxDur > minDur && (
        <Section title="Total travel time">
          <Slider
            min={minDur}
            max={maxDur}
            step={15}
            value={[filters.maxDuration ?? maxDur]}
            onValueChange={([v]) => onChange({ ...filters, maxDuration: v >= maxDur ? null : v })}
          />
          <p className="text-sm text-muted-foreground">
            Under{" "}
            <span className="font-semibold text-foreground">
              {formatDuration(filters.maxDuration ?? maxDur)}
            </span>
          </p>
        </Section>
      )}

      <Section title="Airlines">
        <div className="space-y-2.5">
          {data.airlines.map((airline) => (
            <label
              key={airline.iata_code}
              className="flex cursor-pointer items-center gap-3 text-sm"
            >
              <Checkbox
                checked={filters.airlines.includes(airline.iata_code)}
                onCheckedChange={() =>
                  onChange({ ...filters, airlines: toggle(filters.airlines, airline.iata_code) })
                }
              />
              <AirlineLogo
                code={airline.iata_code}
                name={airline.name}
                src={airline.logo_url}
                className="size-7 rounded-lg p-1"
              />
              <span className="min-w-0 flex-1 truncate">{airline.name}</span>
              <span className="text-xs text-muted-foreground tabular">
                {formatMoney(airline.min_price, data.currency, true)}
              </span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
