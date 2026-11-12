const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir, extFilter) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, extFilter));
    } else if (!extFilter || extFilter.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const checks = [];
function assertCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) {
    console.error(`FAIL: ${name} -> ${detail}`);
  } else {
    console.log(`PASS: ${name} (${detail})`);
  }
}

// 1. Lazy liveStore in src/lib/prisma.ts + tuned serverless pool limits
const prismaSrc = read('src/lib/prisma.ts');
assertCheck(
  'prisma.ts uses lazy getLiveStore + Proxy (no eager top-level loadLiveStore call)',
  prismaSrc.includes('function getLiveStore()') &&
    prismaSrc.includes('new Proxy(') &&
    !prismaSrc.includes('const liveStore = loadLiveStore()'),
  'lazy Proxy + tuned connection_limit'
);
assertCheck(
  'prisma.ts uses conservative serverless pool parameters',
  prismaSrc.includes('connection_limit=5') &&
    prismaSrc.includes('pool_timeout=10') &&
    prismaSrc.includes('connect_timeout=10'),
  'connection_limit=5, pool_timeout=10, connect_timeout=10'
);

// 2. Layout skips Sidebar/Header/SessionWarmer for VISITOR
const layoutSrc = read('src/app/layout.tsx');
assertCheck(
  'layout.tsx skips Sidebar, Header, and SessionWarmer when role === VISITOR',
  layoutSrc.includes("const isAuthenticated = role !== 'VISITOR'") &&
    layoutSrc.includes('isAuthenticated ? <Sidebar /> : null') &&
    layoutSrc.includes('isAuthenticated && <SessionWarmer'),
  'login screen avoids heavy authenticated shell & DB initialization'
);

// 3. Zero prefetch={true} anywhere in src/
const srcFiles = walk(path.join(ROOT, 'src'), ['.ts', '.tsx']);
const prefetchTrueHits = [];
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/prefetch=\{true\}/.test(content)) {
    prefetchTrueHits.push(path.relative(ROOT, file));
  }
}
assertCheck(
  'Zero prefetch={true} across src/ (prevents force-dynamic prefetch storms)',
  prefetchTrueHits.length === 0,
  prefetchTrueHits.length === 0 ? '0 hits' : `found in: ${prefetchTrueHits.join(', ')}`
);

// 4. Dynamic xlsx import instead of top-level static bundle bloat
const xlsxTopLevelHits = [];
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/^\s*import\s+\*\s+as\s+XLSX\s+from\s+['"]xlsx['"]/m.test(content)) {
    xlsxTopLevelHits.push(path.relative(ROOT, file));
  }
}
assertCheck(
  'No top-level static import * as XLSX from "xlsx" in src/',
  xlsxTopLevelHits.length === 0,
  xlsxTopLevelHits.length === 0 ? 'all Excel exports use lazy await import("xlsx")' : `found in: ${xlsxTopLevelHits.join(', ')}`
);

// 5. Shared cross-lambda data cache, warmers, API warmup, SessionWarmer, and loading skeletons
const requiredFiles = [
  'src/lib/dataCache.ts',
  'src/lib/portalCacheWarmers.ts',
  'src/app/api/warmup/route.ts',
  'src/components/SessionWarmer.tsx',
  'src/app/reports/monthly-expenditure/loading.tsx',
  'src/app/reports/ncert-report/loading.tsx',
  'src/app/production-workflow/loading.tsx',
];
const missingFiles = requiredFiles.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
assertCheck(
  'Required cold-start cache, warmup, and loading skeleton files exist',
  missingFiles.length === 0,
  missingFiles.length === 0 ? `${requiredFiles.length}/${requiredFiles.length} present` : `missing: ${missingFiles.join(', ')}`
);

// 6. Login pre-warms DB silently without blocking login UX
const loginSrc = read('src/app/login/page.tsx');
assertCheck(
  'login/page.tsx triggers non-blocking /api/warmup?phase=db on mount',
  loginSrc.includes("fetch('/api/warmup?phase=db'"),
  'silent DB + core pool pre-warm while user enters credentials'
);

// 7. Mutation actions invalidate financial / SME / video tags cleanly
const budgetActions = read('src/app/budget/actions.ts');
const workflowActions = read('src/app/production-workflow/actions.ts');
const syncAnnexures = read('src/lib/syncAnnexures.ts');
const syncRoute = read('src/app/api/sync-annexures/route.ts');
assertCheck(
  'All key mutation modules call tag invalidation helpers',
  budgetActions.includes('invalidateFinancialCaches') &&
    workflowActions.includes('invalidateVideoAndProductionCaches') &&
    syncAnnexures.includes('invalidateFinancialCaches') &&
    syncRoute.includes('invalidateFinancialCaches'),
  'financial, video/production, and sync mutations expire cache tags immediately'
);

const failed = checks.filter((c) => !c.ok);
console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} cold-start optimization checks passed.`);
if (failed.length > 0) {
  process.exit(1);
}

