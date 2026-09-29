"use client";

import { Timer } from "lucide-react";

import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

export function FareTimer({
  expiresAt,
  className,
}: {
  expiresAt: string | null;
  className?: string;
}) {
  const seconds = useCountdown(expiresAt);
  if (seconds === null) return null;
  const urgent = seconds < 5 * 60;
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        urgent ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
        className,
      )}
      aria-live="polite"
    >
      <Timer className="size-3.5" />
      {seconds > 0 ? <>Fare held for {formatCountdown(seconds)}</> : "Fare expired"}
    </p>
  );
}
