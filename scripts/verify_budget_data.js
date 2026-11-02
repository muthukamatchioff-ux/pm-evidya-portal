const path = require('path');
const fs = require('fs');

// We can read and parse fallbackData.ts or require it with ts-node/tsx or simple parser
const content = fs.readFileSync(path.join(__dirname, '../src/lib/fallbackData.ts'), 'utf8');

// Extract REAL_PM_EVIDYA_BUDGET_COMPONENTS JSON
const compMatch = content.match(/export const REAL_PM_EVIDYA_BUDGET_COMPONENTS\s*=\s*(\[[\s\S]*?\]);\s*\n\s*export const REAL_PM_EVIDYA_BUDGET_HEADS/);
if (!compMatch) {
  console.error('Could not extract REAL_PM_EVIDYA_BUDGET_COMPONENTS');
  process.exit(1);
}

const headMatch = content.match(/export const REAL_PM_EVIDYA_BUDGET_HEADS\s*=\s*(\[[\s\S]*?\]);\s*\n/);
if (!headMatch) {
  console.error('Could not extract REAL_PM_EVIDYA_BUDGET_HEADS');
  process.exit(1);
}

const comps = JSON.parse(compMatch[1]);
const heads = JSON.parse(headMatch[1]);

console.log('=== VERIFYING BUDGET COMPONENTS ===');
let grandBudget = 0;
let grandExp = 0;
let grandRecs = 0;

comps.forEach(c => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][c.componentNo - 1];
  const list = c['annexure' + roman] || [];
  const exp = list.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);
  grandBudget += c.approvedBudget;
  grandExp += exp;
  grandRecs += list.length;
  console.log(`Component ${c.componentNo}: ${c.name}`);
  console.log(`  - Approved Budget:    ₹ ${c.approvedBudget.toLocaleString('en-IN')}`);
  console.log(`  - Expenditure:        ₹ ${exp.toLocaleString('en-IN')}`);
  console.log(`  - Unutilized Balance: ₹ ${(c.approvedBudget - exp).toLocaleString('en-IN')}`);
  console.log(`  - Utilization %:      ${c.approvedBudget > 0 ? ((exp / c.approvedBudget) * 100).toFixed(2) : 0}%`);
  console.log(`  - Records Count:      ${list.length}`);
  if (c.componentNo === 3) {
    console.log('  - Component 3 Details:');
    list.forEach(item => {
      console.log(`      * Date: ${item.datePeriod}`);
      console.log(`      * CoA/Personnel: ${item.personnelName}`);
      console.log(`      * Role/Designation: ${item.designation}`);
      console.log(`      * Txn Type: ${item.tranType}`);
      console.log(`      * Voucher No: ${item.voucherNo}`);
      console.log(`      * Commitment No: ${item.commitmentNo}`);
      console.log(`      * Expenditure: ₹ ${item.totalExpenditure}`);
      console.log(`      * Narration: ${item.narration}`);
    });
  }
});

console.log('\n=== GRAND TOTALS ===');
console.log(`Total Approved Budget: ₹ ${grandBudget.toLocaleString('en-IN')}`);
console.log(`Total Expenditure:     ₹ ${grandExp.toLocaleString('en-IN')}`);
console.log(`Total Unutilized:      ₹ ${(grandBudget - grandExp).toLocaleString('en-IN')}`);
console.log(`Overall Utilization:   ${((grandExp / grandBudget) * 100).toFixed(2)}%`);
console.log(`Total Records:         ${grandRecs}`);

console.log('\n=== VERIFYING 7 BUDGET HEADS ===');
let headsBudget = 0;
let headsExp = 0;
heads.forEach(h => {
  headsBudget += h.approvedBudget;
  headsExp += h.utilizedAmount;
  console.log(`${h.name}`);
  console.log(`  - Approved: ₹ ${h.approvedBudget.toLocaleString('en-IN')} | Utilized: ₹ ${h.utilizedAmount.toLocaleString('en-IN')}`);
});
console.log(`\nHeads Total Approved: ₹ ${headsBudget.toLocaleString('en-IN')}`);
console.log(`Heads Total Utilized: ₹ ${headsExp.toLocaleString('en-IN')}`);

