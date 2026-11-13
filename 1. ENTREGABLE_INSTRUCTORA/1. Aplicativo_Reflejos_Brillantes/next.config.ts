import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin output: "standalone" — el plugin @netlify/plugin-nextjs maneja
  // el output automáticamente y standalone puede interferir.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
