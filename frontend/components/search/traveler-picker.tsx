"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useState } from "react";

import { FieldTile } from "@/components/search/field-tile";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CABIN_LABELS, MAX_TRAVELERS, type Travelers } from "@/lib/search";
import type { CabinClass } from "@/lib/types";
import { cn } from "@/lib/utils";

const rows = [
  { key: "adults", label: "Adults", hint: "12+ years" },
  { key: "children", label: "Children", hint: "2–11 years" },
  { key: "infants", label: "Infants", hint: "Under 2, on lap" },
] as const;

export function TravelerPicker({
  value,
  onChange,
}: {
  value: Travelers;
  onChange: (value: Travelers) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = value.adults + value.children + value.infants;

  const limits = {
    adults: { min: 1, max: MAX_TRAVELERS - value.children },
    children: { min: 0, max: MAX_TRAVELERS - value.adults },
    // One lap infant per adult.
    infants: { min: 0, max: value.adults },
  };

  const set = (key: (typeof rows)[number]["key"], delta: number) => {
    const next = { ...value, [key]: value[key] + delta };
    next.infants = Math.min(next.infants, next.adults);
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldTile
          label="Travelers"
          icon={Users}
          placeholder="1 traveler"
          value={`${total} traveler${total === 1 ? "" : "s"}`}
          sub={CABIN_LABELS[value.cabin]}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4 p-4">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                aria-label={`Remove ${row.label.toLowerCase()}`}
                disabled={value[row.key] <= limits[row.key].min}
                onClick={() => set(row.key, -1)}
              >
                <Minus />
              </Button>
              <span className="w-5 text-center font-semibold tabular">{value[row.key]}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                aria-label={`Add ${row.label.toLowerCase()}`}
                disabled={value[row.key] >= limits[row.key].max}
                onClick={() => set(row.key, 1)}
              >
                <Plus />
              </Button>
            </div>
          </div>
        ))}

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Cabin class</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CABIN_LABELS) as CabinClass[]).map((cabin) => (
              <button
                key={cabin}
                type="button"
                onClick={() => onChange({ ...value, cabin })}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  value.cabin === cabin
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {CABIN_LABELS[cabin]}
              </button>
            ))}
          </div>
        </div>

        <Button type="button" className="w-full rounded-xl" onClick={() => setOpen(false)}>
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}
