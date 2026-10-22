const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const HIGHER_OFFICIAL_ACCOUNTS = [
  {
    email: 'ashfaq.nimi@gmail.com',
    name: 'Ashfaq',
    designation: 'Higher Official Viewer',
    department: 'Review Authority',
    role: 'HIGHER_OFFICIAL_VIEWER'
  },
  {
    email: 'rajeswari.m41@gov.in',
    name: 'Rajeswari M',
    designation: 'Higher Official Viewer',
    department: 'Review Authority',
    role: 'HIGHER_OFFICIAL_VIEWER'
  }
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('[SENSITIVE]')) {
    console.log('[Sync DB Script] Skipping direct DB sync during build: no live database connected.');
    return;
  }

  console.log('[Sync DB Script] Checking database synchronization for Annexure I & II and official accounts...');
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    const rawPass = process.env.HIGHER_OFFICIAL_PASSWORD || 'Nimi@2026';
    const hashedPassword = await bcrypt.hash(rawPass, 10);

    for (const acc of HIGHER_OFFICIAL_ACCOUNTS) {
      await prisma.user.upsert({
        where: { email: acc.email.toLowerCase().trim() },
        update: {
          role: acc.role,
          status: 'ACTIVE',
          designation: acc.designation,
          department: acc.department
        },
        create: {
          email: acc.email.toLowerCase().trim(),
          name: acc.name,
          role: acc.role,
          status: 'ACTIVE',
          designation: acc.designation,
          department: acc.department,
          password: hashedPassword,
          createdBy: 'System Build Sync'
        }
      });
      console.log(`[Sync DB Script] Verified official account: ${acc.email}`);
    }

    const comp1 = await prisma.budgetComponent.findUnique({
      where: { componentNo: 1 },
      include: { annexureI: true }
    });

    const comp2 = await prisma.budgetComponent.findUnique({
      where: { componentNo: 2 },
      include: { annexureII: true }
    });

    if (!comp1 || !comp2) {
      console.log('[Sync DB Script] Budget components 1 or 2 do not exist in DB yet.');
      return;
    }

    // Check if fallbackData can be read
    const fallbackPath = path.join(__dirname, '../src/lib/fallbackData.ts');
    // Using simple regex or ts-node if needed, but since Next.js server actions handle runtime self-healing,
    // this build script just logs status or runs if possible.
    console.log(`[Sync DB Script] Connected. DB Comp 1 rows: ${comp1.annexureI.length}, Comp 2 rows: ${comp2.annexureII.length}`);
  } catch (err) {
    console.warn('[Sync DB Script] Notice: Sync check skipped safely during build:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
