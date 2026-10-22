const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const line = envContent.split('\n').find(l => l.startsWith('ADMIN_PASSWORD_HASH='));
  let hash = null;
  if (line) {
    hash = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  }

  console.log('Seeding / restoring required portal users...');

  // 1. Primary Admin: Administrator
  await prisma.user.upsert({
    where: { email: 'muthukamatchi.off@gmail.com' },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'Admin',
      name: 'Administrator'
    },
    create: {
      email: 'muthukamatchi.off@gmail.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'Admin',
      name: 'Administrator',
      password: hash
    }
  });

  // 2. Admin: Harshitha Raman
  await prisma.user.upsert({
    where: { email: 'harshitharaman.nimi@gmail.com' },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'Administrator',
      name: 'Harshitha Raman'
    },
    create: {
      email: 'harshitharaman.nimi@gmail.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'Administrator',
      name: 'Harshitha Raman',
      password: hash,
      createdBy: 'System Admin'
    }
  });

  // 3. Camera Man: Antony Alcander
  await prisma.user.upsert({
    where: { email: 'antony.alcander@gmail.com' },
    update: {
      role: 'CAMERAMAN',
      status: 'ACTIVE',
      designation: 'Camera Operator',
      name: 'Antony Alcander',
      department: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    },
    create: {
      email: 'antony.alcander@gmail.com',
      role: 'CAMERAMAN',
      status: 'ACTIVE',
      designation: 'Camera Operator',
      name: 'Antony Alcander',
      department: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
      password: hash,
      createdBy: 'System Admin'
    }
  });

  // 4. Higher Official Viewer: Ashfaq
  await prisma.user.upsert({
    where: { email: 'ashfaq.nimi@gmail.com' },
    update: {
      role: 'HIGHER_OFFICIAL_VIEWER',
      status: 'ACTIVE',
      designation: 'Higher Official Viewer',
      department: 'Review Authority',
      name: 'Ashfaq'
    },
    create: {
      email: 'ashfaq.nimi@gmail.com',
      role: 'HIGHER_OFFICIAL_VIEWER',
      status: 'ACTIVE',
      designation: 'Higher Official Viewer',
      department: 'Review Authority',
      name: 'Ashfaq',
      password: hash,
      createdBy: 'System Admin'
    }
  });

  // 5. Higher Official Viewer: Rajeswari M
  await prisma.user.upsert({
    where: { email: 'rajeswari.m41@gov.in' },
    update: {
      role: 'HIGHER_OFFICIAL_VIEWER',
      status: 'ACTIVE',
      designation: 'Higher Official Viewer',
      department: 'Review Authority',
      name: 'Rajeswari M'
    },
    create: {
      email: 'rajeswari.m41@gov.in',
      role: 'HIGHER_OFFICIAL_VIEWER',
      status: 'ACTIVE',
      designation: 'Higher Official Viewer',
      department: 'Review Authority',
      name: 'Rajeswari M',
      password: hash,
      createdBy: 'System Admin'
    }
  });

  console.log('Successfully restored users!');
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      designation: true,
      department: true
    }
  });
  console.log('Current Portal Users in Database:', JSON.stringify(allUsers, null, 2));
}

main()
  .catch(e => {
    console.error('Error seeding users:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
