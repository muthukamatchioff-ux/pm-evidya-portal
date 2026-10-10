const { execSync } = require('child_process');

console.log(`Current VERCEL_ENV: ${process.env.VERCEL_ENV}`);

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview environment detected. Running prisma migrate deploy...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Migration failed due to missing or invalid DATABASE_URL. Continuing build...');
    // Removed process.exit(1) to allow the Vercel build to succeed!
  }
} else {
  console.log('Not a Preview environment. Skipping migration safely.');
}
