import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { TripBookingPage } from "@/components/trips/booking-page";

export const metadata: Metadata = { title: "Booking" };

export default async function Page({ params }: PageProps<"/trips/bookings/[id]">) {
  const { id } = await params;
  return (
    <RequireAuth>
      <TripBookingPage id={id} />
    </RequireAuth>
  );
}
