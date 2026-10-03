'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getBudgetComponents() {
  const components = await prisma.budgetComponent.findMany({
    include: {
      annexureI: { orderBy: { createdAt: 'desc' } },
      annexureII: { orderBy: { createdAt: 'desc' } },
      annexureIII: { orderBy: { createdAt: 'desc' } },
      annexureIV: { orderBy: { createdAt: 'desc' } },
      annexureV: { orderBy: { createdAt: 'desc' } },
      annexureVI: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { componentNo: 'asc' },
  });

  // Calculate dynamic expenditures
  return components.map((comp: any) => {
    let expenditure = 0;
    comp.annexureI.forEach((a: any) => (expenditure += a.totalExpenditure));
    comp.annexureII.forEach((a: any) => (expenditure += a.totalExpenditure));
    comp.annexureIII.forEach((a: any) => (expenditure += a.totalExpenditure));
    comp.annexureIV.forEach((a: any) => (expenditure += a.totalExpenditure));
    comp.annexureV.forEach((a: any) => (expenditure += a.totalExpenditure));
    comp.annexureVI.forEach((a: any) => (expenditure += a.totalExpenditure));

    const unutilized = comp.approvedBudget - expenditure;
    const utilization = comp.approvedBudget > 0 ? (expenditure / comp.approvedBudget) * 100 : 0;

    return {
      ...comp,
      expenditureIncurred: expenditure,
      unutilizedBalance: unutilized,
      utilizationPercent: utilization.toFixed(2),
    };
  });
}

export async function getDashboardKPIs() {
  const components = await getBudgetComponents();
  
  let totalApproved = 0;
  let totalExpenditure = 0;
  let recordsCount = 0;

  components.forEach((comp: any) => {
    totalApproved += comp.approvedBudget;
    totalExpenditure += comp.expenditureIncurred;
    recordsCount += 
      comp.annexureI.length + 
      comp.annexureII.length + 
      comp.annexureIII.length + 
      comp.annexureIV.length + 
      comp.annexureV.length + 
      comp.annexureVI.length;
  });

  const totalUnutilized = totalApproved - totalExpenditure;
  const overallUtilization = totalApproved > 0 ? ((totalExpenditure / totalApproved) * 100).toFixed(2) : '0.00';

  return {
    totalApproved,
    totalExpenditure,
    totalUnutilized,
    overallUtilization,
    componentsCount: components.length,
    recordsCount
  };
}

export async function addAnnexureIEntry(data: any) {
  // Enforce calculation rule
  const total = (Number(data.honorarium) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.otherCharges) || 0);
  
  await prisma.annexureI.create({
    data: {
      ...data,
      totalExpenditure: total,
    }
  });
  revalidatePath('/dashboard');
  revalidatePath('/budget/master');
}

export async function getComponent1Data() {
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 1 },
    include: {
      annexureI: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!comp) return null;

  let expenditure = 0;
  comp.annexureI.forEach((a: any) => expenditure += a.totalExpenditure);

  return {
    ...comp,
    expenditureIncurred: expenditure,
    unutilizedBalance: comp.approvedBudget - expenditure,
    utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00',
  };
}

// --- Component 2 ---
export async function getComponent2Data() {
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 2 }, include: { annexureII: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureII.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureIIEntry(data: any) {
  const total = (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);
  await prisma.annexureII.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-2');
}

// --- Component 3 ---
export async function getComponent3Data() {
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 3 }, include: { annexureIII: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureIII.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureIIIEntry(data: any) {
  const total = (Number(data.remuneration) || 0) + (Number(data.taDa) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIII.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-3');
}

// --- Component 4 ---
export async function getComponent4Data() {
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 4 }, include: { annexureIV: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureIV.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureIVEntry(data: any) {
  const total = (Number(data.infrastructureCost) || 0) + (Number(data.bandwidthCost) || 0) + (Number(data.archiveCost) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIV.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-4');
}

// --- Component 5 ---
export async function getComponent5Data() {
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 5 }, include: { annexureV: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureV.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureVEntry(data: any) {
  const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureV.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-5');
}

// --- Component 6 ---
export async function getComponent6Data() {
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 6 }, include: { annexureVI: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureVI.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureVIEntry(data: any) {
  const total = (Number(data.amount) || 0) + (Number(data.tax) || 0);
  await prisma.annexureVI.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-6');
}


export async function updateAnnexureIEntry(id: string, data: any) {
  const total = (Number(data.honorarium) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureI.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-1');
}
export async function updateAnnexureIIEntry(id: string, data: any) {
  const total = (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);
  await prisma.annexureII.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-2');
}
export async function updateAnnexureIIIEntry(id: string, data: any) {
  const total = (Number(data.remuneration) || 0) + (Number(data.taDa) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIII.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-3');
}
export async function updateAnnexureIVEntry(id: string, data: any) {
  const total = (Number(data.infrastructureCost) || 0) + (Number(data.bandwidthCost) || 0) + (Number(data.archiveCost) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-4');
}
export async function updateAnnexureVEntry(id: string, data: any) {
  const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-5');
}
export async function updateAnnexureVIEntry(id: string, data: any) {
  const total = (Number(data.amount) || 0) + (Number(data.tax) || 0);
  await prisma.annexureVI.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-6');
}

// Legacy exports to satisfy BudgetClient.tsx compiler errors
export async function createBudgetHead(data: any) {
  console.warn("createBudgetHead is deprecated. Use Annexure entry forms.");
  return null;
}

export async function updateBudgetHead(id: string, data: any) {
  console.warn("updateBudgetHead is deprecated. Use Annexure entry forms.");
  return null;
}

export async function updateComponentBudget(id: string, approvedBudget: number) {
  await prisma.budgetComponent.update({
    where: { id },
    data: { approvedBudget }
  });
  revalidatePath('/budget');
  revalidatePath('/dashboard');
  return { success: true };
}
