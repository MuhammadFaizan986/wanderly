"use client";

import { CalendarDays, Plane, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { AnimatedBackground } from "@/components/landing/animated-background";

const perks = [
  { icon: Sparkles, title: "AI trip planning", text: "Describe a trip, get a full plan." },
  { icon: Plane, title: "Real flights", text: "Live airline inventory and prices." },
  { icon: CalendarDays, title: "Saved itineraries", text: "All your trips in one place." },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative isolate flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <AnimatedBackground />
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden space-y-8 lg:block"
        >
          <h2 className="text-4xl leading-tight font-bold">
            Your next adventure <span className="text-gradient">starts here.</span>
          </h2>
          <ul className="space-y-5">
            {perks.map((perk, i) => (
              <motion.li
                key={perk.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="flex items-start gap-4"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-primary shadow-soft border-gradient [--gradient-fill:var(--card)]">
                  <perk.icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{perk.title}</p>
                  <p className="text-sm text-muted-foreground">{perk.text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md rounded-3xl p-1.5 shadow-lift border-gradient [--gradient-fill:var(--card)]"
        >
          <div className="rounded-[1.3rem] bg-card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
