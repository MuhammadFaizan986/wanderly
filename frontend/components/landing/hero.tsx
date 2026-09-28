"use client";

import Link from "next/link";
import { ArrowRight, Plane, ShieldCheck, Sparkles, Sun, Utensils, Zap } from "lucide-react";
import { motion } from "motion/react";

import { AiPreview } from "@/components/landing/ai-preview";
import { AnimatedBackground } from "@/components/landing/animated-background";
import { ApiStatus } from "@/components/landing/api-status";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const features = [
  { icon: Plane, label: "Real airline inventory" },
  { icon: Zap, label: "Itineraries in seconds" },
  { icon: ShieldCheck, label: "Secure checkout" },
];

function FloatingCard({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6 }}
      className={`absolute hidden xl:block ${className}`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-4 py-3 shadow-lift backdrop-blur-md">
        {children}
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate -mt-18 overflow-hidden pt-18">
      <AnimatedBackground />

      <FloatingCard className="top-[30%] left-[4%] animate-float" delay={1.2}>
        <span className="grid size-10 place-items-center rounded-xl bg-brand-4/20 text-brand-4">
          <Sun className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold">Bali, Indonesia</p>
          <p className="text-xs text-muted-foreground">31°C · Sunny all week</p>
        </div>
      </FloatingCard>

      <FloatingCard className="top-[20%] right-[4%] animate-float-delayed" delay={1.4}>
        <span className="grid size-10 place-items-center rounded-xl bg-brand-1/15 text-brand-1">
          <Plane className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold">LHE → DXB</p>
          <p className="text-xs text-muted-foreground">Direct · 3h 10m</p>
        </div>
      </FloatingCard>

      <FloatingCard className="top-[52%] right-[6%] animate-float" delay={1.6}>
        <span className="grid size-10 place-items-center rounded-xl bg-brand-3/15 text-brand-3">
          <Utensils className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold">Day 2 added</p>
          <p className="text-xs text-muted-foreground">Street food tour</p>
        </div>
      </FloatingCard>

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
        className="mx-auto flex max-w-5xl flex-col items-center gap-7 px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24"
      >
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium shadow-soft border-gradient [--gradient-fill:var(--card)]">
            <Sparkles className="size-4 text-brand-2" />
            Your AI travel agent, available 24/7
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-[2.6rem] leading-[1.1] font-bold text-balance sm:text-6xl lg:text-7xl"
        >
          <span className="animate-gradient-pan text-gradient">Plan Your Dream Trip</span>
          <br />
          <span className="animate-gradient-pan text-gradient [animation-delay:-4s]">
            In One Conversation
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl"
        >
          Tell Wanderly where you want to go in plain words. Get real flights, live weather, and a
          day-by-day itinerary — then book in minutes.
        </motion.p>

        <motion.div variants={fadeUp} className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <Button asChild variant="brand" className="group h-14 px-8 text-base">
            <Link href="/plan">
              <Sparkles data-icon="inline-start" />
              Plan with AI
              <ArrowRight
                data-icon="inline-end"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Button>
          <Button asChild variant="gradient-outline" className="h-14 px-8 text-base">
            <Link href="/search">
              <Plane data-icon="inline-start" />
              Search Flights
            </Link>
          </Button>
        </motion.div>

        <motion.ul
          variants={fadeUp}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground"
        >
          {features.map((f) => (
            <li key={f.label} className="flex items-center gap-2">
              <f.icon className="size-4 text-primary" />
              {f.label}
            </li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 w-full max-w-2xl"
        >
          <AiPreview />
        </motion.div>

        <motion.div variants={fadeUp}>
          <ApiStatus />
        </motion.div>
      </motion.div>
    </section>
  );
}
