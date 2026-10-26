const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = "$2b$12$5YWrRpEsXi87uO/N6FccFuFEAmEyuNz6zu/UliFwepyjJtw4Luigu";

  // 1. Cameraman Antony Alcander (ensure ACTIVE and assigned epics)
  const cameraman = await prisma.user.upsert({
    where: { email: 'antony.alcander@gmail.com' },
    update: {
      role: 'CAMERAMAN',
      status: 'ACTIVE',
      name: 'Antony Alcander',
      designation: 'Camera Operator',
      department: '[1,2,3,4,5,6,7,8,9,10,11]'
    },
    create: {
      email: 'antony.alcander@gmail.com',
      name: 'Antony Alcander',
      role: 'CAMERAMAN',
      status: 'ACTIVE',
      designation: 'Camera Operator',
      department: '[1,2,3,4,5,6,7,8,9,10,11]',
      password: passwordHash,
      createdBy: 'System Provisioning'
    }
  });
  console.log('Cameraman user ready:', cameraman.email, cameraman.role);

  // 2. Video Editor Hassan & Antony (ensure exists and ACTIVE)
  const editor = await prisma.user.upsert({
    where: { email: 'hassan.antony@nimi.org' },
    update: {
      role: 'EDITOR',
      status: 'ACTIVE',
      name: 'Hassan & Antony',
      designation: 'Senior Video Editor',
      department: '[1,2,3,4,5,6,7,8,9,10,11]',
      password: passwordHash
    },
    create: {
      email: 'hassan.antony@nimi.org',
      name: 'Hassan & Antony',
      role: 'EDITOR',
      status: 'ACTIVE',
      designation: 'Senior Video Editor',
      department: '[1,2,3,4,5,6,7,8,9,10,11]',
      password: passwordHash,
      createdBy: 'System Provisioning'
    }
  });
  console.log('Video Editor user ready:', editor.email, editor.role);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
