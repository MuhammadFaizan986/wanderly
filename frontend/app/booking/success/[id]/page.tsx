import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { BookingSuccess } from "@/components/booking/booking-success";

export const metadata: Metadata = { title: "Booking confirmed" };

export default async function BookingSuccessPage({ params }: PageProps<"/booking/success/[id]">) {
  const { id } = await params;
  return (
    <RequireAuth>
      <BookingSuccess id={id} />
    </RequireAuth>
  );
}
