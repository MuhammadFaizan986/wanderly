"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, CloudSun, Loader2, Plane, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const PROMPT = "5 days somewhere warm in December from Lahore, budget $800";

const destinations = [
  { city: "Dubai", country: "UAE", weather: "26°C · Sunny", tint: "from-brand-1/15 to-brand-2/15" },
  {
    city: "Muscat",
    country: "Oman",
    weather: "27°C · Clear",
    tint: "from-brand-2/15 to-brand-3/15",
  },
  {
    city: "Colombo",
    country: "Sri Lanka",
    weather: "29°C · Warm",
    tint: "from-brand-3/15 to-brand-4/15",
  },
];

const itinerary = [
  "Day 1 · Arrive, Dubai Marina sunset walk",
  "Day 2 · Old Dubai souks and street food",
  "Day 3 · Desert safari and dune dinner",
];

type Phase = "typing" | "thinking" | "results";

/** Illustrative, looping demo of the planner. Real data comes from the live agent in /plan. */
export function AiPreview() {
  const reduceMotion = useReducedMotion();
  const [typedState, setTyped] = useState(0);
  const [phaseState, setPhase] = useState<Phase>("typing");
  const [cycle, setCycle] = useState(0);

  // With reduced motion, skip the animation and show the finished state.
  const typed = reduceMotion ? PROMPT.length : typedState;
  const phase: Phase = reduceMotion ? "results" : phaseState;

  useEffect(() => {
    if (reduceMotion) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= PROMPT.length; i++) {
      timers.push(setTimeout(() => setTyped(i), 400 + i * 38));
    }
    const typedAt = 400 + PROMPT.length * 38;
    timers.push(setTimeout(() => setPhase("thinking"), typedAt + 300));
    timers.push(setTimeout(() => setPhase("results"), typedAt + 2000));
    timers.push(
      setTimeout(() => {
        setTyped(0);
        setPhase("typing");
        setCycle((c) => c + 1);
      }, typedAt + 9000),
    );
    return () => timers.forEach(clearTimeout);
  }, [cycle, reduceMotion]);

  return (
    <div className="relative rounded-3xl p-1.5 shadow-lift border-gradient [--gradient-fill:var(--card)]">
      <div className="rounded-[1.3rem] bg-card p-5 sm:p-6">
        {/* Window chrome */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-brand-3/60" />
            <span className="size-3 rounded-full bg-brand-4/60" />
            <span className="size-3 rounded-full bg-success/60" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5" /> Wanderly AI
          </span>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-left text-sm text-primary-foreground sm:text-[0.95rem]">
            {PROMPT.slice(0, typed)}
            {phase === "typing" && (
              <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary-foreground" />
            )}
          </div>
        </div>

        <div className="mt-4 min-h-[15.5rem] text-left">
          <AnimatePresence mode="wait">
            {phase === "thinking" && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                {[
                  { icon: CloudSun, text: "Checking December weather…" },
                  { icon: Plane, text: "Searching flights from LHE…" },
                ].map((step, i) => (
                  <motion.div
                    key={step.text}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.5 }}
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <Loader2 className="size-3.5 animate-spin" />
                    <step.icon className="size-3.5" />
                    {step.text}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {phase === "results" && (
              <motion.div
                key="results"
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                transition={{ staggerChildren: 0.12 }}
                className="flex flex-col gap-3"
              >
                <motion.p
                  variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                  className="text-sm text-muted-foreground"
                >
                  Here are 3 warm picks with direct flights from Lahore:
                </motion.p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {destinations.map((d, i) => (
                    <motion.div
                      key={d.city}
                      variants={{
                        hidden: { opacity: 0, y: 12, scale: 0.96 },
                        show: { opacity: 1, y: 0, scale: 1 },
                      }}
                      className={`rounded-2xl border bg-linear-to-br p-3 ${d.tint} ${
                        i === 0 ? "border-primary/40 ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <p className="text-sm font-semibold">{d.city}</p>
                      <p className="text-xs text-muted-foreground">{d.country}</p>
                      <p className="mt-2 text-xs font-medium">{d.weather}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  className="rounded-2xl border border-border bg-background/60 p-3"
                >
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <CalendarDays className="size-3.5" /> Draft itinerary · Dubai
                  </p>
                  <ul className="space-y-1.5">
                    {itinerary.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.25 }}
                        className="flex items-center gap-2 text-xs sm:text-sm"
                      >
                        <span className="size-1.5 rounded-full bg-[image:var(--gradient-brand)]" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
