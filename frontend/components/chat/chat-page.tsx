"use client";

import { CalendarRange, Loader2, Plus, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Composer } from "@/components/chat/composer";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ItineraryPanel } from "@/components/itinerary/itinerary-panel";
import { AnimatedBackground } from "@/components/landing/animated-background";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useChat } from "@/hooks/use-chat";

const SUGGESTIONS = [
  { emoji: "🏝️", text: "5 warm days in December from Lahore, budget $800" },
  { emoji: "🍜", text: "A food-focused week in Istanbul for two in April" },
  { emoji: "👨‍👩‍👧", text: "Family trip to Dubai with a 6-year-old in February" },
  { emoji: "✈️", text: "Cheapest way to get from Karachi to London next month" },
];

export function ChatPage() {
  const params = useSearchParams();
  const { status: authStatus } = useAuth();
  const {
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
    changedDays,
  } = useChat(params.get("c"), authStatus !== "loading");
  const desktop = useMediaQuery("(min-width: 1024px)", true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openItinerary = () => {
    if (desktop) panelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    else setSheetOpen(true);
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialPrompt = useRef(params.get("c") ? null : params.get("q"));

  // A prompt handed over from the landing page (/plan?q=...) is sent once.
  useEffect(() => {
    const q = initialPrompt.current;
    if (q) {
      initialPrompt.current = null;
      void send(q);
    }
  }, [send]);

  // Follow the conversation as it grows, unless the traveler scrolled up to read.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 300;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const empty = messages.length === 0;

  return (
    <section className="relative isolate flex min-h-[calc(100dvh-7rem)] flex-1">
      {empty && <AnimatedBackground />}
      <div
        className={
          itinerary
            ? "mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col px-4 sm:px-6 xl:px-10"
            : "mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6"
        }
      >
        {loadingHistory ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : empty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center"
          >
            <motion.span
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="grid size-16 place-items-center rounded-3xl bg-[image:var(--gradient-brand)] text-white shadow-lift"
            >
              <Sparkles className="size-8" />
            </motion.span>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Where to <span className="animate-gradient-pan text-gradient">next</span>?
              </h1>
              <p className="mt-2 text-muted-foreground">
                Describe your trip and I&apos;ll find destinations, weather and real flights.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.text}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  onClick={() => send(s.text)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 text-left text-sm font-medium shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
                >
                  <span className="text-2xl">{s.emoji}</span>
                  {s.text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 space-y-8 py-8">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={reset}
                disabled={streaming}
              >
                <Plus /> New chat
              </Button>
            </div>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onOpenItinerary={openItinerary} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="sticky bottom-0 z-20 -mx-4 bg-linear-to-t from-background via-background/95 to-transparent px-4 pt-6 pb-4 sm:-mx-6 sm:px-6">
          {itinerary && !desktop && (
            <div className="mb-3 flex justify-center">
              <Button variant="ink" className="h-10 px-5" onClick={() => setSheetOpen(true)}>
                <CalendarRange /> View itinerary · {itinerary.days.length} days
              </Button>
            </div>
          )}
          <Composer onSend={send} onStop={stop} streaming={streaming} autoFocus />
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
            Wanderly can make mistakes. Prices and times come from live search results.
          </p>
        </div>
      </div>

      {itinerary && desktop && (
        <aside className="sticky top-18 hidden h-[calc(100dvh-4.5rem)] w-[30rem] shrink-0 border-l border-border bg-card/40 backdrop-blur lg:block xl:w-[36rem]">
          <div ref={panelRef} className="h-full overflow-y-auto p-5">
            <ItineraryPanel
              conversationId={conversationId}
              itinerary={itinerary}
              tripId={tripId}
              onSaved={setTripId}
              changedDays={changedDays}
            />
          </div>
        </aside>
      )}
      {itinerary && !desktop && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[88dvh] overflow-y-auto rounded-t-3xl p-5">
            <SheetTitle className="sr-only">Itinerary</SheetTitle>
            <ItineraryPanel
              conversationId={conversationId}
              itinerary={itinerary}
              tripId={tripId}
              onSaved={setTripId}
              changedDays={changedDays}
            />
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}
