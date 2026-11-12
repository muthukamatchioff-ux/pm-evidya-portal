const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`[PASS] ${name}${detail ? ` -> ${detail}` : ''}`);
    pass++;
  } else {
    console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
    fail++;
  }
}

function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const root = path.join(__dirname, '..');

// 1. Parse BUNDLED_VIDEO_CATALOG from bundledVideoData.ts
const bundledSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'bundledVideoData.ts'), 'utf8');
const arrMatch = bundledSrc.match(/BUNDLED_VIDEO_CATALOG:\s*BundledVideoItem\[\]\s*=\s*(\[[\s\S]*?\]);/);
const catalog = arrMatch ? JSON.parse(arrMatch[1]) : [];

check('Bundled catalog count === 84', catalog.length === 84, `Got ${catalog.length}`);

const vid027 = catalog.find((v) => v.id === 'VID-027');
check('VID-027 (Pressure Measurement Introduction) duration repaired to 0:40:11', vid027 && vid027.duration === '0:40:11' && vid027.durationSeconds === 2411, `Got ${vid027?.duration} (${vid027?.durationSeconds}s)`);

const unlinked = catalog.filter((v) => !v.videoLink || !v.videoLink.startsWith('http'));
const fakeCompleted = unlinked.filter((v) => (v.status || '').toUpperCase() === 'COMPLETED');
check('No unlinked module falsely marked COMPLETED', fakeCompleted.length === 0, `Unlinked: ${unlinked.length}, False COMPLETED: ${fakeCompleted.length}`);

const linked = catalog.filter((v) => v.videoLink && v.videoLink.startsWith('http'));
const totalLinkedSec = linked.reduce((s, v) => s + (v.durationSeconds || 0), 0);
check('53 linked videos total duration === 29:15:07', linked.length === 53 && fmt(totalLinkedSec) === '29:15:07', `${linked.length} videos = ${fmt(totalLinkedSec)}`);

// Monthly checks
const expectedMonths = {
  'Jun 2026': { count: 1, linked: 0, dur: '00:00:00' },
  'Jul 2026': { count: 9, linked: 9, dur: '06:39:12' },
  'Aug 2026': { count: 27, linked: 25, dur: '11:06:45' },
  'Sep 2026': { count: 34, linked: 12, dur: '08:33:21' },
  'Oct 2026': { count: 13, linked: 7, dur: '02:55:49' },
};
for (const [m, exp] of Object.entries(expectedMonths)) {
  const mRows = catalog.filter((v) => v.month === m);
  const mLinked = mRows.filter((v) => v.videoLink && v.videoLink.startsWith('http'));
  const mSec = mRows.reduce((s, v) => s + (v.durationSeconds || 0), 0);
  check(
    `Month ${m} parity`,
    mRows.length === exp.count && mLinked.length === exp.linked && fmt(mSec) === exp.dur,
    `${mRows.length} total, ${mLinked.length} linked, ${fmt(mSec)}`
  );
}

// 2. Check knownVideoDurations exact matching logic
const knownSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'knownVideoDurations.ts'), 'utf8');
check(
  'knownVideoDurations sorts descending by length and resolves exact first',
  knownSrc.includes('b[0].length - a[0].length') && knownSrc.includes('NORMALIZED_KNOWN_EXACT.has(normalizedTitle)'),
  'Exact + longest-key priority'
);

// 3. Check videoCatalogService queries ShootingSchedule and invalidation wiring
const svcSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'videoCatalogService.ts'), 'utf8');
check('videoCatalogService queries prisma.shootingSchedule', svcSrc.includes('prisma.shootingSchedule.findMany()'));

const contentActions = fs.readFileSync(path.join(root, 'src', 'app', 'content', 'actions.ts'), 'utf8');
const prodActions = fs.readFileSync(path.join(root, 'src', 'app', 'video-production', 'actions.ts'), 'utf8');
check(
  'content & video-production actions invalidate VideoCatalogCache and revalidate reports',
  contentActions.includes('invalidateVideoCatalogCache()') &&
    contentActions.includes("revalidatePath('/reports/ncert-report')") &&
    prodActions.includes('invalidateVideoCatalogCache()') &&
    prodActions.includes("revalidatePath('/reports/ncert-report')")
);

const ncertClient = fs.readFileSync(path.join(root, 'src', 'app', 'reports', 'ncert-report', 'NcertReportClient.tsx'), 'utf8');
check(
  'NCERT Report Client supports Col G click, Watch Video links, and real workflow status badges',
  ncertClient.includes('Watch Video') &&
    ncertClient.includes('Click to view subject video modules') &&
    !ncertClient.includes('styles.badgeInfo')
);

const trackerComp = fs.readFileSync(path.join(root, 'src', 'app', 'reports', 'VideoProductionTrackerReport.tsx'), 'utf8');
check(
  'VideoProductionTrackerReport displays Links Ready & Total Duration in Monthly and Trade sections',
  trackerComp.includes('Links Ready') &&
    trackerComp.includes('m.totalDurationStr') &&
    trackerComp.includes('t.totalDurationStr') &&
    trackerComp.includes('isVid27Collision')
);

console.log(`\nSummary: ${pass} passed, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
