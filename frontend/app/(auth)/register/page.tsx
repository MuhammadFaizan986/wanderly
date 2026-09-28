import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Save trips, book flights and plan with AI.">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
