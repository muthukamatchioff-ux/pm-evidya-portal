const https = require('https');

https.get('https://pmevidyanimi.online/api/sync-annexures?summary=true', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('--- LIVE VOROA VERIFICATION ---');
      console.log('Success:         ', json.success);
      console.log('Reporting Period:', json.reportingPeriod);
      console.log('Statement Date:  ', json.statementDate);
      console.log('\n--- GRAND TOTALS ---');
      console.log(JSON.stringify(json.grandTotals, null, 2));
      console.log('\n--- 6 COMPONENTS ---');
      (json.components || []).forEach(c => {
        console.log(`[Component ${c.componentNo}] ${c.name}`);
        console.log(`    Approved Budget:    ₹ ${c.approvedBudget.toLocaleString('en-IN')}`);
        console.log(`    Expenditure:        ₹ ${c.expenditureIncurred.toLocaleString('en-IN')}`);
        console.log(`    Unutilized Balance: ₹ ${c.unutilizedBalance.toLocaleString('en-IN')}`);
        console.log(`    Utilization:        ${c.utilizationPercent}%`);
        console.log(`    Records Count:      ${c.recordsCount}`);
        if (c.annexureIII) {
          console.log('    Annexure-III Transaction:');
          c.annexureIII.forEach(t => {
            console.log(`      * Date:           ${t.datePeriod}`);
            console.log(`      * CoA Name:       ${t.personnelName}`);
            console.log(`      * Designation:    ${t.designation}`);
            console.log(`      * Txn Type:       ${t.tranType}`);
            console.log(`      * Voucher No:     ${t.voucherNo}`);
            console.log(`      * Commitment No:  ${t.commitmentNo}`);
            console.log(`      * Expenditure:    ₹ ${t.totalExpenditure.toLocaleString('en-IN')}`);
            console.log(`      * Narration:      ${t.narration}`);
            console.log(`      * Status:         ${t.verificationStatus}`);
          });
        }
      });
    } catch(e) {
      console.log('Error parsing JSON. Raw data:', data.slice(0, 500));
    }
  });
}).on('error', e => console.error('Request error:', e));

