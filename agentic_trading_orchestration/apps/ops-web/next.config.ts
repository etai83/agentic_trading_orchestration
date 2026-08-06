import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid stale RSC/webpack chunk mismatches after build↔dev switches.
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Default 8001: host often has other services on :8000 (e.g. omlx).
        // Override with OPS_API_PROXY when needed.
        destination: `${process.env.OPS_API_PROXY || "http://127.0.0.1:8001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
