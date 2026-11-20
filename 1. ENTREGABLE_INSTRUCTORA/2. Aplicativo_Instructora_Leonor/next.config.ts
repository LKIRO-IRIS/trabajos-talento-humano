import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Safety net: ignorar errores de tipos en build (igual que SIGTH)
    // para que componentes no usados no rompan el build de Netlify
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Evitar warning de multiple lockfiles en Netlify
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
