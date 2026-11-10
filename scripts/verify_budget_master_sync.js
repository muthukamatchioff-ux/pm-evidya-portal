const fs = require('fs');
const path = require('path');

// PM e-Vidya Portal — Comprehensive Budget Master Synchronization Verification
console.log('================================================================================');
console.log('PM e-VIDYA PORTAL — BUDGET MASTER SYNCHRONIZATION AUDIT');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       -> ${details}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       -> ${details}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Canonical Budget Master Service Exists & Contains Proper Exports
// -----------------------------------------------------------------------------
const bmsPath = path.join(__dirname, '..', 'src', 'lib', 'budgetMasterService.ts');
assert(fs.existsSync(bmsPath), 'Test 1.1: budgetMasterService.ts exists');

const bmsContent = fs.readFileSync(bmsPath, 'utf8');
assert(bmsContent.includes('export async function getAuthoritativeSanctionedBudgets'), 'Test 1.2: Exports getAuthoritativeSanctionedBudgets()');
assert(bmsContent.includes('export async function getAuthoritativeBudgetSummary'), 'Test 1.3: Exports getAuthoritativeBudgetSummary()');
assert(bmsContent.includes('export async function syncBudgetComponentToBudgetHead'), 'Test 1.4: Exports syncBudgetComponentToBudgetHead()');
assert(bmsContent.includes('export const CANONICAL_ONLINE_COMPONENT_META'), 'Test 1.5: Exports CANONICAL_ONLINE_COMPONENT_META');

// -----------------------------------------------------------------------------
// TEST 2: Monthly Expenditure Report Wired to Canonical Budget Master
// -----------------------------------------------------------------------------
const monthlyPath = path.join(__dirname, '..', 'src', 'app', 'reports', 'monthly-expenditure', 'actions.ts');
const monthlyContent = fs.readFileSync(monthlyPath, 'utf8');
assert(monthlyContent.includes("from '@/lib/budgetMasterService'"), 'Test 2.1: Monthly Expenditure imports budgetMasterService');
assert(monthlyContent.includes('getAuthoritativeSanctionedBudgets()'), 'Test 2.2: Monthly Expenditure calls getAuthoritativeSanctionedBudgets()');
assert(monthlyContent.includes('budgetMaster.componentBudgetMap[comp.id]'), 'Test 2.3: Monthly Expenditure dynamically sets component sanctionedBudget');
assert(monthlyContent.includes('budgetMaster.totalSanctionedBudget'), 'Test 2.4: Monthly Expenditure dynamically sets grandSanctionedBudget');

// -----------------------------------------------------------------------------
// TEST 3: NCERT Report Wired to Canonical Budget Master
// -----------------------------------------------------------------------------
const ncertPath = path.join(__dirname, '..', 'src', 'app', 'reports', 'ncert-report', 'actions.ts');
const ncertContent = fs.readFileSync(ncertPath, 'utf8');
assert(ncertContent.includes("from '@/lib/budgetMasterService'"), 'Test 3.1: NCERT Report imports budgetMasterService');
assert(ncertContent.includes('getAuthoritativeSanctionedBudgets()'), 'Test 3.2: NCERT Report calls getAuthoritativeSanctionedBudgets()');
assert(ncertContent.includes('head1Video: budgetMaster.componentBudgetMap[1]'), 'Test 3.3: NCERT Report dynamically sets head1Video allocation');
assert(ncertContent.includes('totalAllocation: budgetMaster.totalSanctionedBudget'), 'Test 3.4: NCERT Report dynamically sets totalAllocation [M4]');
assert(ncertContent.includes("ws['M4'].v = alloc.totalAllocation"), 'Test 3.5: NCERT Excel export preserves dynamic M4 allocation');

// -----------------------------------------------------------------------------
// TEST 4: Budget Master Update Action Synchronizes & Invalidates Caches
// -----------------------------------------------------------------------------
const budgetActionsPath = path.join(__dirname, '..', 'src', 'app', 'budget', 'actions.ts');
const budgetActionsContent = fs.readFileSync(budgetActionsPath, 'utf8');
assert(budgetActionsContent.includes('syncBudgetComponentToBudgetHead'), 'Test 4.1: updateComponentBudget calls syncBudgetComponentToBudgetHead()');
assert(budgetActionsContent.includes('clearBudgetCache()'), 'Test 4.2: updateComponentBudget invalidates in-memory budgetCache');
assert(budgetActionsContent.includes("revalidatePath('/reports/monthly-expenditure'"), 'Test 4.3: revalidateAllFinancialViews revalidates /reports/monthly-expenditure');
assert(budgetActionsContent.includes("revalidatePath('/reports/ncert-report'"), 'Test 4.4: revalidateAllFinancialViews revalidates /reports/ncert-report');
assert(budgetActionsContent.includes("revalidatePath('/dashboard'"), 'Test 4.5: revalidateAllFinancialViews revalidates /dashboard');

