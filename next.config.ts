import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
