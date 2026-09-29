import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { SharePrintButton } from "@/components/itinerary/share-print-button";
import { Button } from "@/components/ui/button";
import { serverGet } from "@/lib/server-api";
import type { PublicTrip } from "@/lib/types";

const getTrip = cache((slug: string) => serverGet<PublicTrip>(`/public/trips/${slug}`));

export async function generateMetadata({ params }: PageProps<"/share/[slug]">): Promise<Metadata> {
  const trip = await getTrip((await params).slug);
  if (!trip) return { title: "Itinerary not found" };
  const days = trip.itinerary.days.length;
  return {
    title: trip.title,
    description:
      `A ${days}-day ${trip.itinerary.destination} itinerary planned with Wanderly. ${trip.itinerary.summary}`.slice(
        0,
        200,
      ),
    openGraph: { title: trip.title, description: trip.itinerary.summary.slice(0, 200) },
  };
}

export default async function SharePage({ params }: PageProps<"/share/[slug]">) {
  const trip = await getTrip((await params).slug);
  if (!trip) notFound();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border-gradient [--gradient-fill:var(--card)]">
          <Sparkles className="size-4 text-brand-2" />
          {trip.owner_first_name
            ? `${trip.owner_first_name} planned this trip with Wanderly`
            : "Planned with Wanderly"}
        </p>
        <SharePrintButton />
      </div>

      <ItineraryView itinerary={trip.itinerary} layout="page" />

      <div className="relative overflow-hidden rounded-[2rem] bg-[image:var(--gradient-brand)] px-6 py-10 text-center text-white shadow-lift print:hidden">
        <h2 className="text-2xl font-bold sm:text-3xl">Want a trip like this?</h2>
        <p className="mx-auto mt-2 max-w-lg text-white/90">
          Tell Wanderly where you want to go and get your own day-by-day plan, with real flights, in
          minutes.
        </p>
        <Button
          asChild
          className="group mt-6 h-12 rounded-full bg-white px-7 text-base font-semibold text-black hover:bg-white/90"
        >
          <Link href={{ pathname: "/plan", query: { q: `Plan a trip like "${trip.title}"` } }}>
            <Sparkles /> Plan my trip
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
