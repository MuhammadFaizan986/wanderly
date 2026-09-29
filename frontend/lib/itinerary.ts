import {
  BedDouble,
  Landmark,
  Martini,
  ShoppingBag,
  Ticket,
  TramFront,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type { ActivityCategory, Itinerary } from "@/lib/types";

export const CATEGORY_STYLES: Record<
  ActivityCategory,
  { icon: LucideIcon; label: string; className: string }
> = {
  sight: { icon: Landmark, label: "Sight", className: "bg-brand-1/15 text-brand-1" },
  food: { icon: UtensilsCrossed, label: "Food", className: "bg-brand-3/15 text-brand-3" },
  activity: { icon: Ticket, label: "Activity", className: "bg-brand-2/15 text-brand-2" },
  nature: { icon: Trees, label: "Nature", className: "bg-success/15 text-success" },
  shopping: { icon: ShoppingBag, label: "Shopping", className: "bg-brand-4/15 text-brand-4" },
  nightlife: { icon: Martini, label: "Nightlife", className: "bg-brand-2/15 text-brand-2" },
  transport: {
    icon: TramFront,
    label: "Getting around",
    className: "bg-muted text-muted-foreground",
  },
  rest: { icon: BedDouble, label: "Downtime", className: "bg-muted text-muted-foreground" },
};

/** One color per day, used for timeline dots and map pins/routes. */
export const DAY_COLORS = [
  "var(--brand-1)",
  "var(--brand-3)",
  "var(--brand-4)",
  "var(--brand-2)",
  "var(--success)",
  "oklch(0.6 0.15 220)",
  "oklch(0.62 0.17 20)",
];

export const dayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

export const TIME_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export function estimatedCost(itinerary: Itinerary) {
  return itinerary.days.reduce(
    (sum, d) => sum + d.activities.reduce((s, a) => s + (a.cost_usd ?? 0), 0),
    0,
  );
}
