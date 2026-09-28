"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, fieldErrors } from "@/lib/api";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const registerSchema = z.object({
  full_name: z.string().trim().min(1, "Tell us your name").max(120),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(128)
    .refine((v) => !/^\d+$/.test(v) && !/^[a-zA-Z]+$/.test(v), {
      message: "Use a mix of letters and numbers or symbols",
    }),
});

type Mode = "login" | "register";
type FormValues = { email: string; password: string; full_name?: string };

function safeNext(next: string | null) {
  // Only allow same-site relative paths to avoid open redirects.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/trips";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { login, register: registerUser } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const isRegister = mode === "register";

  const form = useForm<FormValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { email: "", password: "", full_name: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const goNext = () => router.replace(next as "/trips");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = isRegister
        ? await registerUser({
            email: values.email,
            password: values.password,
            full_name: values.full_name ?? "",
          })
        : await login(values.email, values.password);
      toast.success(`Welcome${isRegister ? "" : " back"}, ${user.full_name.split(" ")[0]}!`);
      goNext();
    } catch (error) {
      const fields = fieldErrors(error);
      for (const [field, message] of Object.entries(fields)) {
        form.setError(field as keyof FormValues, { message });
      }
      if (Object.keys(fields).length === 0) {
        form.setError("root", {
          message: error instanceof ApiError ? error.message : "Something went wrong.",
        });
      }
    }
  });

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {isRegister && (
          <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
            <Input
              id="full_name"
              autoComplete="name"
              placeholder="Ayesha Khan"
              className="h-11"
              aria-invalid={!!errors.full_name}
              {...form.register("full_name")}
            />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "At least 8 characters" : "Your password"}
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
        </Field>

        {errors.root && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" variant="brand" className="group h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              {isRegister ? "Create account" : "Log in"}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <DemoLoginButton onSuccess={goNext} />

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "New to Wanderly? "}
        <Link
          href={{ pathname: isRegister ? "/login" : "/register", query: { next } }}
          className="font-semibold text-primary hover:underline"
        >
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
