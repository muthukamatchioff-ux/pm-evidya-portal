const { execSync } = require('child_process');

console.log(`[Build Runner] Initializing build process (VERCEL_ENV: ${process.env.VERCEL_ENV || 'production'})...`);

// 1. Ensure DATABASE_URL is valid before any Prisma command runs
const candidates = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL,
  process.env.POSTGRES_URL_NON_POOLING
];

let validDbUrl = null;
for (const raw of candidates) {
  if (typeof raw === 'string') {
    const clean = raw.trim().replace(/^["']|["']$/g, '');
    if ((clean.startsWith('postgresql://') || clean.startsWith('postgres://')) && !clean.includes('[SENSITIVE]')) {
      validDbUrl = clean;
      break;
    }
  }
}

if (!validDbUrl) {
  // If candidates were missing or masked (e.g. in Vercel Preview without DB config),
  // check local .env.bak or set a syntactically valid PostgreSQL dummy URL
  try {
    const fs = require('fs');
    const path = require('path');
    const bakPath = path.join(process.cwd(), '.env.bak');
    if (fs.existsSync(bakPath)) {
      const content = fs.readFileSync(bakPath, 'utf8');
      const match = content.match(/DATABASE_URL=["']?(postgres(?:ql)?:\/\/[^\s"']+)["']?/);
      if (match && match[1]) {
        validDbUrl = match[1].trim();
      }
    }
  } catch {}
}

if (!validDbUrl) {
  console.warn('[Build Notice] No valid PostgreSQL URL detected in environment. Supplying dummy valid URL for Prisma schema validation.');
  validDbUrl = 'postgresql://dummy:dummy@localhost:5432/pm_evidya_preview?schema=public';
}

process.env.DATABASE_URL = validDbUrl;

// 2. Generate Prisma Client
console.log('[Build Runner] Generating Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

// 3. Run migrations if in preview with a real DB URL
if (process.env.VERCEL_ENV === 'preview') {
  if (!validDbUrl.includes('localhost:5432/pm_evidya_preview')) {
    try {
      console.log('[Build Runner] Running prisma migrate deploy in Preview environment...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    } catch (e) {
      console.warn('[Build Runner] Preview migration skipped safely:', e.message);
    }
  } else {
    console.log('[Build Runner] Skipping Preview migration because database is not connected in Preview scope.');
  }
}

// 4. Run Next.js Build
console.log('[Build Runner] Executing Next.js optimized production build...');
execSync('npx next build', { stdio: 'inherit', env: process.env });
console.log('[Build Runner] Build completed successfully!');
