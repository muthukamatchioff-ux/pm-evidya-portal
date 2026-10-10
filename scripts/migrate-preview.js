const { execSync } = require('child_process');

console.log(`Current VERCEL_ENV: ${process.env.VERCEL_ENV}`);

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview environment detected. Checking DATABASE_URL...');
  
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.warn('DATABASE_URL is not a valid PostgreSQL URL or is missing in Preview. Skipping migration safely.');
  } else {
    try {
      console.log('Running prisma migrate deploy...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migration applied successfully.');
    } catch (error) {
      console.error('Migration failed.');
      process.exit(1);
    }
  }
} else {
  console.log('Not a Preview environment. Skipping migration safely.');
}
