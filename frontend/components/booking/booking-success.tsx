"use client";

import { CircleCheckBig, Luggage, Plane } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { BookingDetails, BookingReference } from "@/components/booking/booking-details";
import { Celebration } from "@/components/booking/celebration";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooking } from "@/hooks/use-bookings";

export function BookingSuccess({ id }: { id: string }) {
  const { data: booking, isPending, isError } = useBooking(id);

  if (isPending) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <Skeleton className="mx-auto h-40 w-full max-w-md rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </section>
    );
  }
  if (isError) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <Button asChild variant="brand" className="mt-6 h-11 px-6">
          <Link href="/trips">Go to My Trips</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="relative mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <Celebration />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.35 }}
        className="relative mb-10 flex flex-col items-center gap-4 text-center"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.15, bounce: 0.5 }}
          className="grid size-20 place-items-center rounded-full bg-success/15 text-success"
        >
          <CircleCheckBig className="size-10" />
        </motion.span>
        <h1 className="text-3xl font-bold sm:text-4xl">
          You&apos;re going to{" "}
          <span className="text-gradient">{booking.offer.slices[0].destination.city}</span>!
        </h1>
        <p className="text-muted-foreground">
          Your booking is confirmed. Here&apos;s your reference:
        </p>
        {booking.booking_reference && <BookingReference value={booking.booking_reference} />}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="brand" className="h-11 px-6">
            <Link href="/trips">
              <Luggage /> View My Trips
            </Link>
          </Button>
          <Button asChild variant="gradient-outline" className="h-11 px-6">
            <Link href="/search">
              <Plane /> Book another flight
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <BookingDetails booking={booking} />
      </motion.div>
    </section>
  );
}
