const https = require('https');

async function measure(path) {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.get('https://pmevidyanimi.online' + path, (res) => {
      let ttfb = Date.now() - start;
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const total = Date.now() - start;
        resolve({
          path,
          status: res.statusCode,
          ttfb,
          total,
          size: data.length,
          cache: res.headers['x-vercel-cache'] || res.headers['cache-control'] || 'none'
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, error: err.message, total: Date.now() - start });
    });
    req.setTimeout(30000, () => {
      req.destroy();
      resolve({ path, error: 'TIMEOUT > 30s', total: Date.now() - start });
    });
  });
}

async function run() {
  console.log('Testing live endpoint latency on https://pmevidyanimi.online...\n');
  const paths = [
    '/login',
    '/api/sync-annexures?summary=true',
    '/api/sync-tracker',
  ];
  for (const p of paths) {
    const res = await measure(p);
    console.log(`[${res.status || 'ERR'}] ${res.path.padEnd(35)} -> TTFB: ${res.ttfb || 0}ms, Total: ${res.total}ms, Size: ${res.size || 0}b, Cache: ${res.cache}`);
  }
}

run();
