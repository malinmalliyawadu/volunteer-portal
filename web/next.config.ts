import MillionLint from "@million/lint";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel serverless functions
  serverExternalPackages: ["@prisma/client", "bcrypt"],

  // Ensure Prisma client works in serverless environment
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@prisma/client");
    }
    return config;
  },

  // Rewrites for PostHog ingestion endpoints
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default MillionLint.next({
  enabled: false,
  rsc: true,
})(nextConfig);
