"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const ideas = [
  "5 warm days in December from Lahore under $800",
  "A food-focused week in Istanbul for two",
  "Family trip to Dubai with kids in February",
];

export function AiPromptForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const submit = (text: string) => {
    const q = text.trim();
    if (q) router.push(`/plan?q=${encodeURIComponent(q)}` as Route);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(prompt);
      }}
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-2 transition-all focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30 sm:flex-row sm:items-center">
        <Sparkles className="ml-2 hidden size-5 shrink-0 text-brand-2 sm:block" />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your dream trip…"
          aria-label="Describe your trip"
          maxLength={500}
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground/80"
        />
        <Button
          type="submit"
          variant="brand"
          className="group h-12 rounded-xl px-6"
          disabled={!prompt.trim()}
        >
          Plan my trip
          <ArrowRight className="transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => submit(idea)}
            className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground"
          >
            {idea}
          </button>
        ))}
      </div>
    </form>
  );
}
