"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Link2, Loader2, Save } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { Itinerary, Trip } from "@/lib/types";

export async function copyShareLink(slug: string) {
  const url = `${window.location.origin}/share/${slug}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied", { description: url });
  } catch {
    toast.message("Share link", { description: url });
  }
}

export function ItineraryPanel({
  conversationId,
  itinerary,
  tripId,
  onSaved,
  changedDays,
}: {
  conversationId: string | null;
  itinerary: Itinerary;
  tripId: string | null;
  onSaved: (tripId: string) => void;
  changedDays: number[];
}) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => api.post<Trip>("/trips", { conversation_id: conversationId }),
    onSuccess: (trip) => {
      onSaved(trip.id);
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip saved to My Trips", {
        description: "Edits you make in this chat stay in sync.",
      });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Couldn't save the trip."),
  });

  const share = useMutation({
    mutationFn: (id: string) => api.post<Trip>(`/trips/${id}/share`),
    onSuccess: (trip) => trip.share_slug && copyShareLink(trip.share_slug),
    onError: () => toast.error("Couldn't create a share link."),
  });

  const onSave = () => {
    if (!user) {
      toast.message("Log in to save your trip", {
        description: "Your chat will be right here when you're back.",
      });
      router.push(`/login?next=${encodeURIComponent(`/plan?c=${conversationId}`)}` as Route);
      return;
    }
    save.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {tripId ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
              <Check className="size-3.5" /> Saved
            </span>
            <Button
              variant="gradient-outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => share.mutate(tripId)}
              disabled={share.isPending}
            >
              {share.isPending ? <Loader2 className="animate-spin" /> : <Link2 />} Share
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3">
              <Link href={`/trips/${tripId}` as Route}>
                <ExternalLink /> Open
              </Link>
            </Button>
          </>
        ) : (
          <Button
            variant="brand"
            size="sm"
            className="h-9 px-4"
            onClick={onSave}
            disabled={save.isPending || !conversationId}
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save trip
          </Button>
        )}
      </div>
      <ItineraryView itinerary={itinerary} layout="panel" changedDays={changedDays} />
    </div>
  );
}
