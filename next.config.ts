import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  // Source research files are read at build time (static generation) from this folder.
  outputFileTracingIncludes: { "/**": ["./Ridgepeak_Fortress_Research/**"] },
};
export default config;
