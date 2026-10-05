import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Budget Components...');

  // Component 1
  const comp1 = await prisma.budgetComponent.upsert({
    where: { componentNo: 1 },
    update: { name: 'Digital Content Development & Production', approvedBudget: 10000000 },
    create: { componentNo: 1, name: 'Digital Content Development & Production', approvedBudget: 10000000 },
  });

  // Component 2
  const comp2 = await prisma.budgetComponent.upsert({
    where: { componentNo: 2 },
    update: { name: 'Capacity Building & Training', approvedBudget: 1000000 },
    create: { componentNo: 2, name: 'Capacity Building & Training', approvedBudget: 1000000 },
  });

  // Component 3
  const comp3 = await prisma.budgetComponent.upsert({
    where: { componentNo: 3 },
    update: { name: 'Human Resource & Technical Support', approvedBudget: 7044000 },
    create: { componentNo: 3, name: 'Human Resource & Technical Support', approvedBudget: 7044000 },
  });

  // Component 4
  const comp4 = await prisma.budgetComponent.upsert({
    where: { componentNo: 4 },
    update: { name: 'Digital Infrastructure, Archive & Network Services', approvedBudget: 499520 },
    create: { componentNo: 4, name: 'Digital Infrastructure, Archive & Network Services', approvedBudget: 499520 },
  });

  // Component 5
  const comp5 = await prisma.budgetComponent.upsert({
    where: { componentNo: 5 },
    update: { name: 'School Telecast & Distribution Infrastructure', approvedBudget: 395000 },
    create: { componentNo: 5, name: 'School Telecast & Distribution Infrastructure', approvedBudget: 395000 },
  });

  // Component 6
  const comp6 = await prisma.budgetComponent.upsert({
    where: { componentNo: 6 },
    update: { name: 'Outreach, Feedback, Research & Advocacy', approvedBudget: 500000 },
    create: { componentNo: 6, name: 'Outreach, Feedback, Research & Advocacy', approvedBudget: 500000 },
  });

  console.log('Seeding initial Annexure data...');

  // Annexure I initial baseline
  const existingAnn1 = await prisma.annexureI.findFirst({ where: { budgetComponentId: comp1.id }});
  if (!existingAnn1) {
    await prisma.annexureI.create({
      data: {
        budgetComponentId: comp1.id,
        datePeriod: 'Initial Migration',
        expertName: 'Migrated Expert',
        designation: 'Various',
        activity: 'Video Content Development',
        workingDays: 0,
        honorarium: 119518,
        totalExpenditure: 119518,
        verificationStatus: 'RECONCILED'
      }
    });
  }

  // Annexure II initial baseline
  const existingAnn2 = await prisma.annexureII.findFirst({ where: { budgetComponentId: comp2.id }});
  if (!existingAnn2) {
    await prisma.annexureII.create({
      data: {
        budgetComponentId: comp2.id,
        datePeriod: 'Initial Migration',
        trainingName: 'Capacity Building Migration',
        trainingType: 'Training',
        participant: 'Various',
        venue: 'Various',
        trainingDays: 0,
        trainingCost: 300000,
        totalExpenditure: 300000,
        verificationStatus: 'RECONCILED'
      }
    });
  }

  // Annexure VI initial baseline
  const existingAnn6 = await prisma.annexureVI.findFirst({ where: { budgetComponentId: comp6.id }});
  if (!existingAnn6) {
    await prisma.annexureVI.create({
      data: {
        budgetComponentId: comp6.id,
        platform: 'Meta Ads, Google Ads',
        campaignDesc: 'PM eVidya Awareness Campaign',
        datePeriod: 'Initial Migration',
        serviceProvider: 'Various Agencies',
        campaignType: 'Awareness',
        amount: 60000,
        totalExpenditure: 60000,
        verificationStatus: 'RECONCILED'
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
