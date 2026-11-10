const fs = require('fs');

console.log('================================================================================');
console.log('PM e-VIDYA PORTAL — DASHBOARD & NCERT REPORT DYNAMIC VERIFICATION');
console.log('================================================================================\n');

// 1. Verify fallbackData contains ann4_nic_01
const fallbackCode = fs.readFileSync('src/lib/fallbackData.ts', 'utf8');
const hasAnn4 = fallbackCode.includes('"id": "ann4_nic_01"') && fallbackCode.includes('45865');
console.log(`1. Component 4 Canonical Record (ann4_nic_01 - ₹45,865): ${hasAnn4 ? 'FOUND [PASS]' : 'MISSING [FAIL]'}`);

// 2. Verify Budget Actions Component 4 fallback
const budgetActionsCode = fs.readFileSync('src/app/budget/actions.ts', 'utf8');
const hasComp4Fallback = budgetActionsCode.includes('comp.componentNo === 4 && (!comp.annexureIV || comp.annexureIV.length === 0)');
const hasComp4InKpis = budgetActionsCode.includes('comp.componentNo === 4) recordsCount += ((comp.annexureIV && comp.annexureIV.length > 0) ? comp.annexureIV.length : 1)');
const hasRevalidateAll = budgetActionsCode.includes("revalidatePath('/reports/ncert-report', 'page')");
console.log(`2. getBudgetComponents C4 Fallback: ${hasComp4Fallback ? 'IMPLEMENTED [PASS]' : 'MISSING [FAIL]'}`);
console.log(`3. getDashboardKPIs C4 Protection: ${hasComp4InKpis ? 'IMPLEMENTED [PASS]' : 'MISSING [FAIL]'}`);
console.log(`4. NCERT Report Revalidation in Actions: ${hasRevalidateAll ? 'IMPLEMENTED [PASS]' : 'MISSING [FAIL]'}`);

// 3. Verify NCERT Financial Service
const ncertServiceCode = fs.readFileSync('src/lib/ncertFinancialService.ts', 'utf8');
const match = ncertServiceCode.match(/export function getAuthoritativeLedgerVouchers\(\): VerifiedLedgerVoucher\[\] \{([\s\S]*?)\n\}/);
const rawArr = match[1].match(/const vouchers: any\[\] = (\[[\s\S]*?\n  \]);/);
const vouchers = eval(rawArr[1]);
console.log(`5. NCERT Authoritative Vouchers Count: ${vouchers.length} (Expected: 41) ${vouchers.length === 41 ? '[PASS]' : '[FAIL]'}`);

let totalExp = 0;
const compExp = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
vouchers.forEach(v => {
  totalExp += v.paidAmount;
  compExp[v.headId] = (compExp[v.headId] || 0) + v.paidAmount;
});

console.log(`6. NCERT Total Expenditure: ₹ ${totalExp.toLocaleString('en-IN')} (Expected: ₹ 7,94,343) ${totalExp === 794343 ? '[PASS]' : '[FAIL]'}`);
console.log(`   - Head 1 (Video): ₹ ${compExp[1].toLocaleString('en-IN')} (Expected: 1,55,735)`);
console.log(`   - Head 2 (Capacity): ₹ ${compExp[2].toLocaleString('en-IN')} (Expected: 2,10,969)`);
console.log(`   - Head 3 (HR): ₹ ${compExp[3].toLocaleString('en-IN')} (Expected: 2,81,774)`);
console.log(`   - Head 4 (Archive): ₹ ${compExp[4].toLocaleString('en-IN')} (Expected: 45,865)`);
console.log(`   - Head 5 (Telecast): ₹ ${compExp[5].toLocaleString('en-IN')} (Expected: 0)`);
console.log(`   - Head 6 (Feedback): ₹ ${compExp[6].toLocaleString('en-IN')} (Expected: 1,00,00,000 / 1,00,000)`);

// 4. Verify NCERT Report Actions & Page defaults
const ncertActionsCode = fs.readFileSync('src/app/reports/ncert-report/actions.ts', 'utf8');
const hasFetchLiveNcert = ncertActionsCode.includes('fetchLiveNcertVouchers');
const hasMergeUniqueNcert = ncertActionsCode.includes('mergeUniqueNcertVouchers');
const hasDefaultPortalActions = ncertActionsCode.includes("const budgetMode = options?.budgetMode || 'portal'");
const hasDefaultFullConsolidated = ncertActionsCode.includes("const accountingBasis = options?.accountingBasis || 'full_consolidated'");
console.log(`7. fetchLiveNcertVouchers in actions.ts: ${hasFetchLiveNcert ? '[PASS]' : '[FAIL]'}`);
console.log(`8. mergeUniqueNcertVouchers in actions.ts: ${hasMergeUniqueNcert ? '[PASS]' : '[FAIL]'}`);
console.log(`9. Default budgetMode in actions.ts: ${hasDefaultPortalActions ? 'portal [PASS]' : '[FAIL]'}`);
console.log(`10. Default accountingBasis in actions.ts: ${hasDefaultFullConsolidated ? 'full_consolidated [PASS]' : '[FAIL]'}`);

