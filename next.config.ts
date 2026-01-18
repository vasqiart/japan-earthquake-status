import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable body parsing for webhook routes to get raw body
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
