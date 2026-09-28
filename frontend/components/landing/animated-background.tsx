"use client";

import { motion } from "motion/react";

const blobs = [
  {
    className: "left-[-10%] top-[-10%] size-[38rem] bg-brand-1/25",
    x: [0, 60, -20, 0],
    y: [0, 40, 80, 0],
    duration: 22,
  },
  {
    className: "right-[-8%] top-[5%] size-[32rem] bg-brand-3/20",
    x: [0, -50, 30, 0],
    y: [0, 60, -30, 0],
    duration: 26,
  },
  {
    className: "left-[30%] top-[35%] size-[30rem] bg-brand-2/15",
    x: [0, 40, -40, 0],
    y: [0, -40, 20, 0],
    duration: 30,
  },
  {
    className: "right-[15%] bottom-[-15%] size-[26rem] bg-brand-4/15",
    x: [0, -30, 20, 0],
    y: [0, -30, 10, 0],
    duration: 24,
  },
];

// Fixed positions so server and client render identically.
const sparkles = [
  { top: "12%", left: "8%", delay: 0 },
  { top: "22%", left: "88%", delay: 0.8 },
  { top: "48%", left: "4%", delay: 1.6 },
  { top: "64%", left: "92%", delay: 0.4 },
  { top: "8%", left: "58%", delay: 2.1 },
  { top: "78%", left: "18%", delay: 1.2 },
  { top: "36%", left: "72%", delay: 2.6 },
];

export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${blob.className}`}
          animate={{ x: blob.x, y: blob.y }}
          transition={{ duration: blob.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-grid" />
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="absolute size-1.5 animate-twinkle rounded-full bg-primary/60"
          style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s` }}
        />
      ))}
    </div>
  );
}