const ncertPageCode = fs.readFileSync('src/app/reports/ncert-report/page.tsx', 'utf8');
const hasDefaultPagePortal = ncertPageCode.includes("budgetMode: 'portal'");
const hasDefaultPageConsolidated = ncertPageCode.includes("accountingBasis: 'full_consolidated'");
console.log(`11. Page initialData budgetMode: ${hasDefaultPagePortal ? 'portal [PASS]' : '[FAIL]'}`);
console.log(`12. Page initialData accountingBasis: ${hasDefaultPageConsolidated ? 'full_consolidated [PASS]' : '[FAIL]'}`);

// 5. Verify NCERT Client UI
const ncertClientCode = fs.readFileSync('src/app/reports/ncert-report/NcertReportClient.tsx', 'utf8');
const hasLivePortalTab = ncertClientCode.includes('Live Portal Data (₹7.94 L)');
const hasPortalMasterTab = ncertClientCode.includes('Portal Master (₹1.94 Cr)');
console.log(`13. Client Live Portal Tab: ${hasLivePortalTab ? '[PASS]' : '[FAIL]'}`);
console.log(`14. Client Portal Master Tab: ${hasPortalMasterTab ? '[PASS]' : '[FAIL]'}`);

// Calculate monthly row sums simulation
const months = [
  'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026',
  'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027'
];

let cumVideo = 0;
let cumCap = 0;
let cumHr = 0;
let cumArch = 0;
let cumTele = 0;
let cumFeed = 0;
let cumTotal = 0;
const portalSanction = 19438520;

console.log('\n--- SIMULATED NCERT 45-COLUMN MONTHLY EXPENDITURE ROWS ---');
months.forEach((m) => {
  const mVs = vouchers.filter(v => (v.id === 'v-c3-01' ? 'Sep 2026' : v.monthKey) === m);
  const vSpent = mVs.filter(v => v.headId === 1).reduce((s, v) => s + v.paidAmount, 0);
  const cSpent = mVs.filter(v => v.headId === 2).reduce((s, v) => s + v.paidAmount, 0);
  const hSpent = mVs.filter(v => v.headId === 3).reduce((s, v) => s + v.paidAmount, 0);
  const aSpent = mVs.filter(v => v.headId === 4).reduce((s, v) => s + v.paidAmount, 0);
  const tSpent = mVs.filter(v => v.headId === 5).reduce((s, v) => s + v.paidAmount, 0);
  const fSpent = mVs.filter(v => v.headId === 6).reduce((s, v) => s + v.paidAmount, 0);
  const mTotal = vSpent + cSpent + hSpent + aSpent + tSpent + fSpent;

  cumVideo += vSpent;
  cumCap += cSpent;
  cumHr += hSpent;
  cumArch += aSpent;
  cumTele += tSpent;
  cumFeed += fSpent;
  cumTotal += mTotal;

  if (mTotal > 0) {
    console.log(`${m.padEnd(10)}: Video=₹${vSpent.toString().padStart(6)}, Cap=₹${cSpent.toString().padStart(6)}, HR=₹${hSpent.toString().padStart(6)}, Arch=₹${aSpent.toString().padStart(5)}, Tele=₹${tSpent}, Feed=₹${fSpent.toString().padStart(5)} | Month Total=₹${mTotal.toString().padStart(6)} | Remaining Bal=₹${(portalSanction - cumTotal).toLocaleString('en-IN')}`);
  }
});

console.log(`\nGrand Total Utilized: ₹ ${cumTotal.toLocaleString('en-IN')} (Target: 7,94,343)`);
console.log(`Remaining Unspent Balance: ₹ ${(portalSanction - cumTotal).toLocaleString('en-IN')} (Target: 1,86,44,177)`);
console.log(`Overall Utilization: ${(cumTotal / portalSanction * 100).toFixed(2)}% (Target: 4.09%)`);

const allPass = (
  hasAnn4 &&
  hasComp4Fallback &&
  hasComp4InKpis &&
  hasRevalidateAll &&
  vouchers.length === 41 &&
  totalExp === 794343 &&
  compExp[1] === 155735 &&
  compExp[2] === 210969 &&
  compExp[3] === 281774 &&
  compExp[4] === 45865 &&
  compExp[5] === 0 &&
  compExp[6] === 100000 &&
  hasFetchLiveNcert &&
  hasMergeUniqueNcert &&
  hasDefaultPortalActions &&
  hasDefaultFullConsolidated &&
  hasDefaultPagePortal &&
  hasDefaultPageConsolidated &&
  hasLivePortalTab &&
  hasPortalMasterTab &&
  cumTotal === 794343 &&
  (portalSanction - cumTotal) === 18644177
);

console.log('\n================================================================================');
console.log(allPass ? 'AUDIT RESULT: ALL DASHBOARD & NCERT REPORT ASSERTIONS PASSED (100%)' : 'AUDIT FAILED');
console.log('================================================================================\n');

if (!allPass) process.exit(1);

