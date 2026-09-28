import type { NextConfig } from "next";

// Server-side only: where the FastAPI backend lives. The browser always talks to
// same-origin /api/*, so the httpOnly refresh cookie stays first-party in production.
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
    ];
  },
};

export default nextConfig;
