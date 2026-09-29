"use client";

import { ChevronDown, Luggage, Zap, Crown, BadgeDollarSign } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { AirlineLogo } from "@/components/flights/airline-logo";
import { FlightDetails } from "@/components/flights/flight-details";
import { Button } from "@/components/ui/button";
import { dayOffset, formatDuration, formatMoney, localTime, stopsLabel } from "@/lib/flights";
import type { FlightOffer, FlightSlice, OfferTag } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAGS: Record<OfferTag, { label: string; icon: typeof Zap; className: string }> = {
  best: { label: "Best value", icon: Crown, className: "bg-brand-2/15 text-brand-2" },
  cheapest: { label: "Cheapest", icon: BadgeDollarSign, className: "bg-success/15 text-success" },
  fastest: { label: "Fastest", icon: Zap, className: "bg-brand-4/15 text-brand-4" },
};

function SliceRow({ slice }: { slice: FlightSlice }) {
  const plusDays = dayOffset(slice);
  const carriers = [...new Set(slice.segments.map((s) => s.marketing_carrier.name))].join(" · ");
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <AirlineLogo
        code={slice.segments[0].marketing_carrier.iata_code}
        name={slice.segments[0].marketing_carrier.name}
        src={slice.segments[0].marketing_carrier.logo_url}
        className="hidden sm:grid"
      />
      <div className="w-16 text-left">
        <p className="text-lg font-bold tabular">{localTime(slice.departing_at)}</p>
        <p className="text-xs font-medium text-muted-foreground">{slice.origin.iata_code}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <p className="text-xs text-muted-foreground">{formatDuration(slice.duration_minutes)}</p>
        <div className="relative flex w-full items-center">
          <span className="h-px flex-1 bg-border" />
          {slice.layovers.map((l) => (
            <span
              key={l.airport.iata_code}
              className="mx-1 size-2 rounded-full border-2 border-brand-4 bg-card"
              title={`Layover in ${l.airport.city}`}
            />
          ))}
          <span className="h-px flex-1 bg-border" />
        </div>
        <p
          className={cn(
            "truncate text-xs font-medium",
            slice.stops === 0 ? "text-success" : "text-brand-4",
          )}
        >
          {stopsLabel(slice.stops)}
          {slice.layovers.length > 0 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {slice.layovers.map((l) => l.airport.iata_code).join(", ")}
            </span>
          )}
        </p>
      </div>

      <div className="w-16 text-right">
        <p className="text-lg font-bold tabular">
          {localTime(slice.arriving_at)}
          {plusDays > 0 && (
            <sup className="ml-0.5 text-xs font-semibold text-brand-3">+{plusDays}</sup>
          )}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{slice.destination.iata_code}</p>
      </div>
      <p className="hidden w-32 truncate text-xs text-muted-foreground lg:block">{carriers}</p>
    </div>
  );
}

export function FlightCard({
  offer,
  travelers,
  index,
}: {
  offer: FlightOffer;
  travelers: number;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const highlighted = offer.tags.length > 0;

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04 }}
      className={cn(
        "overflow-hidden rounded-3xl bg-card shadow-soft transition-shadow hover:shadow-lift",
        highlighted ? "border-gradient [--gradient-fill:var(--card)]" : "border border-border",
      )}
    >
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {offer.tags.map((tag) => {
              const t = TAGS[tag];
              return (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    t.className,
                  )}
                >
                  <t.icon className="size-3.5" /> {t.label}
                </span>
              );
            })}
            <span className="text-sm font-medium text-muted-foreground">{offer.owner.name}</span>
          </div>
          {offer.slices.map((slice, i) => (
            <SliceRow key={i} slice={slice} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border p-4 sm:p-5 md:w-56 md:flex-col md:items-stretch md:justify-center md:border-t-0 md:border-l">
          <div className="md:text-right">
            <p className="text-2xl font-extrabold text-price tabular">
              {formatMoney(offer.total_amount, offer.currency, true)}
            </p>
            <p className="text-xs text-muted-foreground">
              {travelers > 1 ? `total for ${travelers} travelers` : "total per traveler"}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Luggage className="size-3.5" />
              {offer.checked_bags ? `${offer.checked_bags} bag incl.` : "Carry-on only"}
            </p>
          </div>
          <Button asChild variant="brand" className="h-11 px-6">
            <Link href={`/flights/${offer.id}`}>Select</Link>
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/60"
      >
        {open ? "Hide details" : "Flight details"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <FlightDetails offer={offer} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
