import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@netlify/blobs", "sharp"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
