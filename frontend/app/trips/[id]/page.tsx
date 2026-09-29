import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { TripPage } from "@/components/trips/trip-page";

export const metadata: Metadata = { title: "Trip" };

export default async function Page({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  return (
    <RequireAuth>
      <TripPage id={id} />
    </RequireAuth>
  );
}
