import type { TokenResponse } from "@/lib/types";

/** Mirrors the backend error envelope: `{"error": {"code", "message", "details"}}`. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Query;
  /** Internal: skip the automatic refresh-and-retry on 401. */
  skipAuthRefresh?: boolean;
}

export const API_PREFIX = "/api/v1";

// ---- Session plumbing -------------------------------------------------------------
// The access token lives in memory only; the refresh token is an httpOnly cookie that
// JavaScript can't read. On a 401 we exchange the cookie for a new access token once.

let accessToken: string | null = null;
let refreshInFlight: Promise<TokenResponse | null> | null = null;
let onSessionChange: ((session: TokenResponse | null) => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function subscribeToSession(listener: (session: TokenResponse | null) => void) {
  onSessionChange = listener;
  return () => {
    if (onSessionChange === listener) onSessionChange = null;
  };
}

/** Single-flight refresh: concurrent 401s share one /auth/refresh call. */
export function refreshSession(): Promise<TokenResponse | null> {
  refreshInFlight ??= apiFetch<TokenResponse>(`${API_PREFIX}/auth/refresh`, {
    method: "POST",
    skipAuthRefresh: true,
  })
    .then((session) => {
      setAccessToken(session.access_token);
      onSessionChange?.(session);
      return session;
    })
    .catch(() => {
      setAccessToken(null);
      onSessionChange?.(null);
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

// ---- Fetch wrapper ----------------------------------------------------------------

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, skipAuthRefresh, ...init } = options;
  const finalHeaders = new Headers(headers);
  if (body !== undefined) finalHeaders.set("Content-Type", "application/json");
  if (accessToken) finalHeaders.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "network_error",
      "Can't reach Wanderly right now. Check your connection.",
    );
  }

  if (response.status === 401 && !skipAuthRefresh && accessToken) {
    const session = await refreshSession();
    if (session) return apiFetch<T>(path, { ...options, skipAuthRefresh: true });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "http_error",
      payload?.error?.message ?? "Something went wrong. Please try again.",
      payload?.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(`${API_PREFIX}${path}`, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(`${API_PREFIX}${path}`, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(`${API_PREFIX}${path}`, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(`${API_PREFIX}${path}`, { ...options, method: "DELETE" }),
};

export interface HealthResponse {
  status: "ok" | "degraded";
  environment: string;
  checks: Record<string, "ok" | "error">;
}

/** Field-level messages from a 422 validation error, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {};
  const result: Record<string, string> = {};
  for (const item of error.details as { loc?: unknown[]; msg?: string }[]) {
    const field = item.loc?.at(-1);
    if (typeof field === "string" && item.msg) {
      result[field] = item.msg.replace(/^Value error, /, "");
    }
  }
  return result;
}
