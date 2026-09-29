import type { FlightOffer, Itinerary } from "@/lib/types";

export interface FlightCardsPayload {
  type: "flight_cards";
  offers: FlightOffer[];
  total: number;
  search: Record<string, string | number>;
  source: "duffel" | "sample";
}

export interface WeatherPayload {
  type: "weather";
  location: string;
  kind: "forecast" | "typical";
  avg_high_c?: number | null;
  avg_low_c?: number | null;
  rainy_days?: number;
  total_days?: number;
  note?: string;
  days?: {
    date: string;
    high_c: number;
    low_c: number;
    rain_chance_pct: number | null;
    conditions: string;
  }[];
}

export interface ItineraryMarker {
  type: "itinerary";
  action: "created" | "updated";
  title: string;
  day_count: number;
  itinerary?: Itinerary; // present on live events, omitted in stored history
}

export interface ToolItem {
  id: string;
  name: string;
  label: string;
  status: "running" | "done" | "failed";
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "tools"; items: ToolItem[] }
  | { kind: "flights"; payload: FlightCardsPayload }
  | { kind: "weather"; payload: WeatherPayload }
  | { kind: "itinerary"; payload: ItineraryMarker };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  status?: "thinking" | "streaming" | "done" | "error";
  pendingTool?: string;
  error?: string;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  messages: {
    id: string;
    role: "user" | "assistant" | "tool";
    content: string;
    ui: (FlightCardsPayload | WeatherPayload | ItineraryMarker)[];
  }[];
  itinerary: Itinerary | null;
  trip_id: string | null;
}

/** Rebuild UI messages from stored history: consecutive non-user rows form one reply. */
export function fromHistory(detail: ConversationDetail): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const row of detail.messages) {
    if (row.role === "user") {
      out.push({ id: row.id, role: "user", parts: [{ kind: "text", text: row.content }] });
      continue;
    }
    let last = out.at(-1);
    if (!last || last.role !== "assistant") {
      last = { id: row.id, role: "assistant", parts: [], status: "done" };
      out.push(last);
    }
    if (row.content) last.parts.push({ kind: "text", text: row.content });
    for (const ui of row.ui) {
      if (ui.type === "flight_cards") last.parts.push({ kind: "flights", payload: ui });
      else if (ui.type === "weather") last.parts.push({ kind: "weather", payload: ui });
      else last.parts.push({ kind: "itinerary", payload: ui });
    }
  }
  return out;
}

/** Day numbers whose content differs between two versions of an itinerary. */
export function changedDays(prev: Itinerary | null, next: Itinerary): number[] {
  if (!prev) return [];
  return next.days
    .filter((d) => JSON.stringify(d) !== JSON.stringify(prev.days.find((p) => p.day === d.day)))
    .map((d) => d.day);
}
