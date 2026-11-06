const fs = require('fs');

const code = fs.readFileSync('src/lib/fallbackData.ts', 'utf8');
const match = code.match(/export const REAL_PM_EVIDYA_BUDGET_COMPONENTS = (\[[\s\S]*?\n\];)/);
if (!match) {
  console.error('Could not match REAL_PM_EVIDYA_BUDGET_COMPONENTS');
  process.exit(1);
}
const REAL_PM_EVIDYA_BUDGET_COMPONENTS = eval(match[1]);

// Simulate getBudgetComponents fallback / execution
const components = REAL_PM_EVIDYA_BUDGET_COMPONENTS.map((c) => {
  let expenditure = 0;
  if (c.componentNo === 1) c.annexureI?.forEach((a) => (expenditure += Number(a.totalExpenditure) || 0));
  if (c.componentNo === 2) c.annexureII?.forEach((a) => (expenditure += Number(a.totalExpenditure) || 0));
  if (c.componentNo === 3) c.annexureIII?.forEach((a) => (expenditure += Number(a.totalExpenditure) || 0));
  if (c.componentNo === 4) c.annexureIV?.forEach((a) => (expenditure += Number(a.totalExpenditure) || 0));
  if (c.componentNo === 5) c.annexureV?.forEach((a) => (expenditure += Number(a.totalExpenditure) || 0));
  if (c.componentNo === 6) c.annexureVI?.forEach((a) => (expenditure += Number(a.totalExpenditure) || 0));

  const unutilized = c.approvedBudget - expenditure;
  const utilization = c.approvedBudget > 0 ? (expenditure / c.approvedBudget) * 100 : 0;
  return {
    ...c,
    expenditureIncurred: expenditure,
    unutilizedBalance: unutilized,
    utilizationPercent: utilization.toFixed(2),
  };
});

// Simulate getDashboardKPIs
let totalApproved = 0;
let totalExpenditure = 0;
let recordsCount = 0;

components.forEach((comp) => {
  if (comp.componentNo > 6) return; // Head 7 is offline-only
  totalApproved += comp.approvedBudget;
  totalExpenditure += comp.expenditureIncurred;
  if (comp.componentNo === 1) recordsCount += (comp.annexureI?.length || 0);
  if (comp.componentNo === 2) recordsCount += (comp.annexureII?.length || 0);
  if (comp.componentNo === 3) recordsCount += (comp.annexureIII?.length || 0);
  if (comp.componentNo === 4) recordsCount += (comp.annexureIV?.length || 0);
  if (comp.componentNo === 5) recordsCount += (comp.annexureV?.length || 0);
  if (comp.componentNo === 6) recordsCount += (comp.annexureVI?.length || 0);
});

const totalUnutilized = totalApproved - totalExpenditure;
const overallUtilization = totalApproved > 0 ? ((totalExpenditure / totalApproved) * 100).toFixed(2) : '0.00';

const kpis = {
  totalApproved,
  totalExpenditure,
  totalUnutilized,
  overallUtilization,
  componentsCount: components.filter((c) => c.componentNo <= 6).length,
  recordsCount
};

console.log('--- DASHBOARD KPI VERIFICATION ---');
console.log('Total Approved:      ₹', kpis.totalApproved.toLocaleString('en-IN'), '(Expected: ₹ 1,94,38,520)');
console.log('Total Expenditure:   ₹', kpis.totalExpenditure.toLocaleString('en-IN'), '(Expected: ₹ 7,94,343)');
console.log('Total Unutilized:    ₹', kpis.totalUnutilized.toLocaleString('en-IN'), '(Expected: ₹ 1,86,44,177)');
console.log('Overall Utilization: ', kpis.overallUtilization + '%', '(Expected: 4.09%)');
console.log('Components Count:    ', kpis.componentsCount, '(Expected: 6)');
console.log('Records Count:       ', kpis.recordsCount, '(Expected: 41)');

console.log('\n--- COMPONENT-WISE CARDS ---');
components.forEach(c => {
  const count = (c.annexureI?.length || 0) + (c.annexureII?.length || 0) + (c.annexureIII?.length || 0) + (c.annexureIV?.length || 0) + (c.annexureV?.length || 0) + (c.annexureVI?.length || 0);
  console.log(`Comp ${c.componentNo} (${c.name}): Records=${count}, Exp=₹${c.expenditureIncurred.toLocaleString('en-IN')}, Budget=₹${c.approvedBudget.toLocaleString('en-IN')}`);
});

const passed = (
  kpis.totalApproved === 19438520 &&
  kpis.totalExpenditure === 794343 &&
  kpis.totalUnutilized === 18644177 &&
  kpis.overallUtilization === '4.09' &&
  kpis.componentsCount === 6 &&
  kpis.recordsCount === 41
);

console.log('\nAudit Result:', passed ? 'ALL DASHBOARD ASSERTIONS PASSED (100%)' : 'FAILED');
if (!passed) process.exit(1);
