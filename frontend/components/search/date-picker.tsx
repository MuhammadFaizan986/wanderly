"use client";

import { addDays, format, startOfToday } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { FieldTile } from "@/components/search/field-tile";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MAX_DAYS_AHEAD, type TripType } from "@/lib/search";

const fmt = (date?: Date) => (date ? format(date, "EEE, d MMM") : undefined);

export function TripDatePicker({
  tripType,
  value,
  onChange,
  error,
}: {
  tripType: TripType;
  value: DateRange;
  onChange: (range: DateRange) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const twoMonths = useMediaQuery("(min-width: 768px)", true);
  const today = startOfToday();
  const disabled = [{ before: today }, { after: addDays(today, MAX_DAYS_AHEAD) }];
  const roundTrip = tripType === "round_trip";

  const nights =
    roundTrip && value.from && value.to
      ? Math.round((value.to.getTime() - value.from.getTime()) / 86_400_000)
      : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldTile
          label={roundTrip ? "Depart — Return" : "Depart"}
          icon={CalendarDays}
          placeholder="Add dates"
          error={error}
          value={
            value.from &&
            (roundTrip ? `${fmt(value.from)} — ${fmt(value.to) ?? "Return?"}` : fmt(value.from))
          }
          sub={nights !== null ? `${nights} night${nights === 1 ? "" : "s"}` : undefined}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        {roundTrip ? (
          <Calendar
            mode="range"
            selected={value}
            onSelect={(range, day) => {
              // Clicking after a full range starts a new one instead of extending it.
              const next = value.from && value.to ? { from: day, to: undefined } : range;
              onChange(next ?? { from: undefined, to: undefined });
              if (next?.from && next.to) setOpen(false);
            }}
            numberOfMonths={twoMonths ? 2 : 1}
            defaultMonth={value.from ?? today}
            disabled={disabled}
            autoFocus
          />
        ) : (
          <Calendar
            mode="single"
            selected={value.from}
            onSelect={(day) => {
              onChange({ from: day, to: undefined });
              if (day) setOpen(false);
            }}
            numberOfMonths={twoMonths ? 2 : 1}
            defaultMonth={value.from ?? today}
            disabled={disabled}
            autoFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
