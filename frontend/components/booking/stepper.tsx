import { Check } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-3 last:flex-none">
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-sm font-semibold transition-colors",
                  done && "bg-success text-white",
                  active && "bg-[image:var(--gradient-brand)] text-white shadow-soft",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn("text-sm font-medium", !active && !done && "text-muted-foreground")}
              >
                {label}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-success"
                  initial={false}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
