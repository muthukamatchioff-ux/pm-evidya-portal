const { execSync } = require('child_process');

console.log(`Current VERCEL_ENV: ${process.env.VERCEL_ENV}`);

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview environment detected. Validating DATABASE_URL...');
  
  const dbUrl = process.env.DATABASE_URL;
  const isValidDbUrl = typeof dbUrl === 'string' && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));

  if (!isValidDbUrl) {
    console.warn('[Preview Notice] DATABASE_URL in Preview environment is missing or does not start with postgresql:// or postgres://.');
    console.warn('[Preview Notice] Skipping "prisma migrate deploy" to prevent Prisma Error P1012 in Preview build.');
    console.warn('[Preview Notice] To enable Preview migrations, configure a valid DATABASE_URL in Vercel Project Settings > Environment Variables for the Preview scope.');
  } else {
    try {
      console.log('Running prisma migrate deploy with Preview DATABASE_URL...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migration applied successfully in Preview.');
    } catch (error) {
      console.error('Migration failed in Preview due to connection issue. Continuing build...', error.message);
    }
  }
} else {
  console.log('Not a Preview environment. Skipping migration safely.');
}
