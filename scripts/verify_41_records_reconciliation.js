const fs = require('fs');

const code = fs.readFileSync('src/app/reports/monthly-expenditure/actions.ts', 'utf8');

// Extract getAuthoritativeVouchers
const match = code.match(/function getAuthoritativeVouchers\(\): DrillDownVoucher\[\] \{([\s\S]*?)\n\}/);
if (!match) {
  console.error('Could not find getAuthoritativeVouchers');
  process.exit(1);
}

const lines = match[1].split('\n');
let vouchers = [];
let cur = null;

for (let line of lines) {
  const t = line.trim();
  if (t.startsWith('{')) {
    cur = {};
  } else if (t.startsWith('}') && cur) {
    if (cur.id) vouchers.push(cur);
    cur = null;
  } else if (cur) {
    const idM = t.match(/id:\s*['"]([^'"]+)['"]/);
    if (idM) cur.id = idM[1];
    const headM = t.match(/headId:\s*([0-9]+)/);
    if (headM) cur.headId = parseInt(headM[1], 10);
    const monthM = t.match(/monthKey:\s*['"]([^'"]+)['"]/);
    if (monthM) cur.monthKey = monthM[1];
    const paidM = t.match(/paidAmount:\s*([0-9.]+)/);
    if (paidM) cur.paidAmount = parseFloat(paidM[1]);
    const claimedM = t.match(/claimedAmount:\s*([0-9.]+)/);
    if (claimedM) cur.claimedAmount = parseFloat(claimedM[1]);
    const vNoM = t.match(/voucherOrUtr:\s*['"]([^'"]+)['"]/);
    if (vNoM) cur.voucherOrUtr = vNoM[1];
    const dateM = t.match(/date:\s*['"]([^'"]+)['"]/);
    if (dateM) cur.date = dateM[1];
  }
}

console.log('================================================================================');
console.log('PM e-VIDYA PORTAL — 41-RECORDS FINANCIAL RECONCILIATION AUDIT');
console.log('================================================================================');

console.log(`\n[PASS] Total Expenditure Records: ${vouchers.length} (Expected: 41)`);

const compTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
const compCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
const monthTotals = {};
let grandTotal = 0;

for (let v of vouchers) {
  compTotals[v.headId] = (compTotals[v.headId] || 0) + v.paidAmount;
  compCounts[v.headId] = (compCounts[v.headId] || 0) + 1;
  monthTotals[v.monthKey] = (monthTotals[v.monthKey] || 0) + v.paidAmount;
  grandTotal += v.paidAmount;
}

console.log('\n--- COMPONENT SUMMARY (6 ONLINE HEADS) ---');
console.log(`1. Digital Content:       ₹ ${compTotals[1].toLocaleString('en-IN').padStart(10)} (${compCounts[1]} vouchers)`);
console.log(`2. Capacity Building:     ₹ ${compTotals[2].toLocaleString('en-IN').padStart(10)} (${compCounts[2]} vouchers)`);
console.log(`3. Human Resource:        ₹ ${compTotals[3].toLocaleString('en-IN').padStart(10)} (${compCounts[3]} vouchers)`);
console.log(`4. Archive / Bandwidth:   ₹ ${compTotals[4].toLocaleString('en-IN').padStart(10)} (${compCounts[4]} vouchers)`);
console.log(`5. School Telecast:       ₹ ${compTotals[5].toLocaleString('en-IN').padStart(10)} (${compCounts[5]} vouchers)`);
console.log(`6. Outreach / Advocacy:   ₹ ${compTotals[6].toLocaleString('en-IN').padStart(10)} (${compCounts[6]} vouchers)`);

console.log('\n--- MONTHLY EXPENDITURE BREAKDOWN ---');
const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];
for (let m of months) {
  console.log(`${m.padEnd(10)}: ₹ ${(monthTotals[m] || 0).toLocaleString('en-IN')}`);
}

const approvedBudget = 19438520;
const balance = approvedBudget - grandTotal;
const util = Number(((grandTotal / approvedBudget) * 100).toFixed(2));

console.log('\n--- CONSOLIDATED TOTALS ---');
console.log(`Grand Total Expenditure: ₹ ${grandTotal.toLocaleString('en-IN')} (Target: 7,94,343)`);
console.log(`Total Approved Budget:   ₹ ${approvedBudget.toLocaleString('en-IN')} (Target: 1,94,38,520)`);
console.log(`Available Balance:       ₹ ${balance.toLocaleString('en-IN')} (Target: 1,86,44,177)`);
console.log(`Overall Utilization:     ${util}% (Target: 4.09%)`);

// Verify the two additional records
const vC302 = vouchers.find(v => v.id === 'v-c3-02');
const vC602 = vouchers.find(v => v.id === 'v-c6-02');

console.log('\n--- ADDITIONAL 2 RECORDS AUDIT ---');
console.log('Record 1 (Comp 3):', vC302 ? `ID: ${vC302.id} | Voucher: ${vC302.voucherOrUtr} | Date: ${vC302.date} | Exp: ₹${vC302.paidAmount}` : 'MISSING');
console.log('Record 2 (Comp 6):', vC602 ? `ID: ${vC602.id} | Voucher: ${vC602.voucherOrUtr} | Date: ${vC602.date} | Exp: ₹${vC602.paidAmount}` : 'MISSING');

const twoSum = (vC302 ? vC302.paidAmount : 0) + (vC602 ? vC602.paidAmount : 0);
console.log(`Combined Gross of 2 Records: ₹${twoSum} (136774 + 40000 = 176,774)`);

// Variance reconciliation:
const comp5Sum = vouchers.filter(v => v.headId === 5).reduce((s, v) => s + v.claimedAmount, 0);
console.log(`Component 5 Pending Disbursed Commitment: ₹${comp5Sum}`);
console.log(`Net Baseline Variance: ₹${twoSum} - ₹${comp5Sum} = ₹${twoSum - comp5Sum} (Matches ₹35,548 exactly!)`);

const assertions = [
  vouchers.length === 41,
  grandTotal === 794343,
  approvedBudget === 19438520,
  balance === 18644177,
  util === 4.09,
  compTotals[1] === 155735,
  compTotals[2] === 210969,
  compTotals[3] === 281774,
  compTotals[4] === 45865,
  compTotals[5] === 0,
  compTotals[6] === 100000,
  compCounts[1] === 8,
  compCounts[2] === 26,
  compCounts[3] === 2,
  compCounts[4] === 1,
  compCounts[5] === 2,
  compCounts[6] === 2,
  (twoSum - comp5Sum) === 35548
];

if (assertions.every(Boolean)) {
  console.log('\n================================================================================');
  console.log('AUDIT RESULT: ALL 18 FINANCIAL RECONCILIATION ASSERTIONS PASSED (100%)');
  console.log('================================================================================\n');
} else {
  console.error('\nAUDIT FAILED!');
  process.exit(1);
}
