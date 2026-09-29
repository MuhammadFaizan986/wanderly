"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BookingDetails, BookingReference } from "@/components/booking/booking-details";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooking } from "@/hooks/use-bookings";

export function TripBookingPage({ id }: { id: string }) {
  const { data: booking, isPending, isError } = useBooking(id);
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> My Trips
      </Link>
      {isPending ? (
        <Skeleton className="h-96 rounded-3xl" />
      ) : isError ? (
        <p className="py-16 text-center text-muted-foreground">Booking not found.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Your booking</h1>
            {booking.booking_reference && <BookingReference value={booking.booking_reference} />}
          </div>
          <BookingDetails booking={booking} />
        </>
      )}
    </section>
  );
}
