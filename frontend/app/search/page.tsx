import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchPage } from "@/components/search/search-page";

export const metadata: Metadata = { title: "Search flights" };

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
