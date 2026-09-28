import type { Metadata } from "next";
import { LogIn } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return (
    <ComingSoon
      icon={LogIn}
      title="Log in"
      description="Accounts arrive in week 2, along with a one-click demo login."
    />
  );
}
