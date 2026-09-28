"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Plane, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { FieldTile } from "@/components/search/field-tile";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import { countryFlag } from "@/lib/flags";
import { SUGGESTED_AIRPORTS } from "@/lib/search";
import type { Airport } from "@/lib/types";

export function AirportCombobox({
  label,
  icon = MapPin,
  value,
  onChange,
  placeholder,
  error,
  exclude,
}: {
  label: string;
  icon?: LucideIcon;
  value: Airport | null;
  onChange: (airport: Airport) => void;
  placeholder: string;
  error?: string;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const term = useDebouncedValue(query.trim(), 180);
  const searching = term.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["airports", term.toLowerCase()],
    queryFn: () => api.get<Airport[]>("/airports/search", { query: { q: term, limit: 8 } }),
    enabled: searching,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  });

  const options = (searching ? (data ?? []) : SUGGESTED_AIRPORTS).filter(
    (a) => a.iata_code !== exclude,
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <FieldTile
          label={label}
          icon={icon}
          placeholder={placeholder}
          error={error}
          value={
            value ? (
              <>
                {value.city}{" "}
                <span className="font-medium text-muted-foreground">{value.iata_code}</span>
              </>
            ) : undefined
          }
          sub={value ? `${countryFlag(value.country_code)} ${value.name}` : undefined}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="City, airport or code"
              autoFocus
            />
            {isFetching && (
              <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <CommandList className="max-h-80">
            {searching && !isFetching && <CommandEmpty>No airports match “{term}”.</CommandEmpty>}
            <CommandGroup heading={searching ? "Airports" : "Popular"}>
              {options.map((airport) => (
                <CommandItem
                  key={airport.iata_code}
                  value={airport.iata_code}
                  onSelect={() => {
                    onChange(airport);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="gap-3 rounded-xl py-2.5"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {countryFlag(airport.country_code)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {airport.city}
                      <span className="font-normal text-muted-foreground">, {airport.country}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Plane className="size-3" /> {airport.name}
                    </span>
                  </span>
                  <span className="rounded-lg bg-secondary px-2 py-1 font-mono text-xs font-semibold text-secondary-foreground">
                    {airport.iata_code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
