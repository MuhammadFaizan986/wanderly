"use client";

import { ArrowRight, FlaskConical } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";

import { AirlineLogo } from "@/components/flights/airline-logo";
import { dayOffset, formatDuration, formatMoney, localTime, stopsLabel } from "@/lib/flights";
import type { FlightCardsPayload } from "@/lib/chat";
import type { FlightOffer } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAG_LABELS = { best: "Best value", cheapest: "Cheapest", fastest: "Fastest" } as const;

function CompactCard({ offer, index }: { offer: FlightOffer; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        "flex w-72 shrink-0 snap-start flex-col gap-3 rounded-2xl bg-card p-4 shadow-soft sm:w-auto",
        offer.tags.length
          ? "border-gradient [--gradient-fill:var(--card)]"
          : "border border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <AirlineLogo
          code={offer.owner.iata_code}
          name={offer.owner.name}
          src={offer.owner.logo_url}
          className="size-8 rounded-lg p-1"
        />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{offer.owner.name}</p>
        {offer.tags[0] && (
          <span className="rounded-full bg-brand-2/15 px-2 py-0.5 text-[0.68rem] font-semibold text-brand-2">
            {TAG_LABELS[offer.tags[0]]}
          </span>
        )}
      </div>
      {offer.slices.map((slice, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-11 font-bold tabular">{localTime(slice.departing_at)}</span>
          <span className="flex min-w-0 flex-1 flex-col items-center">
            <span className="text-[0.68rem] text-muted-foreground">
              {slice.origin.iata_code} · {formatDuration(slice.duration_minutes)} ·{" "}
              {slice.destination.iata_code}
            </span>
            <span className="h-px w-full bg-border" />
            <span
              className={cn(
                "text-[0.68rem] font-medium",
                slice.stops ? "text-brand-4" : "text-success",
              )}
            >
              {stopsLabel(slice.stops)}
            </span>
          </span>
          <span className="w-12 text-right font-bold tabular">
            {localTime(slice.arriving_at)}
            {dayOffset(slice) > 0 && (
              <sup className="text-[0.6rem] text-brand-3">+{dayOffset(slice)}</sup>
            )}
          </span>
        </div>
      ))}
      <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
        <div>
          <p className="text-lg font-extrabold text-price tabular">
            {formatMoney(offer.total_amount, offer.currency, true)}
          </p>
          <p className="text-[0.68rem] text-muted-foreground">
            {offer.checked_bags ? `${offer.checked_bags} bag incl.` : "Carry-on only"}
          </p>
        </div>
        <Link
          href={`/flights/${offer.id}` as Route}
          className="inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-brand)] px-4 py-2 text-xs font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5"
        >
          Book <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

export function ChatFlightCards({ payload }: { payload: FlightCardsPayload }) {
  const query = new URLSearchParams(
    Object.entries(payload.search).map(([k, v]) => [k, String(v)]),
  ).toString();
  return (
    <div className="space-y-2">
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
        {payload.offers.map((offer, i) => (
          <CompactCard key={offer.id} offer={offer} index={i} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Link
          href={`/search?${query}` as Route}
          className="font-semibold text-primary hover:underline"
        >
          See all {payload.total} flights {String(payload.search.from)} →{" "}
          {String(payload.search.to)}
        </Link>
        {payload.source === "sample" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <FlaskConical className="size-3" /> Sample data
          </span>
        )}
      </div>
    </div>
  );
}
