const https = require('https');

function request(url, options = {}) {
  return new Promise((resolve) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function main() {
  console.log('1. Checking current live summary at https://pmevidyanimi.online/api/sync-annexures?summary=true...');
  const summaryBefore = await request('https://pmevidyanimi.online/api/sync-annexures?summary=true');
  console.log('Summary response status:', summaryBefore.status);
  if (summaryBefore.json && summaryBefore.json.components) {
    const c2 = summaryBefore.json.components.find(c => c.componentNo === 2);
    console.log('Component 2 status:', {
      name: c2?.name,
      recordsCount: c2?.recordsCount,
      expenditureIncurred: c2?.expenditureIncurred,
      unutilizedBalance: c2?.unutilizedBalance,
      utilizationPercent: c2?.utilizationPercent
    });
    console.log('Grand Totals:', summaryBefore.json.grandTotals);
  }

  console.log('\n2. Triggering sync via POST https://pmevidyanimi.online/api/sync-annexures...');
  const syncRes = await request('https://pmevidyanimi.online/api/sync-annexures', { method: 'POST' });
  console.log('Sync response:', JSON.stringify(syncRes, null, 2));

  console.log('\n3. Re-checking live summary after sync...');
  const summaryAfter = await request('https://pmevidyanimi.online/api/sync-annexures?summary=true');
  if (summaryAfter.json && summaryAfter.json.components) {
    const c2 = summaryAfter.json.components.find(c => c.componentNo === 2);
    console.log('Component 2 after sync:', {
      name: c2?.name,
      recordsCount: c2?.recordsCount,
      expenditureIncurred: c2?.expenditureIncurred,
      unutilizedBalance: c2?.unutilizedBalance,
      utilizationPercent: c2?.utilizationPercent
    });
    console.log('Grand Totals after sync:', summaryAfter.json.grandTotals);
  }
}

main().catch(console.error);
