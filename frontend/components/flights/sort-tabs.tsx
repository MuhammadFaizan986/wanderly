"use client";

import { motion } from "motion/react";

import { formatDuration, formatMoney, sortOffers, type SortKey } from "@/lib/flights";
import type { FlightOffer } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<SortKey, string> = { best: "Best", cheapest: "Cheapest", fastest: "Fastest" };

export function SortTabs({
  offers,
  value,
  onChange,
}: {
  offers: FlightOffer[];
  value: SortKey;
  onChange: (sort: SortKey) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft">
      {(Object.keys(LABELS) as SortKey[]).map((key) => {
        const top = sortOffers(offers, key)[0];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="relative rounded-xl px-3 py-2.5 text-left transition-colors"
          >
            {active && (
              <motion.span
                layoutId="sort-tab"
                className="absolute inset-0 rounded-xl bg-[image:var(--gradient-brand)] opacity-95"
                transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
              />
            )}
            <span className={cn("relative block", active ? "text-white" : "")}>
              <span className="block text-sm font-semibold">{LABELS[key]}</span>
              {top && (
                <span
                  className={cn(
                    "block text-xs tabular",
                    active ? "text-white/85" : "text-muted-foreground",
                  )}
                >
                  {formatMoney(top.total_amount, top.currency, true)} ·{" "}
                  {formatDuration(top.total_duration_minutes)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
