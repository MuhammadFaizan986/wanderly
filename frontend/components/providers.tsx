"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // Don't retry client errors (4xx); retry network/5xx once.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
          failureCount < 1,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <AuthProvider>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
          </AuthProvider>
          <Toaster richColors position="top-center" />
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
