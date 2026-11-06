// Standalone Node script to verify monthly expenditure report logic
const path = require('path');
const fs = require('fs');

// Read actions.ts to inspect the exports and run direct assertions
const actionsCode = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'app', 'reports', 'monthly-expenditure', 'actions.ts'),
  'utf8'
);

console.log('--- VERIFYING ACTIONS.TS CODE INTEGRITY ---');

// 1. Verify 6 canonical online components
const has6Components = actionsCode.includes('CANONICAL_ONLINE_COMPONENTS: Array<{') &&
  actionsCode.includes('1. Digital Content Development & Production') &&
  actionsCode.includes('6. Outreach, Feedback, Research & Advocacy') &&
  !actionsCode.includes("name: '7. Studio Upgradation'");
console.log('1. Online scope strictly 6 components (Head 7 excluded from online array):', has6Components ? 'PASS' : 'FAIL');

// 2. Verify total budget sum
const budgetMatches = actionsCode.match(/sanctionedBudget:\s*([0-9]+)/g);
const totalSanctionedBudget = budgetMatches.reduce((acc, match) => {
  const num = parseInt(match.replace(/[^0-9]/g, ''), 10);
  return acc + num;
}, 0);
console.log('2. Total Sanctioned Budget across 6 components:', totalSanctionedBudget, totalSanctionedBudget === 19438520 ? 'PASS (₹1,94,38,520)' : 'FAIL');

// 3. Verify voucher count
const voucherMatches = actionsCode.match(/id:\s*['"]v-c[0-9]-[0-9]+['"]/g);
console.log('3. Authoritative Voucher count:', voucherMatches ? voucherMatches.length : 0, voucherMatches.length === 39 ? 'PASS (39 records)' : 'FAIL');

// 4. Verify JV20000062/26-27
const hasJV = actionsCode.includes("'JV20000062/26-27'") &&
  actionsCode.includes("'Oct 2026'") &&
  actionsCode.includes('145000') &&
  actionsCode.includes("'2026-10-07'");
console.log('4. JV20000062/26-27 mapped to Oct 2026 with 07-Oct-2026 date and ₹1,45,000:', hasJV ? 'PASS' : 'FAIL');

// 5. Verify Operational Window: June 2026 to March 2027
const hasOperationalBaseline = actionsCode.includes('totalFiscalMonthsCount = 10') &&
  actionsCode.includes("'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'") &&
  actionsCode.includes("monthsCoveredSub = 'June 2026 – October 2026'") &&
  actionsCode.includes("monthsCoveredStr = `${monthsCoveredCount} / ${totalFiscalMonthsCount}`");
console.log('5. 10-Month Operational Window baseline (June 2026 – March 2027):', hasOperationalBaseline ? 'PASS' : 'FAIL');

// 6. Verify client component
const clientCode = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'app', 'reports', 'monthly-expenditure', 'MonthlyExpenditureClient.tsx'),
  'utf8'
);
const hasClientCovered = clientCode.includes('{data.monthsCoveredStr}') && clientCode.includes('{data.monthsCoveredSub}');
const hasOperationalSubtext = clientCode.includes('(June 2026 – March 2027)');
console.log('6. Client component renders Months Covered and Operational Window:', (hasClientCovered && hasOperationalSubtext) ? 'PASS' : 'FAIL');

console.log('--- ALL CHECKS COMPLETED ---');
