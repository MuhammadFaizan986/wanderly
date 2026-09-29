import Link from "next/link";

import { ApiStatus } from "@/components/landing/api-status";
import { Logo } from "@/components/layout/logo";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Describe your trip. Get real flights and a day-by-day plan. Book in minutes.
          </p>
          <ApiStatus />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/search" className="hover:text-foreground">
            Flights
          </Link>
          <Link href="/plan" className="hover:text-foreground">
            AI Planner
          </Link>
          <a
            href={config.apiDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            API docs
          </a>
        </div>
      </div>
    </footer>
  );
}
