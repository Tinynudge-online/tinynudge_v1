import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Disable TypeScript errors during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;