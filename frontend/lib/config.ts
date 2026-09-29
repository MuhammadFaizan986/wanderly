export const config = {
  appName: "Wanderly",
  // The API docs are proxied through the site (see next.config.ts).
  apiDocsUrl: process.env.NEXT_PUBLIC_API_DOCS_URL ?? "/docs",
} as const;
