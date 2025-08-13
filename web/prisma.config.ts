import "dotenv/config";
import type { PrismaConfig } from "prisma";

export default {
  migrations: {
    seed: "node prisma/seed.js",
  },
} satisfies PrismaConfig;
