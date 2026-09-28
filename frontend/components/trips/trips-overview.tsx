"use client";

import Link from "next/link";
import { Luggage, Plane, Sparkles } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function TripsOverview() {
  const { user } = useAuth();
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">
        Hi {user?.full_name.split(" ")[0]} <span className="inline-block animate-float">👋</span>
      </h1>
      <p className="mt-1 text-muted-foreground">Your bookings and saved itineraries live here.</p>

      <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Luggage className="size-7" />
        </span>
        <h2 className="text-xl font-semibold">No trips yet</h2>
        <p className="max-w-sm text-muted-foreground">
          Plan a trip with the AI assistant or search for flights to get started.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="brand" className="h-11 px-6">
            <Link href="/plan">
              <Sparkles /> Plan with AI
            </Link>
          </Button>
          <Button asChild variant="gradient-outline" className="h-11 px-6">
            <Link href="/search">
              <Plane /> Search flights
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
