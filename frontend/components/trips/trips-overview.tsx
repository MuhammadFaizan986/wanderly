"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ChevronRight, Luggage, Plane, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AirlineLogo } from "@/components/flights/airline-logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings } from "@/hooks/use-bookings";
import { formatMoney } from "@/lib/flights";
import type { BookingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// Booking times are stored as local wall-clock values; read them without timezone shifts.
const localDay = (iso: string) => parseISO(iso.slice(0, 19));

function BookingCard({ booking, index }: { booking: BookingSummary; index: number }) {
  const depart = localDay(booking.departure_at);
  const daysAway = differenceInCalendarDays(depart, new Date());
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/trips/bookings/${booking.id}` as Route}
        className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
      >
        <div className="hidden w-16 shrink-0 flex-col items-center rounded-2xl bg-[image:var(--gradient-brand)] py-2 text-white sm:flex">
          <span className="text-xs font-semibold uppercase">{format(depart, "MMM")}</span>
          <span className="text-2xl leading-none font-bold">{format(depart, "d")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {booking.origin_city} {booking.return_at ? "⇄" : "→"} {booking.destination_city}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {format(depart, "EEE, d MMM yyyy")}
            {booking.return_at && ` – ${format(localDay(booking.return_at), "d MMM")}`} ·{" "}
            {booking.passenger_count} traveler{booking.passenger_count > 1 ? "s" : ""}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <AirlineLogo
              code={booking.airline}
              name={booking.airline}
              src={booking.airline_logo_url}
              className="size-5 rounded-md p-0.5"
            />
            {booking.airline} · Ref{" "}
            <span className="font-mono font-semibold">{booking.booking_reference}</span>
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="font-bold tabular">
            {formatMoney(booking.total_amount, booking.currency, true)}
          </p>
          {daysAway >= 0 && (
            <p className="text-xs font-medium text-primary">
              {daysAway === 0 ? "Today" : `in ${daysAway} day${daysAway > 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.li>
  );
}

export function TripsOverview() {
  const { user } = useAuth();
  const { data, isPending } = useBookings();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const today = new Date(new Date().toDateString());
  const upcoming = (data ?? []).filter((b) => localDay(b.departure_at) >= today);
  const past = (data ?? []).filter((b) => localDay(b.departure_at) < today).reverse();
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">
        Hi {user?.full_name.split(" ")[0]} <span className="inline-block animate-float">👋</span>
      </h1>
      <p className="mt-1 text-muted-foreground">Your bookings and saved itineraries live here.</p>

      <div className="mt-8 flex gap-1 rounded-full bg-muted p-1 text-sm font-medium sm:w-fit">
        {(["upcoming", "past"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "relative flex-1 rounded-full px-5 py-1.5 capitalize transition-colors sm:flex-none",
              tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === key && (
              <motion.span
                layoutId="trips-tab"
                className="absolute inset-0 rounded-full bg-card shadow-soft"
              />
            )}
            <span className="relative">
              {key} {data && `(${key === "upcoming" ? upcoming.length : past.length})`}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        ) : list.length > 0 ? (
          <ul className="space-y-4">
            {list.map((b, i) => (
              <BookingCard key={b.id} booking={b} index={i} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <Luggage className="size-7" />
            </span>
            <h2 className="text-xl font-semibold">
              {tab === "upcoming" ? "No upcoming trips" : "No past trips yet"}
            </h2>
            <p className="max-w-sm text-muted-foreground">
              Plan a trip with the AI assistant or search for flights to get started.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="brand" className="h-11 px-6">
                <Link href="/plan">
                  <Sparkles /> Plan with AI
                </Link>
              </Button>
              <Button asChild variant="gradient-outline" className="h-11 px-6">
                <Link href="/search">
                  <Plane /> Search flights
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
