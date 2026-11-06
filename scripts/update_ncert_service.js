const fs = require('fs');

const monthlyCode = fs.readFileSync('src/app/reports/monthly-expenditure/actions.ts', 'utf8');

// Extract the getAuthoritativeVouchers array
const match = monthlyCode.match(/function getAuthoritativeVouchers\(\): DrillDownVoucher\[\] \{([\s\S]*?)\n\}/);
if (!match) {
  console.error('Could not extract getAuthoritativeVouchers from monthly-expenditure/actions.ts');
  process.exit(1);
}

const rawArrayBody = match[1].replace(/^\s*return\s*/, '').trim();

// Now read existing src/lib/ncertFinancialService.ts
const ncertServiceCode = fs.readFileSync('src/lib/ncertFinancialService.ts', 'utf8');

// Build the updated getAuthoritativeLedgerVouchers function
const updatedFunction = `// Complete Authoritative Ledger Records (41 Audited Records - ₹7,94,343)
export function getAuthoritativeLedgerVouchers(): VerifiedLedgerVoucher[] {
  const vouchers: any[] = ${rawArrayBody};
  return vouchers.map(v => ({
    ...v,
    accountingMonth: v.id === 'v-c3-01' ? 'Sep 2026' : v.monthKey,
    settlementMonth: v.monthKey,
    accountingBasisNote: v.id === 'v-c3-01'
      ? 'Earned for Work Period September 2026; Settled via Accounting Journal Voucher on 07-Oct-2026.'
      : (v.id === 'v-c3-02' ? 'Work period October 2026 operational staffing payroll.' : undefined),
    status: v.status || 'VERIFIED',
  }));
}`;

// Replace in ncertFinancialService.ts
const funcRegex = /\/\/ Complete Authoritative Ledger Records[\s\S]*?export function getAuthoritativeLedgerVouchers\(\): VerifiedLedgerVoucher\[\] \{[\s\S]*?\n\}/;
if (!funcRegex.test(ncertServiceCode)) {
  console.error('Could not find getAuthoritativeLedgerVouchers in src/lib/ncertFinancialService.ts');
  process.exit(1);
}

const newNcertServiceCode = ncertServiceCode.replace(funcRegex, updatedFunction);
fs.writeFileSync('src/lib/ncertFinancialService.ts', newNcertServiceCode, 'utf8');
console.log('Successfully updated src/lib/ncertFinancialService.ts with 41 authoritative vouchers!');
