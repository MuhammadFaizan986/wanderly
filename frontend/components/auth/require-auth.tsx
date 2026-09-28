"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-provider";

/** Client-side guard: the access token lives in memory, so protection happens here. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}` as "/login");
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  return children;
}
