import { CheckCircle2, CircleAlert, CloudSun, Loader2, MapPin, Plane } from "lucide-react";
import { motion } from "motion/react";

import type { ToolItem } from "@/lib/chat";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Plane> = {
  search_flights: Plane,
  get_weather: CloudSun,
  search_airports: MapPin,
};

export function ToolStatus({ items }: { items: ToolItem[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = ICONS[item.name] ?? Plane;
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              item.status === "running" && "border-primary/30 bg-primary/5 text-foreground",
              item.status === "done" && "border-border bg-muted/60 text-muted-foreground",
              item.status === "failed" && "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            <Icon className="size-3.5" />
            {item.label}
            {item.status === "running" && (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            )}
            {item.status === "done" && <CheckCircle2 className="size-3.5 text-success" />}
            {item.status === "failed" && <CircleAlert className="size-3.5" />}
          </motion.li>
        );
      })}
    </ul>
  );
}

export function ThinkingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      aria-live="polite"
    >
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-[image:var(--gradient-brand)]"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      {label}…
    </div>
  );
}
