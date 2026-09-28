"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/landing/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { countryFlag } from "@/lib/flags";
import type { Destination } from "@/lib/types";

// Fallback art when there's no Unsplash photo: each card gets its own gradient.
const fallbackGradients = [
  "from-brand-1 to-brand-2",
  "from-brand-2 to-brand-3",
  "from-brand-3 to-brand-4",
  "from-brand-4 to-brand-1",
];

export function PopularDestinations() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["destinations", "popular"],
    queryFn: () => api.get<Destination[]>("/destinations/popular"),
    staleTime: 60 * 60 * 1000,
  });

  if (isError) return null;

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Popular destinations"
          title={
            <>
              Where travelers are <span className="text-gradient">heading next</span>
            </>
          }
          description="Hand-picked favorites with great weather windows and easy connections."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-3xl" />
              ))
            : data.map((d, i) => <DestinationCard key={d.slug} destination={d} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function DestinationCard({ destination: d, index }: { destination: Destination; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 4) * 0.08, duration: 0.5 }}
    >
      <Link
        href={{ pathname: "/search", query: { to: d.iata_code } }}
        className="group relative block aspect-[4/5] overflow-hidden rounded-3xl shadow-soft transition-shadow duration-300 hover:shadow-lift"
      >
        {d.photo ? (
          <Image
            src={d.photo.url}
            alt={d.photo.alt ?? `${d.city}, ${d.country}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundColor: d.photo.color ?? undefined }}
          />
        ) : (
          <div
            className={`absolute inset-0 bg-linear-to-br ${fallbackGradients[index % fallbackGradients.length]} transition-transform duration-700 group-hover:scale-110`}
          >
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70%] text-8xl opacity-90 drop-shadow-lg">
              {countryFlag(d.country_code)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />

        <span className="absolute top-4 left-4 rounded-full bg-white/20 px-3 py-1 font-mono text-xs font-semibold text-white backdrop-blur-md">
          {d.iata_code}
        </span>
        <span className="absolute top-4 right-4 grid size-9 translate-y-1 place-items-center rounded-full bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-sm text-white/80">
            {countryFlag(d.country_code)} {d.country}
          </p>
          <h3 className="text-2xl font-bold">{d.city}</h3>
          <p className="mt-1 text-sm text-white/85">{d.tagline}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs backdrop-blur-md">
            <CalendarDays className="size-3.5" /> Best: {d.best_months}
          </p>
        </div>
      </Link>
      {d.photo && (
        <p className="mt-2 truncate px-1 text-[0.7rem] text-muted-foreground">
          Photo by{" "}
          <a href={d.photo.photographer_url} target="_blank" rel="noreferrer" className="underline">
            {d.photo.photographer}
          </a>{" "}
          on{" "}
          <a href={d.photo.unsplash_url} target="_blank" rel="noreferrer" className="underline">
            Unsplash
          </a>
        </p>
      )}
    </motion.div>
  );
}
