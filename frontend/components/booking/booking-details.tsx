"use client";

import { format, parseISO } from "date-fns";
import { Check, Copy, FlaskConical, Mail, Users } from "lucide-react";
import { useState } from "react";

import { AirlineLogo } from "@/components/flights/airline-logo";
import { FlightDetails } from "@/components/flights/flight-details";
import { formatMoney, PASSENGER_TYPE_LABELS } from "@/lib/flights";
import { TITLES } from "@/lib/booking";
import type { Booking } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  confirmed: "bg-success/15 text-success",
  pending: "bg-brand-4/15 text-brand-4",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
} as const;

export function BookingReference({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group inline-flex items-center gap-3 rounded-2xl px-5 py-3 border-gradient [--gradient-fill:var(--card)]"
      aria-label={`Copy booking reference ${value}`}
    >
      <span className="font-mono text-3xl font-bold tracking-[0.25em]">{value}</span>
      {copied ? (
        <Check className="size-5 text-success" />
      ) : (
        <Copy className="size-5 text-muted-foreground group-hover:text-foreground" />
      )}
    </button>
  );
}

export function BookingDetails({ booking }: { booking: Booking }) {
  const { offer } = booking;
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <AirlineLogo
            code={offer.owner.iata_code}
            name={offer.owner.name}
            src={offer.owner.logo_url}
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">
              {offer.slices[0].origin.city} {offer.slices.length > 1 ? "⇄" : "→"}{" "}
              {offer.slices[0].destination.city}
            </p>
            <p className="text-sm text-muted-foreground">
              {offer.owner.name} · booked {format(parseISO(booking.created_at), "d MMM yyyy")}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold capitalize",
              STATUS_STYLES[booking.status],
            )}
          >
            {booking.status}
          </span>
        </div>
        <FlightDetails offer={offer} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="size-4 text-primary" /> Travelers
          </p>
          <ul className="space-y-2 text-sm">
            {booking.passengers.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="font-medium">
                  {TITLES.find((t) => t.value === p.title)?.label} {p.given_name} {p.family_name}
                </span>
                <span className="text-muted-foreground">{PASSENGER_TYPE_LABELS[p.type]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center justify-between font-semibold">
            Total paid
            <span className="text-2xl font-extrabold text-price tabular">
              {formatMoney(booking.total_amount, booking.currency)}
            </span>
          </p>
          {booking.contact_email && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" /> Confirmation sent to {booking.contact_email}
            </p>
          )}
          {booking.source === "sample" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FlaskConical className="size-4" /> Test booking — no ticket was issued.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
