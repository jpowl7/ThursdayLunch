import type { NextConfig } from "next";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

const securityHeaders = [
  // Browsers must trust the declared content type; never sniff a response into a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nothing on this site is meant to be embedded in another site's frame.
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin when navigating off-site (e.g. restaurant website links).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these browser features; turn them off outright.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Always HTTPS for two years, including subdomains.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
