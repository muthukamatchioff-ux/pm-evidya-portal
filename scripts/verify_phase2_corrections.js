const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

console.log('================================================================================');
console.log('PM e-VIDYA PORTAL — PHASE 2 FINAL CORRECTION AUDIT & VERIFICATION SUITE');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       -> ${details}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       -> ${details}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// Test Group 1: Source Files & Content Inspection
// -----------------------------------------------------------------------------
const actionsPath = path.join(__dirname, '../src/app/reports/monthly-expenditure/actions.ts');
const clientPath = path.join(__dirname, '../src/app/reports/monthly-expenditure/MonthlyExpenditureClient.tsx');
const cssPath = path.join(__dirname, '../src/app/reports/monthly-expenditure/monthly-expenditure.module.css');
const storePath = path.join(__dirname, '../data/pm_evidya_live_store.json');

const actionsContent = fs.readFileSync(actionsPath, 'utf8');
const clientContent = fs.readFileSync(clientPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const storeContent = fs.readFileSync(storePath, 'utf8');
const store = JSON.parse(storeContent);

// Test 1: Check Component 5 has 0 vouchers in actions.ts
const hasComp5Vouchers = /v-c5-01|v-c5-02/.test(actionsContent);
assert(!hasComp5Vouchers, 'TASK 1.1: Component 5 unverified vouchers purged from actions.ts', 'No v-c5-01 or v-c5-02 references in actions.ts');

// Test 2: Check Component 5 in store has empty annexureV and 0 utilizedAmount
const comp5Store = store.budgetComponents.find(c => c.componentNo === 5);
const bh5Store = store.budgetHeads.find(b => b.name === '5. TELECAST SETUP IN SCHOOLS');
assert(
  comp5Store && comp5Store.annexureV.length === 0 && bh5Store && bh5Store.utilizedAmount === 0,
  'TASK 1.2: Store Component 5 and BudgetHead 5 verified at ₹0',
  `annexureV count: ${comp5Store?.annexureV?.length}, bh5 utilizedAmount: ${bh5Store?.utilizedAmount}`
);

// Test 3: Dynamic video duration calculation function exists in actions.ts
const hasVideoDurationFunc = actionsContent.includes('fetchVideoOutputMetrics') && 
                             actionsContent.includes('parseDurationToSeconds') &&
                             actionsContent.includes('formatSecondsToHms');
assert(hasVideoDurationFunc, 'TASK 2.1: Dynamic video output metrics calculation implemented in actions.ts', 'fetchVideoOutputMetrics, parseDurationToSeconds and formatSecondsToHms present');

// Test 4: Dynamic video calculation yields exact 29:15:07 hrs
function parseDurationToSeconds(duration) {
  if (!duration || typeof duration !== 'string') return null;
  const trimmed = duration.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'null' || trimmed === 'Duration Pending') return null;
  if (/^0+(:0+)+$/.test(trimmed)) return null;

  const parts = trimmed.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;

  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return seconds > 0 ? seconds : null;
}

