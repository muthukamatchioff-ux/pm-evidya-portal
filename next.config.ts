import type { NextConfig } from "next";

// Ensure DATABASE_URL is valid before any Prisma Client initialization during build
const currentDbUrl = process.env.DATABASE_URL;
if (!currentDbUrl || (!currentDbUrl.startsWith('postgresql://') && !currentDbUrl.startsWith('postgres://'))) {
  const alt = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (alt && (alt.startsWith('postgresql://') || alt.startsWith('postgres://'))) {
    process.env.DATABASE_URL = alt;
  } else {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/pm_evidya_preview?schema=public';
  }
}

import { execSync } from "child_process";

function resolveImmutableBuildId(): string | null {
  if (process.env.BUILD_ID) return process.env.BUILD_ID;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.VOROA_COMMIT_SHA) return process.env.VOROA_COMMIT_SHA;
  if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null; // Next.js standard unique build ID generation
  }
}

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return resolveImmutableBuildId();
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
