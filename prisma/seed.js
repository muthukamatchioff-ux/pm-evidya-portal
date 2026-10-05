const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial master data...");

  // 1. Languages
  const langEng = await prisma.language.upsert({ where: { name: 'English' }, update: {}, create: { name: 'English' }});
  const langHin = await prisma.language.upsert({ where: { name: 'Hindi' }, update: {}, create: { name: 'Hindi' }});

  // 2. Statuses
  const statusDraft = await prisma.status.upsert({ where: { name: 'Draft' }, update: {}, create: { name: 'Draft' }});
  const statusActive = await prisma.status.upsert({ where: { name: 'In Progress' }, update: {}, create: { name: 'In Progress' }});
  const statusCompleted = await prisma.status.upsert({ where: { name: 'Completed' }, update: {}, create: { name: 'Completed' }});

  // 2.5 Financial Heads
  const heads = [
    '1. VIDEO CONTENT DEVELOPMENT',
    '2. CAPACITY BUILDING',
    '3. HUMAN RESOURCE SUPPORT',
    '4. ARCHIVE / BANDWIDTH / NETWORKING',
    '5. TELECAST SETUP IN SCHOOLS',
    '6. FEEDBACK / RESEARCH / ADVOCACY',
    '7. STUDIO SETUP / UPGRADATION'
  ];
  for (const h of heads) {
    await prisma.budgetHead.upsert({ where: { name: h }, update: {}, create: { name: h, approvedBudget: 5000000, utilizedAmount: 0 }});
  }

  // 3. Trades
  const tradeAI = await prisma.trade.upsert({ where: { name: 'AI Programming Assistant' }, update: {}, create: { name: 'AI Programming Assistant' }});
  const tradeDrone = await prisma.trade.upsert({ where: { name: 'Drone Technician' }, update: {}, create: { name: 'Drone Technician' }});
  const tradeFitter = await prisma.trade.upsert({ where: { name: 'Fitter' }, update: {}, create: { name: 'Fitter' }});

  // 4. Projects
  const project1 = await prisma.project.upsert({
    where: { projectCode: 'PM-EVIDYA-001' },
    update: {},
    create: {
      projectCode: 'PM-EVIDYA-001',
      title: 'Classroom Teaching Videos - AI Programming',
      tradeId: tradeAI.id,
      languageId: langEng.id,
      statusId: statusActive.id,
      startDate: new Date('2026-09-01'),
    }
  });

  const project2 = await prisma.project.upsert({
    where: { projectCode: 'PM-EVIDYA-002' },
    update: {},
    create: {
      projectCode: 'PM-EVIDYA-002',
      title: 'Drone Technician Interactive Content',
      tradeId: tradeDrone.id,
      languageId: langHin.id,
      statusId: statusCompleted.id,
      startDate: new Date('2026-05-10'),
      completionDate: new Date('2026-08-15'),
    }
  });

  // 5. SMEs
  const sme1 = await prisma.sME.create({
    data: {
      name: 'Dr. Majji Bala Ganesh Reddy',
      designation: 'Principal',
      institute: 'Shri Raja Rajeswari ITI, Kakinada',
      status: 'ACTIVE',
      workEntries: {
        create: [
          {
            trade: 'AI Programming Assistant & Drone Technician',
            topic: 'Machine Learning Basics',
            attendanceFrom: new Date('2026-09-10'),
            attendanceTo: new Date('2026-09-17'),
            days: 7,
            ratePerDay: 1500,
            status: 'PENDING',
            payments: {
              create: {
                grossAmount: 10500,
                totalAmount: 10500,
                status: 'PENDING_APPROVAL'
              }
            }
          }
        ]
      }
    }
  });

  console.log("Successfully seeded old/master data!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
