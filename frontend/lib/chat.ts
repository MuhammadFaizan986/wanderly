import type { FlightOffer } from "@/lib/types";

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
  | { kind: "weather"; payload: WeatherPayload };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  status?: "thinking" | "streaming" | "done" | "error";
  error?: string;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  messages: {
    id: string;
    role: "user" | "assistant" | "tool";
    content: string;
    ui: (FlightCardsPayload | WeatherPayload)[];
  }[];
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
      last.parts.push(
        ui.type === "flight_cards"
          ? { kind: "flights", payload: ui }
          : { kind: "weather", payload: ui },
      );
    }
  }
  return out;
}
