import type { Metadata } from "next";
import { Luggage } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "My Trips" };

export default function Page() {
  return (
    <ComingSoon
      icon={Luggage}
      title="My Trips"
      description="Your bookings and saved itineraries will live here."
    />
  );
}
