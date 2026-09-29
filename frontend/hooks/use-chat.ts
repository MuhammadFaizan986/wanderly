"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError, streamEvents } from "@/lib/api";
import {
  fromHistory,
  type ChatMessage,
  type ConversationDetail,
  type FlightCardsPayload,
  type MessagePart,
  type WeatherPayload,
} from "@/lib/chat";

type Updater = (message: ChatMessage) => ChatMessage;

function appendText(parts: MessagePart[], text: string): MessagePart[] {
  const last = parts.at(-1);
  if (last?.kind === "text")
    return [...parts.slice(0, -1), { kind: "text", text: last.text + text }];
  return [...parts, { kind: "text", text }];
}

export function useChat(conversationIdFromUrl: string | null) {
  // Read the URL only on mount: we write ?c= ourselves after creating a conversation,
  // and reacting to that change would reload (and wipe) the reply being streamed.
  const [initialConversationId] = useState(conversationIdFromUrl);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(!!initialConversationId);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load an existing conversation (e.g. after a refresh with ?c=...).
  useEffect(() => {
    if (!initialConversationId) return;
    let cancelled = false;
    api
      .get<ConversationDetail>(`/chat/conversations/${initialConversationId}`)
      .then((detail) => !cancelled && setMessages(fromHistory(detail)))
      .catch(() => !cancelled && setConversationId(null))
      .finally(() => !cancelled && setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [initialConversationId]);

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
            case "tool_pending":
              updateLast((m) => ({ ...m, status: "thinking" }));
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
    const url = new URL(window.location.href);
    url.searchParams.delete("c");
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, []);

  return { conversationId, messages, send, stop, reset, streaming, loadingHistory };
}
