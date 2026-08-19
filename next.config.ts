import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ohne das sucht Turbopack sich die Workspace-Wurzel selbst und landet bei einer
  // fremden lockfile eine Ebene höher (C:\dev).
  turbopack: { root: path.resolve(__dirname) },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
};

export default nextConfig;