// -----------------------------------------------------------------------------
// TEST 5: Financial Overview & Seven Head Report Wired to Budget Master
// -----------------------------------------------------------------------------
const reportsActionsPath = path.join(__dirname, '..', 'src', 'app', 'reports', 'actions.ts');
const reportsActionsContent = fs.readFileSync(reportsActionsPath, 'utf8');
assert(reportsActionsContent.includes("from '@/lib/budgetMasterService'"), 'Test 5.1: reports/actions.ts imports budgetMasterService');
assert(reportsActionsContent.includes('budgetMaster.componentBudgetMap[compNo]'), 'Test 5.2: financial_overview & seven_head dynamically set approvedBudget');

// -----------------------------------------------------------------------------
// TEST 6: Head 7 (Studio Upgradation) Offline-Only Isolation
// -----------------------------------------------------------------------------
assert(bmsContent.includes('componentNo: { lte: 6 }'), 'Test 6.1: budgetMasterService restricts online components to <= 6');
assert(budgetActionsContent.includes('componentNo: { lte: 6 }'), 'Test 6.2: getBudgetComponents restricts online components to <= 6');
assert(budgetActionsContent.includes('comp.componentNo > 6'), 'Test 6.3: getDashboardKPIs excludes Head 7 from online totals');

// -----------------------------------------------------------------------------
// TEST 7: 41 Authoritative Expenditure Records & ₹7,94,343 Preserved
// -----------------------------------------------------------------------------
const { REAL_PM_EVIDYA_BUDGET_COMPONENTS } = require('../src/lib/fallbackData.ts');
const { getAuthoritativeLedgerVouchers } = require('../src/lib/ncertFinancialService.ts');

const ncertVouchers = getAuthoritativeLedgerVouchers();
assert(ncertVouchers.length === 41, 'Test 7.1: Authoritative expenditure records count is 41', `Got: ${ncertVouchers.length}`);

let totalPaid = 0;
const compTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
for (const v of ncertVouchers) {
  totalPaid += v.paidAmount;
  if (compTotals[v.headId] !== undefined) {
    compTotals[v.headId] += v.paidAmount;
  }
}
assert(totalPaid === 794343, 'Test 7.2: Total Authoritative Expenditure is ₹7,94,343', `Got: ₹${totalPaid.toLocaleString('en-IN')}`);
assert(compTotals[1] === 155735, 'Test 7.3: Comp 1 (Digital Content) expenditure is ₹1,55,735', `Got: ₹${compTotals[1]}`);
assert(compTotals[2] === 210969, 'Test 7.4: Comp 2 (Capacity Building) expenditure is ₹2,10,969', `Got: ₹${compTotals[2]}`);
assert(compTotals[3] === 281774, 'Test 7.5: Comp 3 (Human Resource) expenditure is ₹2,81,774', `Got: ₹${compTotals[3]}`);
assert(compTotals[4] === 45865, 'Test 7.6: Comp 4 (Archive / Cloud) expenditure is ₹45,865', `Got: ₹${compTotals[4]}`);
assert(compTotals[5] === 0, 'Test 7.7: Comp 5 (School Telecast) expenditure is ₹0', `Got: ₹${compTotals[5]}`);
assert(compTotals[6] === 100000, 'Test 7.8: Comp 6 (Outreach / Advocacy) expenditure is ₹1,00,000', `Got: ₹${compTotals[6]}`);

// -----------------------------------------------------------------------------
// TEST 8: Baseline Budget Numbers for 6 Components Equal ₹1,97,00,000
// -----------------------------------------------------------------------------
let totalApprovedFallback = 0;
const expectedBudgets = {
  1: 10000000,
  2: 1000000,
  3: 7200000,
  4: 500000,
  5: 500000,
  6: 500000
};

for (const c of REAL_PM_EVIDYA_BUDGET_COMPONENTS) {
  if (c.componentNo <= 6) {
    totalApprovedFallback += c.approvedBudget;
    assert(
      c.approvedBudget === expectedBudgets[c.componentNo],
      `Test 8.${c.componentNo}: Component ${c.componentNo} approved budget is ₹${expectedBudgets[c.componentNo].toLocaleString('en-IN')}`,
      `Got: ₹${c.approvedBudget.toLocaleString('en-IN')}`
    );
  }
}
assert(totalApprovedFallback === 19700000, 'Test 8.7: Fallback online approved budget sum is ₹1,97,00,000', `Got: ₹${totalApprovedFallback.toLocaleString('en-IN')}`);

// -----------------------------------------------------------------------------
// TEST 9: Annexure V Phantom Entry Prevention & Clean Deletion
// -----------------------------------------------------------------------------
const syncAnnexuresPath = path.join(__dirname, '..', 'src', 'lib', 'syncAnnexures.ts');
const syncAnnexuresContent = fs.readFileSync(syncAnnexuresPath, 'utf8');
assert(syncAnnexuresContent.includes('const comp5NeedsSync = false'), 'Test 9.1: syncAnnexures does not automatically reseed Annexure V');
assert(REAL_PM_EVIDYA_BUDGET_COMPONENTS[4].annexureV.length === 0, 'Test 9.2: Fallback Annexure V entries are clean (0 phantom records)');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`TOTAL AUDIT CHECKS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log(`SUCCESS RATE: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('================================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n>>> ALL BUDGET MASTER SYNCHRONIZATION AUDIT CHECKS PASSED SUCCESSFULLY! <<<\n');
  process.exit(0);
}
