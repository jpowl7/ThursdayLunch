import type { NextConfig } from "next";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  headers: async () => [
    {
      source: "/api/events/:id/stream",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-transform" },
        { key: "Connection", value: "keep-alive" },
      ],
    },
  ],
};

export default nextConfig;
