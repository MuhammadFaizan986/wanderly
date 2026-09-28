"use client";

import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/utils";

export function ApiStatus() {
  const { data, isPending, isError } = useHealth();
  const ok = data?.status === "ok";

  const label = isPending
    ? "Connecting to API…"
    : isError
      ? "API offline"
      : ok
        ? "All systems operational"
        : "API degraded";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
      <span className="relative flex size-2">
        {ok && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            isPending ? "bg-muted-foreground" : ok ? "bg-success" : "bg-destructive",
          )}
        />
      </span>
      {label}
    </span>
  );
}
