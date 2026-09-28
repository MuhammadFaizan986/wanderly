import type { Metadata } from "next";
import { Plane } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Flight search" };

export default function Page() {
  return (
    <ComingSoon
      icon={Plane}
      title="Flight search"
      description="Search real airline inventory with filters and smart sorting. Coming in week 3."
    />
  );
}
