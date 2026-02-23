import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: false,
    // leave build caching alone unless it also breaks:
    // turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;