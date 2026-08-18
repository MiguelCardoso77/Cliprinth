import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodejs-whisper (via shelljs) spawns a child process using a path derived
  // from __dirname at runtime. Next.js's webpack/turbopack bundling rewrites
  // __dirname to a build-time placeholder, which breaks that resolution.
  // Excluding these from bundling keeps them as plain Node `require()`s so
  // __dirname stays accurate.
  serverExternalPackages: ["nodejs-whisper", "shelljs"],
  devIndicators: false,
};

export default nextConfig;
