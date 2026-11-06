const fs = require('fs');

// Verify REAL_PM_EVIDYA_BUDGET_COMPONENTS
const code = fs.readFileSync('src/lib/fallbackData.ts', 'utf8');

// Let's transpile or extract REAL_PM_EVIDYA_BUDGET_COMPONENTS
// We can use a node script that evaluates it or inspects counts
const match = code.match(/export const REAL_PM_EVIDYA_BUDGET_COMPONENTS = (\[[\s\S]*?\n\];)/);
if (!match) {
  console.error('Could not match REAL_PM_EVIDYA_BUDGET_COMPONENTS');
  process.exit(1);
}

const comps = eval(match[1]);
console.log('--- AUDITING REAL_PM_EVIDYA_BUDGET_COMPONENTS ---');
console.log('Total Components:', comps.length);

let grandBudget = 0;
let grandExp = 0;
let totalRecords = 0;

comps.forEach(c => {
  const a1 = c.annexureI?.length || 0;
  const a2 = c.annexureII?.length || 0;
  const a3 = c.annexureIII?.length || 0;
  const a4 = c.annexureIV?.length || 0;
  const a5 = c.annexureV?.length || 0;
  const a6 = c.annexureVI?.length || 0;
  const count = a1 + a2 + a3 + a4 + a5 + a6;
  
  let exp = 0;
  if (a1) exp += c.annexureI.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);
  if (a2) exp += c.annexureII.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);
  if (a3) exp += c.annexureIII.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);
  if (a4) exp += c.annexureIV.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);
  if (a5) exp += c.annexureV.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);
  if (a6) exp += c.annexureVI.reduce((s, x) => s + (Number(x.totalExpenditure) || 0), 0);

  grandBudget += c.approvedBudget;
  grandExp += exp;
  totalRecords += count;

  console.log(`Comp ${c.componentNo} (${c.name}): Records=${count}, Exp=₹${exp.toLocaleString('en-IN')}, Budget=₹${c.approvedBudget.toLocaleString('en-IN')}`);
});

console.log('--------------------------------------------------');
console.log(`TOTAL RECORDS: ${totalRecords} (Expected: 41)`);
console.log(`TOTAL APPROVED BUDGET: ₹${grandBudget.toLocaleString('en-IN')} (Expected: ₹1,94,38,520)`);
console.log(`TOTAL EXPENDITURE: ₹${grandExp.toLocaleString('en-IN')} (Expected: ₹7,94,343)`);
console.log(`AVAILABLE BALANCE: ₹${(grandBudget - grandExp).toLocaleString('en-IN')} (Expected: ₹1,86,44,177)`);
console.log(`UTILIZATION: ${((grandExp / grandBudget) * 100).toFixed(2)}% (Expected: 4.09%)`);
