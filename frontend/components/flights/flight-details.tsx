import { Briefcase, Clock, Leaf, Luggage, RefreshCcw, ShieldCheck } from "lucide-react";

import { AirlineLogo } from "@/components/flights/airline-logo";
import { formatDuration, formatMoney, localDate, localTime } from "@/lib/flights";
import type { FlightOffer, FlightSlice } from "@/lib/types";

function SliceTimeline({ slice, label }: { slice: FlightSlice; label: string }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">
        {label} ·{" "}
        <span className="font-normal text-muted-foreground">{localDate(slice.departing_at)}</span>
      </p>
      <ol className="relative space-y-0">
        {slice.segments.map((segment, i) => (
          <li key={`${segment.flight_number}-${i}`}>
            <div className="relative grid grid-cols-[3.5rem_1rem_1fr] gap-x-3">
              <div className="text-right text-sm font-semibold tabular">
                {localTime(segment.departing_at)}
              </div>
              <div className="relative flex justify-center">
                <span className="z-10 mt-1 size-3 rounded-full border-2 border-primary bg-card" />
                <span className="absolute top-4 bottom-0 w-px bg-border" />
              </div>
              <div className="pb-3 text-sm">
                <span className="font-semibold">{segment.origin.iata_code}</span> ·{" "}
                {segment.origin.name}
              </div>

              <div className="text-right text-xs text-muted-foreground">
                {formatDuration(segment.duration_minutes)}
              </div>
              <div className="relative flex justify-center">
                <span className="absolute inset-y-0 w-px bg-border" />
              </div>
              <div className="flex items-center gap-2 pb-3 text-xs text-muted-foreground">
                <AirlineLogo
                  code={segment.marketing_carrier.iata_code}
                  name={segment.marketing_carrier.name}
                  src={segment.marketing_carrier.logo_url}
                  className="size-6 rounded-md p-0.5"
                />
                {segment.marketing_carrier.name} · {segment.flight_number}
                {segment.aircraft && ` · ${segment.aircraft}`}
              </div>

              <div className="text-right text-sm font-semibold tabular">
                {localTime(segment.arriving_at)}
              </div>
              <div className="relative flex justify-center">
                <span className="z-10 mt-1 size-3 rounded-full bg-primary" />
              </div>
              <div className="text-sm">
                <span className="font-semibold">{segment.destination.iata_code}</span> ·{" "}
                {segment.destination.name}
              </div>
            </div>

            {slice.layovers[i] && (
              <div className="my-3 ml-[4.75rem] flex items-center gap-2 rounded-xl bg-brand-4/10 px-3 py-2 text-xs font-medium text-foreground">
                <Clock className="size-3.5 text-brand-4" />
                {formatDuration(slice.layovers[i].duration_minutes)} layover in{" "}
                {slice.layovers[i].airport.city} ({slice.layovers[i].airport.iata_code})
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FlightDetails({ offer }: { offer: FlightOffer }) {
  const perks = [
    {
      icon: Luggage,
      text: offer.checked_bags
        ? `${offer.checked_bags} checked bag${offer.checked_bags > 1 ? "s" : ""} included`
        : "No checked bag included",
      ok: offer.checked_bags > 0,
    },
    { icon: Briefcase, text: `${offer.carry_on_bags || 1} carry-on bag`, ok: true },
    {
      icon: RefreshCcw,
      text: offer.changeable
        ? offer.change_penalty
          ? `Changes allowed (fee ${formatMoney(offer.change_penalty, offer.currency, true)})`
          : "Free changes"
        : "No changes",
      ok: offer.changeable,
    },
    {
      icon: ShieldCheck,
      text: offer.refundable ? "Refundable" : "Non-refundable",
      ok: offer.refundable,
    },
  ];

  return (
    <div className="grid gap-6 border-t border-border p-5 md:grid-cols-[1fr_16rem]">
      <div className="space-y-6">
        {offer.slices.map((slice, i) => (
          <SliceTimeline key={i} slice={slice} label={i === 0 ? "Outbound" : "Return"} />
        ))}
      </div>
      <div className="space-y-4">
        <ul className="space-y-2.5 text-sm">
          {perks.map((perk) => (
            <li key={perk.text} className="flex items-center gap-2">
              <perk.icon
                className={perk.ok ? "size-4 text-success" : "size-4 text-muted-foreground"}
              />
              <span className={perk.ok ? "" : "text-muted-foreground"}>{perk.text}</span>
            </li>
          ))}
          {offer.emissions_kg && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Leaf className="size-4" /> ~{offer.emissions_kg} kg CO₂e
            </li>
          )}
        </ul>
        {offer.base_amount && offer.tax_amount && (
          <dl className="space-y-1 rounded-2xl bg-muted/60 p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fare</dt>
              <dd className="tabular">{formatMoney(offer.base_amount, offer.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Taxes & fees</dt>
              <dd className="tabular">{formatMoney(offer.tax_amount, offer.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatMoney(offer.total_amount, offer.currency)}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
