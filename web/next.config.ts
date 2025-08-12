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
};

export default MillionLint.next({
  enabled: true,
  rsc: true,
})(nextConfig);
