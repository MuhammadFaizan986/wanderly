"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  Loader2,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { OfferUnavailable } from "@/components/booking/offer-unavailable";
import { Field, PassengerFields } from "@/components/booking/passenger-fields";
import { Stepper } from "@/components/booking/stepper";
import { TripSummary } from "@/components/booking/trip-summary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountdown } from "@/hooks/use-countdown";
import { useOffer } from "@/hooks/use-offer";
import { api, ApiError } from "@/lib/api";
import {
  bookingSchema,
  draftKey,
  TITLES,
  type BookingFormInput,
  type BookingFormValues,
} from "@/lib/booking";
import { formatMoney, offerSearchQuery, PASSENGER_TYPE_LABELS } from "@/lib/flights";
import type { Booking, FlightOffer, OfferPassenger, User } from "@/lib/types";

const STEPS = ["Travelers", "Review & book"];

export function BookingFlow({ offerId }: { offerId: string }) {
  const { data, isPending, error } = useOffer(offerId);
  const { user } = useAuth();

  if (isPending) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-[32rem] rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </section>
    );
  }
  if (error || !user) {
    return (
      <OfferUnavailable
        message={
          error instanceof ApiError && error.code !== "offer_expired" ? error.message : undefined
        }
      />
    );
  }
  return <BookingForm offer={data.offer} user={user} />;
}

function readDraft(offerId: string): BookingFormInput | null {
  try {
    const raw = sessionStorage.getItem(draftKey(offerId));
    return raw ? (JSON.parse(raw) as BookingFormInput) : null;
  } catch {
    return null;
  }
}

function initialValues(
  offer: FlightOffer,
  passengers: OfferPassenger[],
  user: User,
): BookingFormInput {
  const [first, ...rest] = user.full_name.split(" ");
  return {
    passengers: passengers.map((p, i) => ({
      id: p.id,
      type: p.type,
      title: p.type === "adult" ? "mr" : "miss",
      // Unset until the traveler picks a title or gender.
      // Prefill the lead traveler from the account.
      given_name: i === 0 ? first : "",
      family_name: i === 0 ? rest.join(" ") : "",
      gender: undefined as unknown as "m",
      born_on: "",
    })),
    contact_email: user.email,
    contact_phone: "",
    accept: false,
  };
}

