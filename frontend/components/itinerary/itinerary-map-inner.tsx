"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useTheme } from "next-themes";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import { dayColor } from "@/lib/itinerary";
import type { Itinerary } from "@/lib/types";

interface Pin {
  key: string;
  day: number;
  index: number;
  lat: number;
  lng: number;
  title: string;
  place: string;
}

function pinIcon(day: number, index: number, active: boolean) {
  const size = active ? 32 : 26;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${dayColor(day)};color:white;font:600 ${active ? 13 : 11}px/1 var(--font-sans);border:2px solid white;box-shadow:0 4px 12px rgb(0 0 0 / 25%);opacity:${active ? 1 : 0.9}">${index}</span>`,
  });
}

function FitBounds({ pins, center }: { pins: Pin[]; center: Itinerary["center"] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length > 1) {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), {
        padding: [40, 40],
        maxZoom: 15,
      });
    } else if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14);
    } else if (center) {
      map.setView([center.lat, center.lng], 12);
    }
  }, [map, pins, center]);
  return null;
}

export default function ItineraryMapInner({
  itinerary,
  selectedDay,
}: {
  itinerary: Itinerary;
  selectedDay: number | null;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const pins = useMemo<Pin[]>(
    () =>
      itinerary.days.flatMap((d) =>
        d.activities
          .map((a, i) => ({ a, i }))
          .filter(({ a }) => a.lat !== null && a.lng !== null)
          .map(({ a, i }) => ({
            key: `${d.day}-${i}`,
            day: d.day,
            index: i + 1,
            lat: a.lat!,
            lng: a.lng!,
            title: a.title,
            place: a.place,
          })),
      ),
    [itinerary],
  );
  const visible = selectedDay ? pins.filter((p) => p.day === selectedDay) : pins;
  const start =
    itinerary.center ?? (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: 20, lng: 0 });

  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={12}
      scrollWheelZoom={false}
      // Dark mode: invert the light OSM tiles rather than depend on a keyed dark tileset.
      className={
        dark
          ? "h-full w-full [&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.95)_contrast(0.9)]"
          : "h-full w-full"
      }
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {itinerary.days
        .filter((d) => !selectedDay || d.day === selectedDay)
        .map((d) => {
          const route = pins
            .filter((p) => p.day === d.day)
            .map((p) => [p.lat, p.lng] as [number, number]);
          return route.length > 1 ? (
            <Polyline
              key={d.day}
              positions={route}
              pathOptions={{ color: dayColor(d.day), weight: 3, opacity: 0.7, dashArray: "6 8" }}
            />
          ) : null;
        })}
      {visible.map((p) => (
        <Marker key={p.key} position={[p.lat, p.lng]} icon={pinIcon(p.day, p.index, !!selectedDay)}>
          <Popup>
            <strong>
              Day {p.day} · {p.title}
            </strong>
            <br />
            {p.place}
          </Popup>
        </Marker>
      ))}
      <FitBounds pins={visible} center={itinerary.center} />
    </MapContainer>
  );
}
