"use client";

import { CalendarRange, ChevronRight, CircleAlert, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { ChatFlightCards } from "@/components/chat/chat-flight-cards";
import { Markdown } from "@/components/chat/markdown";
import { ThinkingIndicator, ToolStatus } from "@/components/chat/tool-status";
import { WeatherCard } from "@/components/chat/weather-card";
import type { ChatMessage, MessagePart } from "@/lib/chat";

const PENDING_LABELS: Record<string, string> = {
  create_itinerary: "Drafting your day-by-day itinerary",
  update_itinerary: "Reworking your itinerary",
  search_flights: "Preparing a flight search",
  get_weather: "Checking the weather",
};

function renderParts(parts: MessagePart[], onOpenItinerary?: () => void) {
  const out: React.ReactNode[] = [];
  let weather: React.ReactNode[] = [];
  const flushWeather = (key: string) => {
    if (weather.length)
      out.push(
        <div key={key} className="flex flex-wrap gap-3">
          {weather}
        </div>,
      );
    weather = [];
  };
  parts.forEach((part, i) => {
    if (part.kind === "weather") {
      weather.push(<WeatherCard key={i} payload={part.payload} />);
      return;
    }
    flushWeather(`w-${i}`);
    if (part.kind === "text") out.push(<Markdown key={i}>{part.text}</Markdown>);
    else if (part.kind === "tools") out.push(<ToolStatus key={i} items={part.items} />);
    else if (part.kind === "itinerary")
      out.push(
        <button
          key={i}
          type="button"
          onClick={onOpenItinerary}
          className="flex w-full max-w-md items-center gap-3 rounded-2xl p-3 text-left shadow-soft transition-transform border-gradient [--gradient-fill:var(--card)] hover:-translate-y-0.5"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[image:var(--gradient-brand)] text-white">
            <CalendarRange className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-muted-foreground uppercase">
              Itinerary {part.payload.action}
            </span>
            <span className="block truncate font-semibold">{part.payload.title}</span>
            <span className="block text-xs text-muted-foreground">
              {part.payload.day_count} days · view the plan and map
            </span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>,
      );
    else out.push(<ChatFlightCards key={i} payload={part.payload} />);
  });
  flushWeather("w-end");
  return out;
}

export function MessageBubble({
  message,
  onOpenItinerary,
}: {
  message: ChatMessage;
  onOpenItinerary?: () => void;
}) {
  if (message.role === "user") {
    const text = message.parts[0]?.kind === "text" ? message.parts[0].text : "";
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-[image:var(--gradient-brand)] px-4 py-2.5 whitespace-pre-wrap text-white shadow-soft">
          {text}
        </p>
      </motion.div>
    );
  }

  const lastPart = message.parts.at(-1);
  const showThinking = message.status === "thinking" && lastPart?.kind !== "tools";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-white shadow-soft">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-3 pt-1">
        {renderParts(message.parts, onOpenItinerary)}
        {showThinking && (
          <ThinkingIndicator
            label={
              (message.pendingTool && PENDING_LABELS[message.pendingTool]) ??
              (message.parts.length ? "Working on it" : "Thinking")
            }
          />
        )}
        {message.status === "error" && (
          <p className="inline-flex items-center gap-2 rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <CircleAlert className="size-4" /> {message.error}
          </p>
        )}
      </div>
    </motion.div>
  );
}
