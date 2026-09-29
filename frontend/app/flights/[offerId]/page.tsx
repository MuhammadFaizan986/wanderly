import type { Metadata } from "next";

import { OfferPage } from "@/components/flights/offer-page";

export const metadata: Metadata = { title: "Flight details" };

export default async function FlightDetailsPage({ params }: PageProps<"/flights/[offerId]">) {
  const { offerId } = await params;
  return <OfferPage offerId={offerId} />;
}
