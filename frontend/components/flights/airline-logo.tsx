"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function AirlineLogo({
  code,
  name,
  src,
  className,
}: {
  code: string;
  name: string;
  src: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white p-1.5",
        className,
      )}
      title={name}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={name}
          fill
          unoptimized
          className="object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs font-bold text-slate-600">{code}</span>
      )}
    </span>
  );
}
