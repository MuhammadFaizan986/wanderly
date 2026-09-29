"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, Lightbulb, MapPin, Users, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { ItineraryMap } from "@/components/itinerary/itinerary-map";
import { CATEGORY_STYLES, dayColor, estimatedCost, TIME_LABELS } from "@/lib/itinerary";
import { formatDuration } from "@/lib/flights";
import type { Itinerary, ItineraryDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmtDay = (iso: string | null) => (iso ? format(parseISO(iso), "EEE d MMM") : null);

function DayCard({
  day,
  selected,
  updated,
  onSelect,
}: {
  day: ItineraryDay;
  selected: boolean;
  updated: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.article
      layout="position"
      className={cn(
        "rounded-3xl border bg-card p-4 shadow-soft transition-colors sm:p-5 print:break-inside-avoid print:shadow-none",
        selected ? "border-primary/50 ring-3 ring-primary/15" : "border-border",
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-soft"
          style={{ background: dayColor(day.day) }}
        >
          {day.day}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Day {day.day}
            {day.date && ` · ${fmtDay(day.date)}`}
          </span>
          <span className="block font-semibold text-balance">{day.title}</span>
        </span>
        <AnimatePresence>
          {updated && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success"
            >
              Updated
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <ol
        className="mt-4 space-y-4 border-l-2 border-dashed border-border pl-5"
        style={{ borderColor: `color-mix(in oklch, ${dayColor(day.day)} 35%, transparent)` }}
      >
        {day.activities.map((a, i) => {
          const style = CATEGORY_STYLES[a.category] ?? CATEGORY_STYLES.activity;
          return (
            <li key={`${a.title}-${i}`} className="relative">
              <span
                className="absolute top-1 -left-[1.95rem] grid size-5 place-items-center rounded-full text-[0.65rem] font-bold text-white ring-4 ring-card"
                style={{ background: dayColor(day.day) }}
              >
                {i + 1}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">
                  {a.start_time ?? TIME_LABELS[a.time]}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                    style.className,
                  )}
                >
                  <style.icon className="size-3" /> {style.label}
                </span>
                {a.duration_minutes && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {formatDuration(a.duration_minutes)}
                  </span>
                )}
                {a.cost_usd ? <span>~${a.cost_usd} pp</span> : null}
              </div>
              <p className="mt-1 font-semibold">{a.title}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" /> {a.place}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
            </li>
          );
        })}
      </ol>
    </motion.article>
  );
}

export function ItineraryView({
  itinerary,
  layout = "panel",
  changedDays = [],
}: {
  itinerary: Itinerary;
  layout?: "panel" | "page";
  changedDays?: number[];
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const cost = estimatedCost(itinerary);
  const toggle = (day: number) => setSelectedDay((d) => (d === day ? null : day));

  const facts = [
    { icon: MapPin, text: [itinerary.destination, itinerary.country].filter(Boolean).join(", ") },
    {
      icon: CalendarDays,
      text: itinerary.start_date
        ? `${fmtDay(itinerary.start_date)} – ${fmtDay(itinerary.end_date)}`
        : `${itinerary.days.length} days`,
    },
    itinerary.travelers
      ? {
          icon: Users,
          text: `${itinerary.travelers} traveler${itinerary.travelers > 1 ? "s" : ""}`,
        }
      : null,
    cost ? { icon: Wallet, text: `~$${cost} pp in activities` } : null,
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const dayChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
      <button
        type="button"
        onClick={() => setSelectedDay(null)}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
          selectedDay === null
            ? "border-foreground bg-foreground text-background"
            : "border-border hover:bg-muted",
        )}
      >
        All days
      </button>
      {itinerary.days.map((d) => (
        <button
          key={d.day}
          type="button"
          onClick={() => toggle(d.day)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            selectedDay === d.day
              ? "border-transparent text-white"
              : "border-border hover:bg-muted",
          )}
          style={selectedDay === d.day ? { background: dayColor(d.day) } : undefined}
        >
          <span className="size-2 rounded-full" style={{ background: dayColor(d.day) }} />
          Day {d.day}
        </button>
      ))}
    </div>
  );

  const map = (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border shadow-soft print:hidden",
        layout === "panel" ? "h-64" : "h-80 lg:h-[calc(100vh-12rem)]",
      )}
    >
      <ItineraryMap itinerary={itinerary} selectedDay={selectedDay} />
    </div>
  );

  const days = (
    <div className="space-y-4">
      {itinerary.days
        .filter((d) => layout === "page" || !selectedDay || d.day === selectedDay)
        .map((d) => (
          <DayCard
            key={d.day}
            day={d}
            selected={selectedDay === d.day}
            updated={changedDays.includes(d.day)}
            onSelect={() => toggle(d.day)}
          />
        ))}
      {itinerary.tips.length > 0 && (
        <div className="rounded-3xl border border-brand-4/30 bg-brand-4/5 p-5 print:break-inside-avoid">
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4 text-brand-4" /> Good to know
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {itinerary.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const header = (
    <header className="space-y-3">
      <h2
        className={cn(
          "font-bold text-balance",
          layout === "page" ? "text-3xl sm:text-4xl" : "text-xl",
        )}
      >
        {itinerary.title}
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {facts.map((f) => (
          <li key={f.text} className="inline-flex items-center gap-1.5">
            <f.icon className="size-4 text-primary" /> {f.text}
          </li>
        ))}
      </ul>
      {itinerary.summary && (
        <p className="text-sm leading-relaxed text-muted-foreground">{itinerary.summary}</p>
      )}
    </header>
  );

  if (layout === "page") {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {dayChips}
            {days}
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">{map}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {header}
      {map}
      {dayChips}
      {days}
    </div>
  );
}
