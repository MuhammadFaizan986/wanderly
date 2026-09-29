import type { NextConfig } from "next";

// Server-side only: where the FastAPI backend lives (the Railway URL in production).
// The browser talks to same-origin paths, so the httpOnly refresh cookie stays first-party.
const apiUrl = process.env.API_URL ?? "http://localhost:8100";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    // Destination photos come from Unsplash.
    remotePatterns: [new URL("https://images.unsplash.com/**")],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/health", destination: `${apiUrl}/health` },
      // Public Swagger docs, served from the site's own domain.
      { source: "/docs", destination: `${apiUrl}/docs` },
      { source: "/openapi.json", destination: `${apiUrl}/openapi.json` },
    ];
  },
};

export default nextConfig;
