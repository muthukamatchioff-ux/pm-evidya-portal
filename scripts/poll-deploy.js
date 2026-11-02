const https = require('https');

function check() {
  return new Promise((resolve) => {
    https.get('https://pmevidyanimi.online/api/sync-annexures?summary=true', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          const c2 = json.components?.find(c => c.componentNo === 2);
          resolve({ hasAnnexureII: !!c2?.annexureII, c2, grandTotals: json.grandTotals });
        } catch(e) {
          resolve({ error: e.message });
        }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function main() {
  console.log('Polling for new build deployment on Voroa...');
  for (let attempt = 1; attempt <= 12; attempt++) {
    const res = await check();
    if (res.hasAnnexureII) {
      console.log(`\n🎉 New build e64fb23 is DEPLOYED on attempt ${attempt}!`);
      console.log('Component 2 status:', {
        recordsCount: res.c2.recordsCount,
        annexureIILength: res.c2.annexureII?.length,
        expenditureIncurred: res.c2.expenditureIncurred
      });
      console.log('Grand Totals:', res.grandTotals);
      return;
    }
    console.log(`Attempt ${attempt}: Still running previous build... waiting 10s`);
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log('Timed out waiting for new build.');
}

main();
