"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, PlaneLanding, PlaneTakeoff, Search } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { AirportCombobox } from "@/components/search/airport-combobox";
import { TripDatePicker } from "@/components/search/date-picker";
import { TravelerPicker } from "@/components/search/traveler-picker";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_TRAVELERS,
  searchToQuery,
  toIsoDate,
  type Travelers,
  type TripType,
} from "@/lib/search";
import type { Airport } from "@/lib/types";
import { cn } from "@/lib/utils";

const airportSchema = z.custom<Airport>((v) => !!v && typeof v === "object");

const schema = z
  .object({
    tripType: z.enum(["round_trip", "one_way"]),
    origin: airportSchema.nullable(),
    destination: airportSchema.nullable(),
    dates: z.object({ from: z.date().optional(), to: z.date().optional() }),
    travelers: z.custom<Travelers>(),
  })
  .superRefine((v, ctx) => {
    if (!v.origin) ctx.addIssue({ code: "custom", path: ["origin"], message: "Where from?" });
    if (!v.destination)
      ctx.addIssue({ code: "custom", path: ["destination"], message: "Where to?" });
    if (v.origin && v.destination && v.origin.iata_code === v.destination.iata_code)
      ctx.addIssue({ code: "custom", path: ["destination"], message: "Pick a different city" });
    if (!v.dates.from)
      ctx.addIssue({ code: "custom", path: ["dates"], message: "Pick a departure date" });
    else if (v.tripType === "round_trip" && !v.dates.to)
      ctx.addIssue({ code: "custom", path: ["dates"], message: "Pick a return date" });
  });

export type FlightSearchValues = z.infer<typeof schema>;

export function FlightSearchForm({
  defaultValues,
  compact = false,
}: {
  defaultValues?: Partial<FlightSearchValues>;
  compact?: boolean;
}) {
  const router = useRouter();
  const [swapTurns, setSwapTurns] = useState(0);

  const form = useForm<FlightSearchValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tripType: "round_trip",
      origin: null,
      destination: null,
      dates: { from: undefined, to: undefined },
      travelers: DEFAULT_TRAVELERS,
      ...defaultValues,
    },
  });
  const { errors } = form.formState;
  const [tripType, origin, destination] = useWatch({
    control: form.control,
    name: ["tripType", "origin", "destination"],
  });

  const onSubmit = form.handleSubmit((v) => {
    const query = searchToQuery({
      tripType: v.tripType,
      from: v.origin!.iata_code,
      to: v.destination!.iata_code,
      depart: toIsoDate(v.dates.from!),
      return: v.dates.to ? toIsoDate(v.dates.to) : undefined,
      ...v.travelers,
    });
    router.push(`/search?${query}` as Route);
  });

  const swap = () => {
    form.setValue("origin", destination);
    form.setValue("destination", origin);
    setSwapTurns((t) => t + 1);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Controller
        control={form.control}
        name="tripType"
        render={({ field }) => (
          <div className="flex gap-1 rounded-full bg-muted p-1 text-sm font-medium sm:w-fit">
            {(
              [
                ["round_trip", "Round trip"],
                ["one_way", "One way"],
              ] as [TripType, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  field.onChange(value);
                  if (value === "one_way") {
                    form.setValue("dates.to", undefined);
                  }
                }}
                className={cn(
                  "relative flex-1 rounded-full px-4 py-1.5 transition-colors sm:flex-none",
                  field.value === value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {field.value === value && (
                  <motion.span
                    layoutId={`trip-type-pill${compact ? "-compact" : ""}`}
                    className="absolute inset-0 rounded-full bg-card shadow-soft"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_auto]">
        {/* From / swap / To */}
        <div className="relative grid gap-3 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="origin"
            render={({ field }) => (
              <AirportCombobox
                label="From"
                icon={PlaneTakeoff}
                placeholder="City or airport"
                value={field.value}
                onChange={field.onChange}
                exclude={destination?.iata_code}
                error={errors.origin?.message}
              />
            )}
          />
          <motion.button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            animate={{ rotate: swapTurns * 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="absolute top-1/2 left-1/2 z-10 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-primary shadow-soft transition-colors hover:bg-primary hover:text-primary-foreground max-sm:rotate-90"
          >
            <ArrowLeftRight className="size-4" />
          </motion.button>
          <Controller
            control={form.control}
            name="destination"
            render={({ field }) => (
              <AirportCombobox
                label="To"
                icon={PlaneLanding}
                placeholder="City or airport"
                value={field.value}
                onChange={field.onChange}
                exclude={origin?.iata_code}
                error={errors.destination?.message}
              />
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="dates"
          render={({ field }) => (
            <TripDatePicker
              tripType={tripType}
              value={{ from: field.value.from, to: field.value.to }}
              onChange={(range) => field.onChange({ from: range.from, to: range.to })}
              error={errors.dates?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="travelers"
          render={({ field }) => <TravelerPicker value={field.value} onChange={field.onChange} />}
        />

        <Button
          type="submit"
          variant="brand"
          className="group h-auto min-h-14 rounded-2xl px-7 text-base"
        >
          <Search className="transition-transform group-hover:scale-110" />
          Search
        </Button>
      </div>
    </form>
  );
}
