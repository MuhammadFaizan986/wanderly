"use client";

import { motion, useReducedMotion } from "motion/react";

const COLORS = ["var(--brand-1)", "var(--brand-2)", "var(--brand-3)", "var(--brand-4)"];
// Fixed spread so server and client agree; no confetti library needed.
const PIECES = Array.from({ length: 36 }, (_, i) => ({
  x: ((i * 37) % 100) - 50,
  delay: (i % 9) * 0.05,
  rotate: (i * 47) % 360,
  color: COLORS[i % COLORS.length],
  size: 6 + (i % 3) * 3,
}));

export function Celebration() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden">
      {PIECES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 left-1/2 rounded-sm"
          style={{ width: p.size, height: p.size * 0.5, background: p.color }}
          initial={{ x: 0, y: -20, opacity: 1, rotate: 0 }}
          animate={{ x: `${p.x * 1.4}vw`, y: 380, opacity: 0, rotate: p.rotate + 360 }}
          transition={{ duration: 2.4, delay: p.delay, ease: [0.2, 0.7, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
