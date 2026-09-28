"use client";

import { motion } from "motion/react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}
    >
      <p className="text-sm font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-balance sm:text-4xl">{title}</h2>
      {description && (
        <p className="mt-3 text-lg text-pretty text-muted-foreground">{description}</p>
      )}
    </motion.div>
  );
}
