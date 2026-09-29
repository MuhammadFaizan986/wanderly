import { AirlineLogo } from "@/components/flights/airline-logo";
import { FareTimer } from "@/components/booking/fare-timer";
import {
  formatDuration,
  formatMoney,
  localDate,
  localTime,
  PASSENGER_TYPE_LABELS,
  stopsLabel,
} from "@/lib/flights";
import type { FlightOffer } from "@/lib/types";

export function TripSummary({
  offer,
  showTimer = true,
}: {
  offer: FlightOffer;
  showTimer?: boolean;
}) {
  const counts = (offer.passengers ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-3xl p-1.5 shadow-lift border-gradient [--gradient-fill:var(--card)]">
      <div className="space-y-5 rounded-[1.3rem] bg-card p-5">
        <div className="flex items-center gap-3">
          <AirlineLogo
            code={offer.owner.iata_code}
            name={offer.owner.name}
            src={offer.owner.logo_url}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {offer.slices[0].origin.city} {offer.slices.length > 1 ? "⇄" : "→"}{" "}
              {offer.slices[0].destination.city}
            </p>
            <p className="text-xs text-muted-foreground">{offer.owner.name}</p>
          </div>
        </div>

        <ul className="space-y-3">
          {offer.slices.map((slice, i) => (
            <li key={i} className="rounded-2xl bg-muted/60 p-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {i === 0 ? "Outbound" : "Return"} · {localDate(slice.departing_at)}
              </p>
              <p className="mt-1 font-semibold tabular">
                {localTime(slice.departing_at)} {slice.origin.iata_code} →{" "}
                {localTime(slice.arriving_at)} {slice.destination.iata_code}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(slice.duration_minutes)} · {stopsLabel(slice.stops)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 text-sm">
          {Object.entries(counts).map(([type, n]) => (
            <div key={type} className="flex justify-between text-muted-foreground">
              <dt>
                {PASSENGER_TYPE_LABELS[type as keyof typeof PASSENGER_TYPE_LABELS]} × {n}
              </dt>
            </div>
          ))}
          {offer.base_amount && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fare</dt>
              <dd className="tabular">{formatMoney(offer.base_amount, offer.currency)}</dd>
            </div>
          )}
          {offer.tax_amount && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Taxes & fees</dt>
              <dd className="tabular">{formatMoney(offer.tax_amount, offer.currency)}</dd>
            </div>
          )}
          <div className="flex items-end justify-between border-t border-border pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="text-2xl font-extrabold text-price tabular">
              {formatMoney(offer.total_amount, offer.currency)}
            </dd>
          </div>
        </dl>

        {showTimer && <FareTimer expiresAt={offer.expires_at} className="w-full justify-center" />}
      </div>
    </div>
  );
}
