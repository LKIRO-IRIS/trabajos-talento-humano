import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Evitar warning de multiple lockfiles en Netlify
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
