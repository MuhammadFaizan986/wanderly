import { TimerOff } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function OfferUnavailable({
  searchQuery,
  message,
}: {
  searchQuery?: string;
  message?: string;
}) {
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="grid size-16 animate-float place-items-center rounded-2xl bg-brand-4/15 text-brand-4">
        <TimerOff className="size-7" />
      </span>
      <h1 className="text-2xl font-bold">This fare has expired</h1>
      <p className="text-muted-foreground">
        {message ??
          "Airlines only hold prices for a short time. Search again to see current fares — it only takes a second."}
      </p>
      <Button asChild variant="brand" className="h-11 px-6">
        <Link href={(searchQuery ? `/search?${searchQuery}` : "/search") as Route}>
          Search again
        </Link>
      </Button>
    </section>
  );
}
