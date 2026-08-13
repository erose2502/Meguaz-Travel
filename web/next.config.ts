import type { NextConfig } from "next";

// Baseline security headers. The app renders third-party photography and
// Higgsfield video, so img/media stay permissive while scripts do not.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), microphone=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) — what the Dockerfile ships
  // to EC2. `node server.js` runs it with no node_modules install on the box.
  output: "standalone",
  // Without this, the repo-root lockfile makes Next treat the repo as a
  // monorepo and nest the standalone output under web/, breaking the Docker CMD.
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Nothing under /api is cacheable — all of it is per-caller or paid.
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
