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

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
