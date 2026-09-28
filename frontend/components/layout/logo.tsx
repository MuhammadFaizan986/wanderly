import Link from "next/link";
import { Compass } from "lucide-react";

export function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight"
    >
      <span className="grid size-9 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-white shadow-soft transition-transform duration-500 group-hover:rotate-[20deg]">
        <Compass className="size-5" strokeWidth={2.25} />
      </span>
      Wanderly
    </Link>
  );
}
