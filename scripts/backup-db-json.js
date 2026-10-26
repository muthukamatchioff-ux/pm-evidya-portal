const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `db_backup_${timestamp}.json`);
  console.log(`Starting JSON database backup to ${backupFile}...`);

  const models = [
    'user',
    'sME',
    'sMEWorkEntry',
    'payment',
    'budgetHead',
    'expenditure',
    'humanResource',
    'hRSalary',
    'document',
    'auditLog',
    'language',
    'status',
    'trade',
    'project',
    'module',
    'topic',
    'productionRecord',
    'videoLibrary',
    'shootingSchedule',
    'videoEditorRecord',
    'animationRecord',
    'finalVideoRecord'
  ];

  const backupData = {};
  for (const m of models) {
    if (prisma[m] && typeof prisma[m].findMany === 'function') {
      try {
        backupData[m] = await prisma[m].findMany();
        console.log(`- ${m}: ${backupData[m].length} records`);
      } catch (err) {
        console.warn(`Could not backup model ${m}:`, err.message);
      }
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`Backup completed successfully to ${backupFile}!`);
}

main()
  .catch(e => {
    console.error('Backup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
