const {
  REAL_PM_EVIDYA_BUDGET_COMPONENTS,
  getCanonicalAnnexureI,
  getCanonicalAnnexureII,
  getCanonicalAnnexureIII
} = require('../src/lib/fallbackData.ts');

console.log('=== CANONICAL DATA VERIFICATION ===');
const c1 = getCanonicalAnnexureI();
const c2 = getCanonicalAnnexureII();
const c3 = getCanonicalAnnexureIII();

console.log('Component 1 (Annexure-I):', c1.length, 'records, sum =', c1.reduce((s, r) => s + r.totalExpenditure, 0));
console.log('Component 2 (Annexure-II):', c2.length, 'records, sum =', c2.reduce((s, r) => s + r.totalExpenditure, 0));
console.log('Component 3 (Annexure-III):', c3.length, 'records, sum =', c3.reduce((s, r) => s + r.totalExpenditure, 0));

if (c2.length !== 26) {
  console.error('FAIL: Component 2 must have 26 records!');
  process.exit(1);
}
if (c2.reduce((s, r) => s + r.totalExpenditure, 0) !== 210969) {
  console.error('FAIL: Component 2 sum must be 210969!');
  process.exit(1);
}
if (c1.length !== 8 || c1.reduce((s, r) => s + r.totalExpenditure, 0) !== 155735) {
  console.error('FAIL: Component 1 verification failed!');
  process.exit(1);
}
if (c3.length !== 1 || c3[0].totalExpenditure !== 145000 || c3[0].voucherNo !== 'JV20000062/26-27') {
  console.error('FAIL: Component 3 verification failed!');
  process.exit(1);
}

console.log('SUCCESS: All canonical datasets match exact requirements!');
