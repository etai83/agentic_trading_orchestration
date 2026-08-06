import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid stale RSC/webpack chunk mismatches after build↔dev switches.
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
