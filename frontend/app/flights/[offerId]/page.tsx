import type { Metadata } from "next";
import { Ticket } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Flight details" };

export default function FlightDetailsPage() {
  return (
    <ComingSoon
      icon={Ticket}
      title="Flight details & booking"
      description="Passenger details, review and confirmation arrive in week 4."
    />
  );
}
