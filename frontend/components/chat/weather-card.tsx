import { CloudRain, CloudSun, Sun, Thermometer } from "lucide-react";
import { motion } from "motion/react";

import type { WeatherPayload } from "@/lib/chat";

export function WeatherCard({ payload }: { payload: WeatherPayload }) {
  const hot = (payload.avg_high_c ?? 0) >= 27;
  const Icon = hot ? Sun : CloudSun;
  const rainy =
    payload.kind === "typical"
      ? `${payload.rainy_days ?? 0} of ${payload.total_days ?? 0} days rainy`
      : payload.days?.some((d) => (d.rain_chance_pct ?? 0) >= 50)
        ? "Some rain likely"
        : "Mostly dry";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex min-w-56 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
    >
      <span
        className={`grid size-10 place-items-center rounded-xl ${hot ? "bg-brand-4/15 text-brand-4" : "bg-brand-1/15 text-brand-1"}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{payload.location}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Thermometer className="size-3" />
            {payload.avg_high_c}° / {payload.avg_low_c}°
          </span>
          <span className="inline-flex items-center gap-0.5">
            <CloudRain className="size-3" /> {rainy}
          </span>
        </p>
        <p className="text-[0.65rem] text-muted-foreground">
          {payload.kind === "forecast" ? "Forecast" : "Typical for these dates"}
        </p>
      </div>
    </motion.div>
  );
}
