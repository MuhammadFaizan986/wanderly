"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Leaflet touches `window`, so the map only renders in the browser. */
export const ItineraryMap = dynamic(() => import("@/components/itinerary/itinerary-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});
