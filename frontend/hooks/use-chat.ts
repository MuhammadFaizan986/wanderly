"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError, streamEvents } from "@/lib/api";
import {
  changedDays as diffDays,
  fromHistory,
  type ChatMessage,
  type ConversationDetail,
  type FlightCardsPayload,
  type ItineraryMarker,
  type MessagePart,
  type WeatherPayload,
} from "@/lib/chat";
import type { Itinerary } from "@/lib/types";

type Updater = (message: ChatMessage) => ChatMessage;

function appendText(parts: MessagePart[], text: string): MessagePart[] {
  const last = parts.at(-1);
  if (last?.kind === "text")
    return [...parts.slice(0, -1), { kind: "text", text: last.text + text }];
  return [...parts, { kind: "text", text }];
}

export function useChat(conversationIdFromUrl: string | null, authReady: boolean) {
  // Read the URL only on mount: we write ?c= ourselves after creating a conversation,
  // and reacting to that change would reload (and wipe) the reply being streamed.
  const [initialConversationId] = useState(conversationIdFromUrl);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(!!initialConversationId);
  const [streaming, setStreaming] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [changed, setChanged] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const itineraryRef = useRef<Itinerary | null>(null);
  const changedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load an existing conversation (e.g. after a refresh with ?c=...).
  useEffect(() => {
    // Wait until the session is restored: an owned chat 404s for anonymous requests.
    if (!initialConversationId || !authReady) return;
    let cancelled = false;
    api
      .get<ConversationDetail>(`/chat/conversations/${initialConversationId}`)
      .then((detail) => {
        if (cancelled) return;
        setMessages(fromHistory(detail));
        setItinerary(detail.itinerary);
        itineraryRef.current = detail.itinerary;
        setTripId(detail.trip_id);
      })
      .catch(() => !cancelled && setConversationId(null))
      .finally(() => !cancelled && setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [initialConversationId, authReady]);

  const updateLast = useCallback((fn: Updater) => {
    setMessages((prev) => {
      const last = prev.at(-1);
      return last?.role === "assistant" ? [...prev.slice(0, -1), fn(last)] : prev;
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streaming) return;

      const stamp = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: `u-${stamp}`, role: "user", parts: [{ kind: "text", text: content }] },
        { id: `a-${stamp}`, role: "assistant", parts: [], status: "thinking" },
      ]);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let id = conversationId;
        if (!id) {
          const created = await api.post<{ id: string }>("/chat/conversations");
          id = created.id;
          setConversationId(id);
          // Keep the chat in the URL so a refresh restores it (no navigation).
          const url = new URL(window.location.href);
          url.searchParams.set("c", id);
          url.searchParams.delete("q");
          window.history.replaceState(null, "", url);
        }

        for await (const { event, data } of streamEvents(
          `/chat/conversations/${id}/messages`,
          { content },
          controller.signal,
        )) {
          const payload = data as Record<string, unknown>;
          switch (event) {
            case "thinking":
              updateLast((m) => ({ ...m, status: "thinking" }));
              break;
            case "tool_pending":
              updateLast((m) => ({
                ...m,
                status: "thinking",
                pendingTool: payload.name as string,
              }));
              break;
            case "text":
              updateLast((m) => ({
                ...m,
                status: "streaming",
                parts: appendText(m.parts, payload.text as string),
              }));
              break;
            case "text_reset":
              updateLast((m) => ({
                ...m,
                parts: m.parts.at(-1)?.kind === "text" ? m.parts.slice(0, -1) : m.parts,
              }));
              break;
            case "tool_start":
              updateLast((m) => {
                m = { ...m, pendingTool: undefined };
                const item = {
                  id: payload.id as string,
                  name: payload.name as string,
                  label: payload.label as string,
                  status: "running" as const,
                };
                const last = m.parts.at(-1);
                const parts: MessagePart[] =
                  last?.kind === "tools"
                    ? [...m.parts.slice(0, -1), { kind: "tools", items: [...last.items, item] }]
                    : [...m.parts, { kind: "tools", items: [item] }];
                return { ...m, status: "thinking", parts };
              });
              break;
            case "tool_end":
              updateLast((m) => ({
                ...m,
                parts: m.parts.map((p) =>
                  p.kind === "tools"
                    ? {
                        ...p,
                        items: p.items.map((it) =>
                          it.id === payload.id
                            ? { ...it, status: payload.ok ? "done" : "failed" }
                            : it,
                        ),
                      }
                    : p,
                ),
              }));
              break;
            case "flight_cards":
              updateLast((m) => ({
                ...m,
                parts: [
                  ...m.parts,
                  { kind: "flights", payload: payload as unknown as FlightCardsPayload },
                ],
              }));
              break;
            case "itinerary": {
              const marker = payload as unknown as ItineraryMarker;
              if (marker.itinerary) {
                const next = marker.itinerary;
                setChanged(diffDays(itineraryRef.current, next));
                if (changedTimer.current) clearTimeout(changedTimer.current);
                changedTimer.current = setTimeout(() => setChanged([]), 6000);
                itineraryRef.current = next;
                setItinerary(next);
              }
              updateLast((m) => ({
                ...m,
                pendingTool: undefined,
                parts: [
                  ...m.parts,
                  { kind: "itinerary", payload: { ...marker, itinerary: undefined } },
                ],
              }));
              break;
            }
            case "weather":
              updateLast((m) => ({
                ...m,
                parts: [
                  ...m.parts,
                  { kind: "weather", payload: payload as unknown as WeatherPayload },
                ],
              }));
              break;
            case "error":
              updateLast((m) => ({ ...m, status: "error", error: payload.message as string }));
              break;
            case "done":
              updateLast((m) => (m.status === "error" ? m : { ...m, status: "done" }));
              break;
          }
        }
        // Stream ended (or was stopped) without "done": settle the message.
        updateLast((m) =>
          m.status === "thinking" || m.status === "streaming" ? { ...m, status: "done" } : m,
        );
      } catch (error) {
        updateLast((m) => ({
          ...m,
          status: "error",
          error:
            error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        }));
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [conversationId, streaming, updateLast],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setItinerary(null);
    itineraryRef.current = null;
    setTripId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("c");
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, []);

  return {
    conversationId,
    messages,
    send,
    stop,
    reset,
    streaming,
    loadingHistory,
    itinerary,
    tripId,
    setTripId,
    changedDays: changed,
  };
}
