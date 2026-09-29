import { differenceInYears, parseISO } from "date-fns";
import { z } from "zod";

import type { OfferPassenger, PassengerTitle } from "@/lib/types";

export const TITLES: { value: PassengerTitle; label: string }[] = [
  { value: "mr", label: "Mr" },
  { value: "ms", label: "Ms" },
  { value: "mrs", label: "Mrs" },
  { value: "miss", label: "Miss" },
  { value: "dr", label: "Dr" },
];

const AGE_RULES: Record<OfferPassenger["type"], [number, number | null, string]> = {
  adult: [12, null, "Adults must be 12 or older on the travel date"],
  child: [2, 11, "Children must be 2–11 on the travel date"],
  infant_without_seat: [0, 1, "Infants must be under 2 on the travel date"],
};

const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(50)
  .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/, "Letters only, as on the passport");

export function bookingSchema(travelDate: string) {
  const travel = parseISO(travelDate);
  return z.object({
    passengers: z.array(
      z
        .object({
          id: z.string(),
          type: z.enum(["adult", "child", "infant_without_seat"]),
          title: z.enum(["mr", "ms", "mrs", "miss", "dr"]),
          given_name: name,
          family_name: name,
          gender: z.enum(["m", "f"], { message: "Select one" }),
          born_on: z.string().min(1, "Required"),
        })
        .superRefine((p, ctx) => {
          if (!p.born_on) return;
          const born = parseISO(p.born_on);
          const age = differenceInYears(travel, born);
          const [min, max, message] = AGE_RULES[p.type];
          if (born >= new Date() || age < min || (max !== null && age > max)) {
            ctx.addIssue({ code: "custom", path: ["born_on"], message });
          }
        }),
    ),
    contact_email: z.email("Enter a valid email"),
    contact_phone: z
      .string()
      .transform((v) => v.replace(/[\s()-]/g, ""))
      .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +923001234567")),
    accept: z.boolean(),
  });
}

export type BookingFormInput = z.input<ReturnType<typeof bookingSchema>>;
export type BookingFormValues = z.output<ReturnType<typeof bookingSchema>>;

export function draftKey(offerId: string) {
  return `wanderly:booking-draft:${offerId}`;
}
