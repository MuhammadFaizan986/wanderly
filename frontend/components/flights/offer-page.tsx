"use client";

import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { OfferUnavailable } from "@/components/booking/offer-unavailable";
import { TripSummary } from "@/components/booking/trip-summary";
import { FlightDetails } from "@/components/flights/flight-details";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOffer } from "@/hooks/use-offer";
import { ApiError } from "@/lib/api";
import { formatMoney, offerSearchQuery } from "@/lib/flights";

export function OfferPage({ offerId }: { offerId: string }) {
  const router = useRouter();
  const { data, isPending, error } = useOffer(offerId);

  if (isPending) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-[28rem] rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </section>
    );
  }
  if (error) {
    return (
      <OfferUnavailable
        message={
          error instanceof ApiError && error.code !== "offer_expired" ? error.message : undefined
        }
      />
    );
  }

  const { offer } = data;
  const bookHref = `/booking/${offer.id}` as Route;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to results
      </button>

      {data.price_changed && data.previous_total_amount && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-4/40 bg-brand-4/10 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-brand-4" />
          <p>
            The airline updated this fare from{" "}
            <s>{formatMoney(data.previous_total_amount, offer.currency)}</s> to{" "}
            <strong>{formatMoney(offer.total_amount, offer.currency)}</strong>.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
        >
          <div className="p-5 sm:p-6">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {offer.slices[0].origin.city} <span className="text-gradient">to</span>{" "}
              {offer.slices[0].destination.city}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {offer.slices.length > 1 ? "Round trip" : "One way"} with {offer.owner.name}
            </p>
          </div>
          <FlightDetails offer={offer} />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 lg:sticky lg:top-24 lg:self-start"
        >
          <TripSummary offer={offer} />
          <Button asChild variant="brand" className="group h-12 w-full text-base">
            <Link href={bookHref}>
              Continue to booking
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You won&apos;t be charged — bookings run in test mode.
          </p>
          <Link
            href={`/search?${offerSearchQuery(offer)}` as Route}
            className="block text-center text-sm font-medium text-primary hover:underline"
          >
            See other flights
          </Link>
        </motion.aside>
      </div>
    </section>
  );
}
