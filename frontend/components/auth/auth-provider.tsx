"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, refreshSession, setAccessToken, subscribeToSession } from "@/lib/api";
import type { TokenResponse, User } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  loginAsDemo: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const applySession = useCallback((session: TokenResponse | null) => {
    setAccessToken(session?.access_token ?? null);
    setUser(session?.user ?? null);
    setStatus(session ? "authenticated" : "anonymous");
  }, []);

  // Restore the session from the refresh cookie on first load, and keep state in sync
  // when the API client refreshes (or fails to) in the background.
  useEffect(() => {
    const unsubscribe = subscribeToSession(applySession);
    void refreshSession();
    return unsubscribe;
  }, [applySession]);

  const startSession = useCallback(
    async (request: Promise<TokenResponse>) => {
      const session = await request;
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: (email, password) =>
        startSession(api.post<TokenResponse>("/auth/login", { email, password })),
      register: (input) => startSession(api.post<TokenResponse>("/auth/register", input)),
      loginAsDemo: () => startSession(api.post<TokenResponse>("/auth/demo")),
      logout: async () => {
        await api.post("/auth/logout").catch(() => undefined);
        applySession(null);
        queryClient.clear();
      },
    }),
    [user, status, startSession, applySession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
