import "@hay-fulbo/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    ...(process.env.ALLOWED_DEV_ORIGINS ? process.env.ALLOWED_DEV_ORIGINS.split(",") : []),
  ],
  async headers() {
    return [
      {
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
        source: "/compartido/:path*",
      },
      {
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
        source: "/api/shared/:path*",
      },
    ];
  },
  typedRoutes: true,
  experimental: {
    // Docker image builds keep .next/cache in a BuildKit cache mount; this lets
    // Turbopack reuse it so a deploy only recompiles what changed.
    turbopackFileSystemCacheForBuild: process.env.TURBOPACK_BUILD_CACHE === "1",
  },
  typescript: {
    // Docker image builds set this: CI's next build type-checks before every deploy.
    ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === "1",
  },
  reactCompiler: true,
  output: "standalone",
};

export default nextConfig;
