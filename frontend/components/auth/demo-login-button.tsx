"use client";

import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

export function DemoLoginButton({ onSuccess }: { onSuccess: () => void }) {
  const { loginAsDemo } = useAuth();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="gradient-outline"
      className="h-11 w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await loginAsDemo();
          toast.success("Welcome! You're using the demo account.");
          onSuccess();
        } catch (error) {
          toast.error(error instanceof ApiError ? error.message : "Demo login failed.");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Zap className="text-brand-4" />}
      Try the demo account
    </Button>
  );
}
