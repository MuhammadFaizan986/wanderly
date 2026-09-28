import { FlaskConical } from "lucide-react";

export function TestModeBanner() {
  return (
    <div className="relative z-50 bg-[image:var(--gradient-brand)] text-white">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium">
        <FlaskConical className="size-3.5 shrink-0" />
        Demo project — bookings run in test mode. No real tickets are issued or charged.
      </p>
    </div>
  );
}
