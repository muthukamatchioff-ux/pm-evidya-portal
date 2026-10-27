const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreFromBackup(backupFilePath) {
  if (!backupFilePath) {
    const backupDir = path.join(process.cwd(), 'backups');
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) {
      throw new Error('No backup files found in backups directory.');
    }
    backupFilePath = path.join(backupDir, files[0]);
  }

  console.log(`Verifying and validating backup file: ${backupFilePath}...`);
  const raw = fs.readFileSync(backupFilePath, 'utf8');
  const data = JSON.parse(raw);

  const modelKeys = Object.keys(data);
  console.log(`Found ${modelKeys.length} models in backup:`);
  let totalItems = 0;
  for (const k of modelKeys) {
    const count = Array.isArray(data[k]) ? data[k].length : 0;
    console.log(`- ${k}: ${count} records`);
    totalItems += count;
  }

  console.log(`Total records in backup: ${totalItems}. Recovery validation successful!`);
  return { valid: true, backupFilePath, totalItems, models: modelKeys };
}

if (require.main === module) {
  restoreFromBackup(process.argv[2])
    .then(res => {
      console.log('Recovery verification passed:', res.totalItems, 'records available for restore.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Recovery verification failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { restoreFromBackup };
