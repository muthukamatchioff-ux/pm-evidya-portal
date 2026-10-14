const { execSync } = require('child_process');

console.log(`Current VERCEL_ENV: ${process.env.VERCEL_ENV}`);

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview environment detected. Validating database configuration...');
  
  // Check candidate database environment variables for a valid PostgreSQL URL
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL
  ];
  
  const validDbUrl = candidates.find(u => 
    typeof u === 'string' && (u.startsWith('postgresql://') || u.startsWith('postgres://'))
  );

  if (!validDbUrl) {
    console.warn('[Preview Notice] DATABASE_URL in Preview environment is missing or does not start with postgresql:// or postgres://.');
    console.warn('[Preview Notice] Skipping "prisma migrate deploy" to prevent Prisma Error P1012 in Preview build.');
    console.warn('[Preview Notice] To enable Preview migrations, configure DATABASE_URL in Vercel Project Settings > Environment Variables for the Preview scope.');
  } else {
    // Ensure DATABASE_URL is set to the valid connection string for Prisma CLI
    process.env.DATABASE_URL = validDbUrl;
    try {
      console.log('Running prisma migrate deploy with verified database connection...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migration applied successfully in Preview.');
    } catch (error) {
      console.error('Migration failed in Preview due to connection issue. Continuing build...', error.message);
    }
  }
} else {
  console.log('Not a Preview environment. Skipping migration safely.');
}
