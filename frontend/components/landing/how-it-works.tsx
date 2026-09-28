"use client";

import { CreditCard, MessageSquareText, Route } from "lucide-react";
import { motion } from "motion/react";

import { AiPreview } from "@/components/landing/ai-preview";
import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  {
    icon: MessageSquareText,
    title: "Describe your trip",
    text: "Budget, dates, vibe — say it the way you'd tell a friend.",
    tint: "bg-brand-1/15 text-brand-1",
  },
  {
    icon: Route,
    title: "Get a real plan",
    text: "Live flights, weather and a day-by-day itinerary with a map.",
    tint: "bg-brand-2/15 text-brand-2",
  },
  {
    icon: CreditCard,
    title: "Book in minutes",
    text: "Pick your flight, add passengers and you're done.",
    tint: "bg-brand-3/15 text-brand-3",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div className="space-y-10">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title={
              <>
                Meet your <span className="text-gradient">AI travel agent</span>
              </>
            }
            description="No more twenty open tabs. One conversation takes you from idea to booked."
          />
          <ol className="space-y-6">
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="flex gap-4"
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl ${step.tint}`}
                >
                  <step.icon className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold">
                    <span className="mr-2 text-muted-foreground">0{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="text-muted-foreground">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[3rem] bg-[image:var(--gradient-brand)] opacity-15 blur-3xl"
          />
          <AiPreview />
        </motion.div>
      </div>
    </section>
  );
}
