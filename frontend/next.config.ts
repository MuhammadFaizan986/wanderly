import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    // Destination photos come from Unsplash.
    remotePatterns: [new URL("https://images.unsplash.com/**")],
  },
};

export default nextConfig;
