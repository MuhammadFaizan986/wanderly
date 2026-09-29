"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  onStop,
  streaming,
  autoFocus,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || streaming) return;
    onSend(value);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-[1.6rem] p-1 shadow-lift border-gradient [--gradient-fill:var(--card)]"
    >
      <div className="flex items-end gap-2 rounded-[1.4rem] bg-card p-2 pl-4">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={2000}
          autoFocus={autoFocus}
          placeholder="Where do you want to go?"
          aria-label="Message Wanderly"
          className="max-h-44 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground/80"
        />
        <button
          type={streaming ? "button" : "submit"}
          onClick={streaming ? onStop : undefined}
          disabled={!streaming && !value.trim()}
          aria-label={streaming ? "Stop" : "Send"}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-white shadow-soft transition-all disabled:opacity-40",
            streaming
              ? "bg-ink text-ink-foreground"
              : "bg-[image:var(--gradient-brand)] hover:-translate-y-0.5",
          )}
        >
          {streaming ? <Square className="size-4 fill-current" /> : <ArrowUp className="size-5" />}
        </button>
      </div>
    </form>
  );
}
