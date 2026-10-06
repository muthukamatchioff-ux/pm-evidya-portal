const { execSync } = require('child_process');

console.log(`Current VERCEL_ENV: ${process.env.VERCEL_ENV}`);

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview environment detected. Running ONE-TIME baseline resolve...');
  try {
    execSync('npx prisma migrate resolve --applied 20261005100700_init', { stdio: 'inherit' });
    console.log('Baseline resolved successfully.');
  } catch (error) {
    console.error('Baseline resolution failed.');
    process.exit(1);
  }
} else {
  console.log('Not a Preview environment. Skipping migration safely.');
}
