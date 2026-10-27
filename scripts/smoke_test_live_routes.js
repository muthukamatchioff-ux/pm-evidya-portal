const https = require('https');

async function testLiveRoutes() {
  const routes = [
    { path: '/', expected: 307 },
    { path: '/login', expected: 200 },
    { path: '/video-production', expected: 200 },
    { path: '/dashboard', expected: 307 },
    { path: '/reports', expected: 307 },
    { path: '/documents', expected: 307 },
    { path: '/budget', expected: 307 },
    { path: '/smes', expected: 307 },
    { path: '/settings', expected: 307 }
  ];

  console.log('========================================================================');
  console.log('LIVE PRODUCTION ROUTE SMOKE TESTS — https://pm-evidya-portal.vercel.app');
  console.log('========================================================================');

  let passed = 0;
  for (const r of routes) {
    const res = await fetch('https://pm-evidya-portal.vercel.app' + r.path, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const isExpected = res.status === r.expected;
    if (isExpected) passed++;
    console.log(`  [${isExpected ? 'PASS' : 'FAIL'}] ${r.path} -> Status: ${res.status} ${loc ? '(Redirects to: ' + loc + ')' : ''}`);
  }

  console.log('========================================================================');
  console.log(`RESULT: ${passed} of ${routes.length} routes verified successfully.`);
  console.log('========================================================================');
}

testLiveRoutes().catch(console.error);
