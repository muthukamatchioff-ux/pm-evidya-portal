const fs = require('fs');

const code = fs.readFileSync('src/lib/ncertFinancialService.ts', 'utf8');

// Match getAuthoritativeLedgerVouchers
const match = code.match(/export function getAuthoritativeLedgerVouchers\(\): VerifiedLedgerVoucher\[\] \{([\s\S]*?)\n\}/);
if (!match) {
  console.error('Could not match getAuthoritativeLedgerVouchers in src/lib/ncertFinancialService.ts');
  process.exit(1);
}

// Extract vouchers JSON
const rawArr = match[1].match(/const vouchers: any\[\] = (\[[\s\S]*?\n  \]);/);
if (!rawArr) {
  console.error('Could not match vouchers array');
  process.exit(1);
}

const vouchers = eval(rawArr[1]);
console.log('Total Vouchers in ncertFinancialService:', vouchers.length);

let total = 0;
const compTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
vouchers.forEach(v => {
  total += v.paidAmount;
  compTotals[v.headId] = (compTotals[v.headId] || 0) + v.paidAmount;
});

console.log('Total Expenditure:', total);
console.log('Component Totals:', compTotals);

if (vouchers.length === 41 && total === 794343 && compTotals[5] === 0) {
  console.log('ALL ASSERTIONS PASSED FOR ncertFinancialService!');
} else {
  console.error('FAILED ASSERTIONS!');
  process.exit(1);
}
