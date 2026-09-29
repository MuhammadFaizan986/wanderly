"use client";

import { CircleAlert, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { ChatFlightCards } from "@/components/chat/chat-flight-cards";
import { Markdown } from "@/components/chat/markdown";
import { ThinkingIndicator, ToolStatus } from "@/components/chat/tool-status";
import { WeatherCard } from "@/components/chat/weather-card";
import type { ChatMessage, MessagePart } from "@/lib/chat";

function renderParts(parts: MessagePart[]) {
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
    else out.push(<ChatFlightCards key={i} payload={part.payload} />);
  });
  flushWeather("w-end");
  return out;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
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
        {renderParts(message.parts)}
        {showThinking && (
          <ThinkingIndicator label={message.parts.length ? "Working on it" : "Thinking"} />
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
