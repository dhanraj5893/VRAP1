import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + worker assets; keep it external to the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
