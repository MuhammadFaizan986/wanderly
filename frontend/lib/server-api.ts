import "server-only";

/** Server components call FastAPI directly (the browser goes through the /api rewrite). */
const API_URL = (process.env.API_URL ?? "http://localhost:8100").replace(/\/+$/, "");

export async function serverGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
