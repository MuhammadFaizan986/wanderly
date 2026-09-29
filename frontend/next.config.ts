import type { NextConfig } from "next";

// Server-side only: where the FastAPI backend lives. The browser always talks to
// same-origin paths, so the httpOnly refresh cookie stays first-party in production.
// On Render the API is reached over the private network via API_HOSTPORT ("host:port").
const apiUrl =
  process.env.API_URL ??
  (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : "http://localhost:8100");

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
