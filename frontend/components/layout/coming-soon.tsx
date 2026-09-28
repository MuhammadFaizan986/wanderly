import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon className="size-6" />
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <Button asChild variant="outline">
        <Link href="/">Back home</Link>
      </Button>
    </section>
  );
}
