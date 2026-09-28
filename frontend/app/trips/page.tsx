import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { TripsOverview } from "@/components/trips/trips-overview";

export const metadata: Metadata = { title: "My Trips" };

export default function TripsPage() {
  return (
    <RequireAuth>
      <TripsOverview />
    </RequireAuth>
  );
}
