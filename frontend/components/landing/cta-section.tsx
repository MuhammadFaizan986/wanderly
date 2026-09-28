"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[image:var(--gradient-brand)] px-6 py-16 text-center text-white shadow-lift sm:px-12"
      >
        <div aria-hidden className="absolute inset-0 bg-grid opacity-40" />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-72 animate-float rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-balance sm:text-5xl">
            Ready for your next adventure?
          </h2>
          <p className="mx-auto max-w-xl text-lg text-white/90">
            Tell Wanderly what you have in mind. Your plan is one message away.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="group h-13 rounded-full bg-white px-8 text-base font-semibold text-black hover:-translate-y-0.5 hover:bg-white/90"
            >
              <Link href="/plan">
                <Sparkles /> Start planning
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-13 rounded-full border border-white/50 px-8 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/register">Create free account</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
