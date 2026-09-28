"use client";

import { Plane, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { AiPromptForm } from "@/components/search/ai-prompt-form";
import { FlightSearchForm, type FlightSearchValues } from "@/components/search/flight-search-form";
import { cn } from "@/lib/utils";

type Tab = "flights" | "ai";

const tabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "ai", label: "Plan with AI", icon: Sparkles },
] as const;

export function SearchCard({
  defaultValues,
  showTabs = true,
}: {
  defaultValues?: Partial<FlightSearchValues>;
  showTabs?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("flights");

  return (
    <div className="w-full rounded-[1.75rem] p-1.5 shadow-lift border-gradient [--gradient-fill:var(--card)]">
      <div className="rounded-[1.4rem] bg-card/95 p-4 text-left backdrop-blur sm:p-5">
        {showTabs && (
          <div role="tablist" className="mb-4 flex gap-6 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-2 pb-3 text-sm font-semibold transition-colors",
                  tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className={cn("size-4", tab === t.id && "text-primary")} />
                {t.label}
                {tab === t.id && (
                  <motion.span
                    layoutId="search-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[image:var(--gradient-brand)]"
                  />
                )}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "flights" ? (
              <FlightSearchForm defaultValues={defaultValues} compact={!showTabs} />
            ) : (
              <AiPromptForm />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
