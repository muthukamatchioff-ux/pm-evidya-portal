import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPdfData() {
  // Clear old placeholder data
  await prisma.annexureI.deleteMany();
  await prisma.annexureII.deleteMany();

  // Get components
  const comp1 = await prisma.budgetComponent.findUnique({ where: { componentNo: 1 } });
  const comp2 = await prisma.budgetComponent.findUnique({ where: { componentNo: 2 } });

  if (!comp1 || !comp2) {
    console.error("Components not found");
    return;
  }

  console.log("Seeding Component 1 (CoA 70926) Data...");
  
  // CoA 70926 - S.No 1
  await prisma.annexureI.create({
    data: {
      budgetComponentId: comp1.id,
      datePeriod: "21 Jul 2026",
      expertName: "PRIYA.S (JOINT DIRECTOR)",
      designation: "-",
      activity: "-",
      workingDays: 0,
      honorarium: 1500,
      travelAllowance: 0,
      otherCharges: 0,
      totalExpenditure: 1500,
      utrNumber: "CN2/001491/26-27",
      contentDuration: "-",
      remarks: "payment towards Remuneration of the Subject matter expert engaged for Classroom Teaching Shoot for the PMe Vidya Channel of the trade Drone Technician for the Skill ecosystem from 14.07.2026 (Cheque No. 052872 dt 22/07/2026)"
    }
  });

  // CoA 70926 - S.No 2
  await prisma.annexureI.create({
    data: {
      budgetComponentId: comp1.id,
      datePeriod: "06 Aug 2026",
      expertName: "BABU.V",
      designation: "-",
      activity: "-",
      workingDays: 0,
      honorarium: 0,
      travelAllowance: 11337,
      otherCharges: 0,
      totalExpenditure: 11337,
      utrNumber: "CN2/001747/26-27",
      contentDuration: "-",
      remarks: "TA/DA 25.07.2026 TO 29.07.2026 ( Cheque No. 052875 dt 06/08/2026 )"
    }
  });

  console.log("Seeding Component 2 (CoA 70931) Data...");

  // CoA 70931 - S.No 1
  await prisma.annexureII.create({
    data: {
      budgetComponentId: comp2.id,
      datePeriod: "27 Jul 2026",
      trainingName: "-",
      trainingType: "-",
      participant: "PRIYA.S (JOINT DIRECTOR)",
      venue: "-",
      trainingDays: 0,
      trainerFee: 0,
      trainingCost: 0,
      travelAllowance: 29245,
      accommodation: 0,
      otherExpenses: 0,
      totalExpenditure: 29245,
      utrNumber: "CN2/001566/26-27",
      remarks: "TA/DA 13.07.2026 TO 15.07.2026 ( Cheque No. 052873 dt 27/07/2026 )"
    }
  });

  // CoA 70931 - S.No 2
  await prisma.annexureII.create({
    data: {
      budgetComponentId: comp2.id,
      datePeriod: "12 Aug 2026",
      trainingName: "-",
      trainingType: "-",
      participant: "RUCHI L KHATRI",
      venue: "-",
      trainingDays: 0,
      trainerFee: 0,
      trainingCost: 0,
      travelAllowance: 24638,
      accommodation: 0,
      otherExpenses: 0,
      totalExpenditure: 24638,
      utrNumber: "CN2/001802/26-27",
      remarks: "TA/DA 29.07.2026 TO 01.08.2026 ( Cheque No. 052879 dt 13/08/2026 )"
    }
  });

  console.log("Successfully seeded subset of data from PDF.");
}

seedPdfData()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