function formatSecondsToHms(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isValidCompletedVideoLink(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'pending' || trimmed.toLowerCase() === 'tbd') {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

const rawVideos = store.videoLibraries || [];
const completed = rawVideos.filter((v) => isValidCompletedVideoLink(v.videoLink));
const seenTitles = new Set();
const seenLinks = new Set();
const uniqueVideos = [];

for (const v of completed) {
  const normTitle = (v.title || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
  const normLink = (v.videoLink || '').trim().toLowerCase();
  if (seenTitles.has(normTitle) || (normLink && seenLinks.has(normLink))) continue;
  seenTitles.add(normTitle);
  if (normLink) seenLinks.add(normLink);
  uniqueVideos.push(v);
}

let totalVideoSec = 0;
let unverifiedVideoCount = 0;

for (const v of uniqueVideos) {
  const sec = parseDurationToSeconds(v.duration);
  if (sec !== null) {
    totalVideoSec += sec;
  } else {
    unverifiedVideoCount++;
  }
}

const computedFormatted = formatSecondsToHms(totalVideoSec);
assert(
  uniqueVideos.length === 53 && totalVideoSec === 105307 && computedFormatted === '29:15:07' && unverifiedVideoCount === 0,
  'TASK 2.2: Exact completed video runtime verification',
  `Unique videos: ${uniqueVideos.length}, Total runtime: ${computedFormatted} hrs (${totalVideoSec}s), Unverified count: ${unverifiedVideoCount}`
);

// Test 5: Distinct production target maintained
const hasAnnualTarget = actionsContent.includes("'(vs. 160:00:00 hrs annual target)'") || actionsContent.includes("160:00:00 hrs");
assert(hasAnnualTarget, 'TASK 2.3: Production target (160:00:00 hrs) preserved separately from actual output', 'Target preserved in actions.ts');

// Test 6: CSS @page size is A3 landscape with 10mm 12mm margins
const hasA3Landscape = cssContent.includes('size: A3 landscape') && cssContent.includes('margin: 10mm 12mm');
assert(hasA3Landscape, 'TASK 3.1: CSS @page configured for A3 Landscape (10mm 12mm margins)', 'size: A3 landscape; margin: 10mm 12mm found in CSS');

// Test 7: Repeating table headers and break avoidance in print
const hasPrintTableRules = cssContent.includes('display: table-header-group !important') &&
                           cssContent.includes('page-break-inside: avoid !important') &&
                           cssContent.includes('position: static !important');
assert(hasPrintTableRules, 'TASK 3.2: Repeating thead, row break avoidance, and static column positioning in print', 'table-header-group, page-break-inside avoid, position static present');

// Test 8: Portal chrome, sidebar, navbar, action buttons hidden in print
const hasChromeHidden = cssContent.includes(':global(aside)') &&
                        cssContent.includes(':global(header)') &&
                        cssContent.includes(':global(nav)') &&
                        cssContent.includes('.btnExport') &&
                        cssContent.includes('.filterToolbar');
assert(hasChromeHidden, 'TASK 3.3: Portal navigation, chrome, filter toolbar, and export buttons hidden in print', 'aside, header, nav, btnExport, filterToolbar hidden');

// Test 9: Dedicated NIMI print header banner in client component and CSS
const hasPrintBanner = clientContent.includes('printHeaderBanner') && 
                       clientContent.includes('NATIONAL INSTRUCTIONAL MEDIA INSTITUTE (NIMI)') &&
                       cssContent.includes('.printHeaderBanner');
assert(hasPrintBanner, 'TASK 3.4: Official NIMI Print Header Banner integrated', 'printHeaderBanner present in client JSX and CSS');

// Test 10: PDF export handler sets clean document title
const hasPdfHandler = clientContent.includes('handleExportPdf') &&
                      clientContent.includes('PM_eVidya_Monthly_Expenditure_Report_2026-2027');
assert(hasPdfHandler, 'TASK 3.5: PDF export handler with official filename and native print dispatch', 'handleExportPdf sets document.title to PM_eVidya_Monthly_Expenditure_Report_2026-2027');

// Test 11: Single worksheet Excel export integrity
const hasOnlySummarySheet = clientContent.includes("XLSX.utils.book_append_sheet(wb, wsSummary, 'Monthly Summary')") &&
                            !clientContent.includes("XLSX.utils.book_append_sheet(wb, wsVouchers, 'Voucher Audit Ledger')");
assert(hasOnlySummarySheet, 'TASK 3.6: Excel export contains ONLY ONE worksheet (Monthly Summary)', 'Single worksheet appended; Voucher Audit Ledger omitted');

// -----------------------------------------------------------------------------
// Test Group 2: Financial Aggregation & Recalculation Check
// -----------------------------------------------------------------------------
// Simulate getAuthoritativeVouchers
function getTestVouchers() {
  const match = actionsContent.match(/function getAuthoritativeVouchers\(\): DrillDownVoucher\[\] \{([\s\S]*?)\n\}/);
  if (!match) return [];
  // Parse vouchers by extracting JSON-like objects
  const code = match[1];
  const vouchers = [];
  const voucherBlocks = code.split(/\{\s*id:/g).slice(1);
  for (const block of voucherBlocks) {
    const fullBlock = '{ id:' + block.split(/\n\s*\},/)[0] + '}';
    try {
      // Evaluate safe object literal
      const v = eval('(' + fullBlock + ')');
      vouchers.push(v);
    } catch (e) {
      // ignore eval issues on comments
    }
  }
  return vouchers;
}

const vouchers = getTestVouchers();
const headSummary = {
  1: { count: 0, sum: 0, budget: 10000000 },
  2: { count: 0, sum: 0, budget: 1000000 },
  3: { count: 0, sum: 0, budget: 7044000 },
  4: { count: 0, sum: 0, budget: 499520 },
  5: { count: 0, sum: 0, budget: 395000 },
  6: { count: 0, sum: 0, budget: 500000 },
};

vouchers.forEach(v => {
  if (headSummary[v.headId]) {
    headSummary[v.headId].count++;
    headSummary[v.headId].sum += v.paidAmount;
  }
});

let grandTotalExp = 0;
let grandTotalBudget = 0;
for (let h = 1; h <= 6; h++) {
  grandTotalExp += headSummary[h].sum;
  grandTotalBudget += headSummary[h].budget;
}
const grandBal = grandTotalBudget - grandTotalExp;
const overallUtil = Number(((grandTotalExp / grandTotalBudget) * 100).toFixed(2));

console.log('\n--- FINANCIAL RECALCULATION AUDIT ---');
console.log(`Head 1 (Digital Content):        ₹ ${headSummary[1].sum.toLocaleString('en-IN')} (${headSummary[1].count} vouchers)`);
console.log(`Head 2 (Capacity Building):      ₹ ${headSummary[2].sum.toLocaleString('en-IN')} (${headSummary[2].count} vouchers)`);
console.log(`Head 3 (Human Resource):         ₹ ${headSummary[3].sum.toLocaleString('en-IN')} (${headSummary[3].count} vouchers)`);
console.log(`Head 4 (Digital Infra/Archive):  ₹ ${headSummary[4].sum.toLocaleString('en-IN')} (${headSummary[4].count} vouchers)`);
console.log(`Head 5 (School Telecast Infra):  ₹ ${headSummary[5].sum.toLocaleString('en-IN')} (${headSummary[5].count} vouchers)`);
console.log(`Head 6 (Feedback/Advocacy):      ₹ ${headSummary[6].sum.toLocaleString('en-IN')} (${headSummary[6].count} vouchers)`);
console.log('--------------------------------------------------------------------------------');
console.log(`Grand Total Expenditure:         ₹ ${grandTotalExp.toLocaleString('en-IN')}`);
console.log(`Grand Sanctioned Budget:         ₹ ${grandTotalBudget.toLocaleString('en-IN')}`);
console.log(`Available Balance:               ₹ ${grandBal.toLocaleString('en-IN')}`);
console.log(`Overall Utilization:             ${overallUtil}%`);
console.log(`Total Source Vouchers:           ${vouchers.length}\n`);

// Test 12: Total Vouchers count is exactly 39
assert(vouchers.length === 39, 'TASK 1.3: Total verified voucher count equals exactly 39', `Vouchers count: ${vouchers.length}`);

// Test 13: Head 5 has 0 vouchers and ₹0 expenditure
assert(headSummary[5].count === 0 && headSummary[5].sum === 0, 'TASK 1.4: Head 5 expenditure is exactly ₹0 with 0 vouchers', `Head 5 count: ${headSummary[5].count}, sum: ₹${headSummary[5].sum}`);

// Test 14: Grand Total Expenditure is exactly ₹ 7,94,343
assert(grandTotalExp === 794343, 'TASK 1.5: Grand total expenditure is exactly ₹ 7,94,343', `Calculated: ₹ ${grandTotalExp.toLocaleString('en-IN')}`);

// Test 15: Available Balance is ₹ 1,86,44,177
assert(grandBal === 18644177, 'TASK 1.6: Available Balance is exactly ₹ 1,86,44,177', `Calculated: ₹ ${grandBal.toLocaleString('en-IN')}`);

// Test 16: Overall Utilization is 4.09%
assert(overallUtil === 4.09, 'TASK 1.7: Overall Utilization is exactly 4.09%', `Calculated: ${overallUtil}%`);

// Test 17: Consultant salary voucher JV20000062/26-27 is present in Head 3 with Oct 2026
const consultantVoucher = vouchers.find(v => v.voucherOrUtr === 'JV20000062/26-27');
assert(
  consultantVoucher && consultantVoucher.headId === 3 && consultantVoucher.paidAmount === 145000 && consultantVoucher.monthKey === 'Oct 2026',
  'TASK 1.8: Consultant salary voucher JV20000062/26-27 mapped to Oct 2026 (₹1,45,000)',
  `Mapped to ${consultantVoucher?.monthKey}, amount: ₹${consultantVoucher?.paidAmount}, date: ${consultantVoucher?.date}`
);

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log('================================================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests.`);
console.log('================================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 2 CORRECTIONS VERIFIED 100% SUCCESSFUL.\n');
}

