import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatPage } from "@/components/chat/chat-page";

export const metadata: Metadata = { title: "AI trip planner" };

export default function PlanPage() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
