"use client";

import { UserRound } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TITLES, type BookingFormInput } from "@/lib/booking";
import { PASSENGER_TYPE_LABELS } from "@/lib/flights";
import { cn } from "@/lib/utils";

const TITLE_GENDER: Record<string, "m" | "f"> = { mr: "m", ms: "f", mrs: "f", miss: "f" };

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30";

export function PassengerFields({
  form,
  index,
  number,
}: {
  form: UseFormReturn<BookingFormInput>;
  index: number;
  number: number;
}) {
  const [type, gender] = useWatch({
    control: form.control,
    name: [`passengers.${index}.type`, `passengers.${index}.gender`],
  });
  const errors = form.formState.errors.passengers?.[index];
  const field = (key: "given_name" | "family_name" | "born_on") =>
    `passengers.${index}.${key}` as const;

  return (
    <fieldset className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <legend className="sr-only">Traveler {number}</legend>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <UserRound className="size-4" />
        </span>
        <p className="font-semibold">
          Traveler {number}{" "}
          <span className="font-normal text-muted-foreground">· {PASSENGER_TYPE_LABELS[type]}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`title-${index}`}>Title</Label>
          <select
            id={`title-${index}`}
            className={selectClass}
            {...form.register(`passengers.${index}.title`, {
              // Titles imply gender for everyone except "Dr"; save the traveler a click.
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                const implied = TITLE_GENDER[e.target.value];
                if (implied) {
                  form.setValue(`passengers.${index}.gender`, implied, {
                    shouldValidate: form.formState.isSubmitted,
                  });
                }
              },
            })}
          >
            {TITLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="First & middle names"
          id={`given-${index}`}
          error={errors?.given_name?.message}
        >
          <Input
            id={`given-${index}`}
            autoComplete={index === 0 ? "given-name" : "off"}
            className="h-11"
            aria-invalid={!!errors?.given_name}
            {...form.register(field("given_name"))}
          />
        </Field>
        <Field label="Last name" id={`family-${index}`} error={errors?.family_name?.message}>
          <Input
            id={`family-${index}`}
            autoComplete={index === 0 ? "family-name" : "off"}
            className="h-11"
            aria-invalid={!!errors?.family_name}
            {...form.register(field("family_name"))}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth" id={`dob-${index}`} error={errors?.born_on?.message}>
          <Input
            id={`dob-${index}`}
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            className="h-11"
            aria-invalid={!!errors?.born_on}
            {...form.register(field("born_on"))}
          />
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm leading-none font-medium">Gender (as on passport)</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(
              [
                ["m", "Male"],
                ["f", "Female"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={gender === value}
                onClick={() =>
                  form.setValue(`passengers.${index}.gender`, value, {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium transition-colors",
                  gender === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted",
                  errors?.gender && "border-destructive",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {errors?.gender && (
            <p className="text-xs font-medium text-destructive">{errors.gender.message}</p>
          )}
        </div>
      </div>
    </fieldset>
  );
}

export function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
