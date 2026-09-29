"use client";

import { CloudOff, Plane, SearchX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MESSAGES = [
  "Checking hundreds of airlines…",
  "Comparing routes and connections…",
  "Hunting for the best fares…",
  "Almost there — sorting your options…",
];

export function ResultsLoading() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <div className="relative h-6 w-full overflow-hidden">
          <motion.span
            className="absolute top-1/2 -translate-y-1/2 text-primary"
            animate={{ left: ["-5%", "100%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Plane className="size-5" />
          </motion.span>
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center text-sm font-medium text-muted-foreground"
            >
              {MESSAGES[index]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-px flex-1" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
            <div className="hidden w-40 space-y-2 md:block">
              <Skeleton className="ml-auto h-7 w-24" />
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StateCard({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof Plane;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <span className="grid size-16 animate-float place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-7" />
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function ResultsEmpty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return filtered ? (
    <StateCard
      icon={SearchX}
      title="No flights match your filters"
      text="Try allowing more stops or a higher price."
      action={
        <Button variant="gradient-outline" className="h-10 px-5" onClick={onReset}>
          Reset filters
        </Button>
      }
    />
  ) : (
    <StateCard
      icon={SearchX}
      title="No flights found"
      text="No airline sells this route on these dates. Try nearby dates or airports."
    />
  );
}

export function ResultsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateCard
      icon={CloudOff}
      title="We couldn't load flights"
      text={message}
      action={
        <Button variant="brand" className="h-10 px-5" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
