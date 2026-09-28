import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "AI trip planner" };

export default function Page() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AI trip planner"
      description="Chat with Wanderly to plan a trip end to end. Coming in week 5."
    />
  );
}
