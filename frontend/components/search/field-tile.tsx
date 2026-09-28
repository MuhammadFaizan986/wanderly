import { cn } from "@/lib/utils";

/** The large tappable "label + value" block used by every search field. */
export function FieldTile({
  label,
  icon: Icon,
  value,
  placeholder,
  sub,
  error,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value?: React.ReactNode;
  placeholder: string;
  sub?: React.ReactNode;
  error?: string;
}) {
  return (
    <button
      type="button"
      data-invalid={error ? "" : undefined}
      className={cn(
        "group flex h-full w-full min-w-0 items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-background focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none data-[state=open]:border-primary data-[state=open]:bg-background data-[state=open]:ring-3 data-[state=open]:ring-ring/30",
        error && "border-destructive/60",
        className,
      )}
      {...props}
    >
      <Icon className="size-5 shrink-0 text-primary transition-transform group-hover:scale-110" />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            "block truncate font-semibold",
            !value && "font-medium text-muted-foreground/80",
          )}
        >
          {value ?? placeholder}
        </span>
        {(error || sub) && (
          <span
            className={cn(
              "block truncate text-xs",
              error ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            {error ?? sub}
          </span>
        )}
      </span>
    </button>
  );
}
