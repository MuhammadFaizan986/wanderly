import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { BookingFlow } from "@/components/booking/booking-flow";

export const metadata: Metadata = { title: "Book your flight" };

export default async function BookingPage({ params }: PageProps<"/booking/[offerId]">) {
  const { offerId } = await params;
  return (
    <RequireAuth>
      <BookingFlow offerId={offerId} />
    </RequireAuth>
  );
}
