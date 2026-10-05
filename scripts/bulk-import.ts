import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function parseCSVLine(line: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

async function bulkImport() {
  console.log("Starting bulk import...");
  
  // Clear old placeholder/sample data
  await prisma.annexureI.deleteMany();
  await prisma.annexureII.deleteMany();

  const comp1 = await prisma.budgetComponent.findUnique({ where: { componentNo: 1 } });
  const comp2 = await prisma.budgetComponent.findUnique({ where: { componentNo: 2 } });

  if (!comp1 || !comp2) throw new Error("Components not found");

  // Read Component 1 (CoA 70926)
  const csv1Path = path.join('C:', 'Users', 'NIMI', '.gemini', 'antigravity-ide', 'brain', '0a4aaa1e-f111-4c1b-9096-4fb61ce7f224', 'scratch', 'coa70926.csv');
  const csv1Data = fs.readFileSync(csv1Path, 'utf-8').split('\n');
  
  for (let i = 1; i < csv1Data.length; i++) {
    const line = csv1Data[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 9) continue;

    const utr = parts[2] || '-';
    const date = parts[3] || '';
    const name = parts[6] || '';
    const narration = parts[7] || '';
    const expenditure = parseInt(parts[8]) || 0;

    await prisma.annexureI.create({
      data: {
        budgetComponentId: comp1.id,
        datePeriod: date,
        expertName: name,
        designation: "-",
        activity: "-",
        workingDays: 0,
        honorarium: 0,
        travelAllowance: expenditure,
        otherCharges: 0,
        totalExpenditure: expenditure,
        utrNumber: utr,
        contentDuration: "-",
        remarks: narration
      }
    });
  }

  // Read Component 2 (CoA 70931)
  const csv2Path = path.join('C:', 'Users', 'NIMI', '.gemini', 'antigravity-ide', 'brain', '0a4aaa1e-f111-4c1b-9096-4fb61ce7f224', 'scratch', 'coa70931.csv');
  const csv2Data = fs.readFileSync(csv2Path, 'utf-8').split('\n');
  
  for (let i = 1; i < csv2Data.length; i++) {
    const line = csv2Data[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 9) continue;

    const utr = parts[2] || '-';
    const date = parts[3] || '';
    const name = parts[6] || '';
    const narration = parts[7] || '';
    const expenditure = parseInt(parts[8]) || 0;

    await prisma.annexureII.create({
      data: {
        budgetComponentId: comp2.id,
        datePeriod: date,
        trainingName: "-",
        trainingType: "-",
        participant: name,
        venue: "-",
        trainingDays: 0,
        trainerFee: 0,
        trainingCost: 0,
        travelAllowance: expenditure,
        accommodation: 0,
        otherExpenses: 0,
        totalExpenditure: expenditure,
        utrNumber: utr,
        remarks: narration
      }
    });
  }

  console.log("Bulk import complete!");
}

bulkImport()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
