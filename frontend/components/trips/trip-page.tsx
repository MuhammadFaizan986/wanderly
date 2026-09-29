"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2, Lock, MessageSquareText, Printer, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { copyShareLink } from "@/components/itinerary/itinerary-panel";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrip } from "@/hooks/use-trips";
import { api } from "@/lib/api";
import type { Trip } from "@/lib/types";

export function TripPage({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: trip, isPending, isError } = useTrip(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sharing = useMutation({
    mutationFn: (makePublic: boolean) =>
      makePublic ? api.post<Trip>(`/trips/${id}/share`) : api.delete<Trip>(`/trips/${id}/share`),
    onSuccess: (updated) => {
      queryClient.setQueryData(["trips", id], updated);
      void queryClient.invalidateQueries({ queryKey: ["trips"], exact: true });
      if (updated.is_public && updated.share_slug) void copyShareLink(updated.share_slug);
      else toast.success("Sharing turned off. The old link no longer works.");
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/trips/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip deleted");
      router.replace("/trips");
    },
  });

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> My Trips
        </Link>
        {trip && (
          <div className="flex flex-wrap gap-2">
            {trip.conversation_id && (
              <Button asChild variant="gradient-outline" size="sm" className="h-9 px-4">
                <Link href={`/plan?c=${trip.conversation_id}` as Route}>
                  <MessageSquareText /> Refine in chat
                </Link>
              </Button>
            )}
            {trip.is_public && trip.share_slug ? (
              <>
                <Button
                  variant="ink"
                  size="sm"
                  className="h-9 px-4"
                  onClick={() => copyShareLink(trip.share_slug!)}
                >
                  <Link2 /> Copy link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => sharing.mutate(false)}
                >
                  <Lock /> Stop sharing
                </Button>
              </>
            ) : (
              <Button
                variant="ink"
                size="sm"
                className="h-9 px-4"
                onClick={() => sharing.mutate(true)}
                disabled={sharing.isPending}
              >
                <Link2 /> Share
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full"
              onClick={() => window.print()}
            >
              <Printer /> Print / PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => (confirmDelete ? remove.mutate() : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
              disabled={remove.isPending}
            >
              <Trash2 /> {confirmDelete ? "Tap again to delete" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[32rem] rounded-3xl" />
          <Skeleton className="h-[32rem] rounded-3xl" />
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-muted-foreground">Trip not found.</p>
      ) : (
        <ItineraryView itinerary={trip.itinerary} layout="page" />
      )}
    </section>
  );
}
