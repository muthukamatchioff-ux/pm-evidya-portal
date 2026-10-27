const fs = require('fs');

['.env', '.env.local', '.env.production', '.env.vercel.prod', '.env.preview'].forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    const dbLine = lines.find(l => l.startsWith('DATABASE_URL='));
    if (dbLine) {
      const url = dbLine.split('=')[1]?.trim() || '';
      const atSplit = url.split('@');
      const host = atSplit[1] ? atSplit[1].split('/')[0] : 'unknown';
      const db = url.split('/').pop()?.split('?')[0] || 'unknown';
      console.log(f, '-> Host:', host, 'DB:', db);
    } else {
      console.log(f, '-> No DATABASE_URL line');
    }
  } else {
    console.log(f, '-> Not found');
  }
});
