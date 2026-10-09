const { execSync } = require('child_process');

console.log(`Current VERCEL_ENV: ${process.env.VERCEL_ENV}`);

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview environment detected, but automatic migrations are currently DISABLED by safety rule.');
  console.log('Skipping migration safely.');
} else {
  console.log('Not a Preview environment. Skipping migration safely.');
}