function BookingForm({ offer, user }: { offer: FlightOffer; user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const passengers = offer.passengers ?? [];
  const [step, setStep] = useState(0);
  const [expectedTotal, setExpectedTotal] = useState(offer.total_amount);
  const [priceChange, setPriceChange] = useState<{ from: string; to: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const secondsLeft = useCountdown(offer.expires_at);

  const form = useForm<BookingFormInput, unknown, BookingFormValues>({
    resolver: zodResolver(bookingSchema(offer.slices[0].departing_at.slice(0, 10))),
    defaultValues: readDraft(offer.id) ?? initialValues(offer, passengers, user),
    mode: "onTouched",
  });

  const values = useWatch({ control: form.control }) as BookingFormInput;

  // Keep a draft so a refresh doesn't wipe what the traveler typed.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        try {
          sessionStorage.setItem(draftKey(offer.id), JSON.stringify(values));
        } catch {
          /* storage unavailable: drafts are a convenience only */
        }
      },
    });
  }, [form, offer.id]);

  const book = useMutation({
    mutationFn: (values: BookingFormValues) =>
      api.post<Booking>(
        "/bookings",
        {
          offer_id: offer.id,
          expected_total_amount: expectedTotal,
          passengers: values.passengers.map((p) => ({
            id: p.id,
            title: p.title,
            given_name: p.given_name,
            family_name: p.family_name,
            gender: p.gender,
            born_on: p.born_on,
          })),
          contact_email: values.contact_email,
          contact_phone: values.contact_phone,
        },
        { headers: { "Idempotency-Key": idempotencyKey.current } },
      ),
    onSuccess: (booking) => {
      sessionStorage.removeItem(draftKey(offer.id));
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      router.replace(`/booking/success/${booking.id}` as Route);
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return toast.error("Booking failed. Please try again.");
      if (error.code === "offer_expired") return setExpired(true);
      if (error.code === "price_changed") {
        const details = error.details as { total_amount: string; previous_total_amount: string };
        return setPriceChange({ from: details.previous_total_amount, to: details.total_amount });
      }
      // Field errors from the server: map them back onto the form.
      const fieldErrors = Array.isArray(error.details)
        ? (error.details as { loc: unknown[]; msg: string }[])
        : [];
      let mapped = false;
      for (const item of fieldErrors) {
        const [, section, index, key] = item.loc as [string, string, number, string];
        if (section === "passengers" && typeof index === "number" && key) {
          form.setError(`passengers.${index}.${key}` as `passengers.0.born_on`, {
            message: item.msg.replace(/^Value error, /, ""),
          });
          mapped = true;
        } else if (section === "contact_phone" || section === "contact_email") {
          form.setError(section, { message: item.msg.replace(/^Value error, /, "") });
          mapped = true;
        }
      }
      if (mapped) {
        setStep(0);
        toast.error("Please check the highlighted details.");
      } else {
        toast.error(error.message);
      }
    },
  });

  if (expired || secondsLeft === 0) {
    return <OfferUnavailable searchQuery={offerSearchQuery(offer)} />;
  }

  const goToReview = async () => {
    const ok = await form.trigger(["passengers", "contact_email", "contact_phone"]);
    if (ok) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please complete the highlighted fields.");
    }
  };

  const onConfirm = form.handleSubmit((values) => {
    if (!values.accept) {
      form.setError("accept", { message: "Please confirm to continue" });
      return;
    }
    book.mutate(values);
  });

  const acceptNewPrice = () => {
    if (!priceChange) return;
    setExpectedTotal(priceChange.to);
    setPriceChange(null);
    void queryClient.invalidateQueries({ queryKey: ["offer", offer.id] });
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 space-y-5">
        <button
          type="button"
          onClick={() => (step === 0 ? router.back() : setStep(0))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {step === 0 ? "Back to flight" : "Edit travelers"}
        </button>
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={onConfirm} noValidate className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 ? (
              <motion.div
                key="travelers"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="text-2xl font-bold">Who&apos;s traveling?</h1>
                  <p className="text-muted-foreground">
                    Enter names exactly as they appear on each passport.
                  </p>
                </div>
                {passengers.map((p, i) => (
                  <PassengerFields key={p.id} form={form} index={i} number={i + 1} />
                ))}

                <fieldset className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
                  <legend className="sr-only">Contact details</legend>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      <Mail className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold">Contact details</p>
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll send the confirmation here.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Email"
                      id="contact_email"
                      error={form.formState.errors.contact_email?.message}
                    >
                      <Input
                        id="contact_email"
                        type="email"
                        autoComplete="email"
                        className="h-11"
                        aria-invalid={!!form.formState.errors.contact_email}
                        {...form.register("contact_email")}
                      />
                    </Field>
                    <Field
                      label="Mobile number"
                      id="contact_phone"
                      error={form.formState.errors.contact_phone?.message}
                    >
                      <Input
                        id="contact_phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+92 300 1234567"
                        className="h-11"
                        aria-invalid={!!form.formState.errors.contact_phone}
                        {...form.register("contact_phone")}
                      />
                    </Field>
                  </div>
                </fieldset>

                <Button
                  type="button"
                  variant="brand"
                  className="group h-12 w-full text-base sm:w-auto sm:px-10"
                  onClick={goToReview}
                >
                  Review booking
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="text-2xl font-bold">Review and book</h1>
                  <p className="text-muted-foreground">
                    Check everything once more — names can&apos;t be changed later.
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                  <p className="mb-3 font-semibold">Travelers</p>
                  <ul className="divide-y divide-border">
                    {values.passengers.map((p, i) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <span className="font-medium">
                          {TITLES.find((t) => t.value === p.title)?.label} {p.given_name}{" "}
                          {p.family_name}
                        </span>
                        <span className="text-muted-foreground">
                          {PASSENGER_TYPE_LABELS[passengers[i].type]} · born {p.born_on}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    Confirmation to{" "}
                    <span className="font-medium text-foreground">{values.contact_email}</span> ·{" "}
                    {values.contact_phone}
                  </p>
                </div>

                <div className="flex gap-3 rounded-3xl border border-brand-2/30 bg-brand-2/5 p-5">
                  <FlaskConical className="mt-0.5 size-5 shrink-0 text-brand-2" />
                  <div className="text-sm">
                    <p className="font-semibold">Payment — test mode</p>
                    <p className="text-muted-foreground">
                      This demo books through the airline sandbox and is paid from a test balance.
                      No card is needed and nothing is charged.
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {priceChange && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-3 rounded-3xl border border-brand-4/40 bg-brand-4/10 p-5 sm:flex-row sm:items-center">
                        <TriangleAlert className="size-5 shrink-0 text-brand-4" />
                        <p className="flex-1 text-sm">
                          The airline changed the price from{" "}
                          <s>{formatMoney(priceChange.from, offer.currency)}</s> to{" "}
                          <strong>{formatMoney(priceChange.to, offer.currency)}</strong>.
                        </p>
                        <Button
                          type="button"
                          variant="ink"
                          className="h-10 px-5"
                          onClick={acceptNewPrice}
                        >
                          Accept new price
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={values.accept}
                    onCheckedChange={(checked) =>
                      form.setValue("accept", checked === true, { shouldValidate: false })
                    }
                  />
                  <span>
                    I confirm the names match each traveler&apos;s passport and I accept the fare
                    rules
                    {offer.refundable ? "" : " (this fare is non-refundable)"}.
                    {form.formState.errors.accept && (
                      <span className="block text-xs font-medium text-destructive">
                        {form.formState.errors.accept.message}
                      </span>
                    )}
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="brand"
                  className="h-13 w-full text-base"
                  disabled={book.isPending || !!priceChange}
                >
                  {book.isPending ? (
                    <>
                      <Loader2 className="animate-spin" /> Confirming with the airline…
                    </>
                  ) : (
                    <>
                      <ShieldCheck /> Confirm booking · {formatMoney(expectedTotal, offer.currency)}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TripSummary offer={{ ...offer, total_amount: expectedTotal }} />
        </aside>
      </div>
    </section>
  );
}
