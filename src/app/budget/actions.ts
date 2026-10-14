'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function getBudgetComponents() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  try {
    const components = await prisma.budgetComponent.findMany({
      include: {
        annexureI: { orderBy: { createdAt: 'asc' } },
        annexureII: { orderBy: { createdAt: 'asc' } },
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
      if (comp.componentNo === 1) comp.annexureI.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 2) comp.annexureII.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 3) comp.annexureIII.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 4) comp.annexureIV.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 5) comp.annexureV.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 6) comp.annexureVI.forEach((a: any) => (expenditure += a.totalExpenditure));

      const unutilized = comp.approvedBudget - expenditure;
      const utilization = comp.approvedBudget > 0 ? (expenditure / comp.approvedBudget) * 100 : 0;

      return {
        ...comp,
        expenditureIncurred: expenditure,
        unutilizedBalance: unutilized,
        utilizationPercent: utilization.toFixed(2),
      };
    });
  } catch (error) {
    console.error('Failed to fetch budget components due to database connection error', error);
    return []; // Return empty array on DB failure to prevent Dashboard crash
  }
}

export async function getDashboardKPIs(existingComponents?: any[]) {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const components = existingComponents || await getBudgetComponents();
  
  let totalApproved = 0;
  let totalExpenditure = 0;
  let recordsCount = 0;

  components.forEach((comp: any) => {
    totalApproved += comp.approvedBudget;
    totalExpenditure += comp.expenditureIncurred;
    if (comp.componentNo === 1) recordsCount += comp.annexureI.length;
    if (comp.componentNo === 2) recordsCount += comp.annexureII.length;
    if (comp.componentNo === 3) recordsCount += comp.annexureIII.length;
    if (comp.componentNo === 4) recordsCount += comp.annexureIV.length;
    if (comp.componentNo === 5) recordsCount += comp.annexureV.length;
    if (comp.componentNo === 6) recordsCount += comp.annexureVI.length;
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
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  // Enforce calculation rule: Total Amount (₹) = Honorarium Amount (₹) + TA Amount (₹)
  const honorarium = Number(data.honorarium) || 0;
  const travelAllowance = Number(data.travelAllowance) || 0;
  const total = honorarium + travelAllowance;
  
  try {
    const entry = await prisma.annexureI.create({
      data: {
        budgetComponentId: data.budgetComponentId,
        datePeriod: data.datePeriod || '',
        expertName: data.expertName || '',
        designation: data.designation || '',
        activity: data.activity || 'Digital Content Development',
        workingDays: Number(data.workingDays) || 0,
        honorarium,
        travelAllowance,
        otherCharges: Number(data.otherCharges) || 0,
        totalExpenditure: total,
        utrNumber: data.utrNumber || '',
        remarks: data.remarks || '',
        tranType: data.tranType || '',
        voucherNo: data.voucherNo || '',
        narration: data.narration || '',
        contentDuration: data.contentDuration || '',
        verificationStatus: 'DRAFT',
      }
    });
    revalidatePath('/dashboard');
    revalidatePath('/budget/annexure-1');
    return { success: true, data: entry };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add entry' };
  }
}

export async function updateAnnexureIEntry(id: string, data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  const honorarium = Number(data.honorarium) || 0;
  const travelAllowance = Number(data.travelAllowance) || 0;
  const total = honorarium + travelAllowance;

  try {
    const updateData: any = {
      honorarium,
      travelAllowance,
      totalExpenditure: total,
    };
    if (data.datePeriod !== undefined) updateData.datePeriod = data.datePeriod || '';
    if (data.expertName !== undefined) updateData.expertName = data.expertName || '';
    if (data.designation !== undefined) updateData.designation = data.designation || '';
    if (data.activity !== undefined) updateData.activity = data.activity || 'Digital Content Development';
    if (data.workingDays !== undefined) updateData.workingDays = Number(data.workingDays) || 0;
    if (data.otherCharges !== undefined) updateData.otherCharges = Number(data.otherCharges) || 0;
    if (data.utrNumber !== undefined) updateData.utrNumber = data.utrNumber || '';
    if (data.remarks !== undefined) updateData.remarks = data.remarks || '';
    if (data.tranType !== undefined) updateData.tranType = data.tranType || '';
    if (data.voucherNo !== undefined) updateData.voucherNo = data.voucherNo || '';
    if (data.narration !== undefined) updateData.narration = data.narration || '';
    if (data.contentDuration !== undefined) updateData.contentDuration = data.contentDuration || '';

    const entry = await prisma.annexureI.update({
      where: { id },
      data: updateData
    });
    revalidatePath('/dashboard');
    revalidatePath('/budget/annexure-1');
    return { success: true, data: entry };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update entry' };
  }
}

export async function getComponent1Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER']);
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 1 },
    include: {
      annexureI: {
        orderBy: { createdAt: 'asc' }
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
  await requireAuth(['ADMIN', 'TEAM_MEMBER']);
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 2 }, include: { annexureII: { orderBy: { createdAt: 'asc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureII.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureIIEntry(data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);
  
  const createData: any = {
    budgetComponentId: data.budgetComponentId,
    datePeriod: data.datePeriod || '',
    trainingName: data.trainingName || '',
    trainingType: data.trainingType || '',
    participant: data.participant || '',
    venue: data.venue || '',
    trainingDays: Number(data.trainingDays) || 0,
    noOfParticipants: Number(data.noOfParticipants) || 0,
    trainerFee: Number(data.trainerFee) || 0,
    trainingCost: Number(data.trainingCost) || 0,
    travelAllowance: Number(data.travelAllowance) || 0,
    accommodation: Number(data.accommodation) || 0,
    otherExpenses: Number(data.otherExpenses) || 0,
    totalExpenditure: total,
    utrNumber: data.utrNumber || '',
    remarks: data.remarks || '',
    trainingDates: data.trainingDates || '',
  };

  await prisma.annexureII.create({ data: createData });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-2');
}

// --- Component 3 ---
export async function getComponent3Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER']);
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 3 }, include: { annexureIII: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureIII.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureIIIEntry(data: any) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;

    const months = Number(data.workPeriod) || 1;
    const remuneration = Number(data.remuneration) || 0;
    const taDa = Number(data.taDa) || 0;
    const otherCharges = Number(data.otherCharges) || 0;
    const total = (remuneration * months) + taDa + otherCharges;

    const createData = {
      budgetComponentId: data.budgetComponentId,
      datePeriod: String(data.datePeriod || ''),
      personnelName: String(data.personnelName || ''),
      designation: String(data.designation || ''),
      supportType: String(data.supportType || ''),
      department: String(data.department || ''),
      workPeriod: String(data.workPeriod || '1'),
      remuneration,
      taDa,
      otherCharges,
      totalExpenditure: total,
      utrNumber: data.utrNumber ? String(data.utrNumber) : null,
      remarks: data.remarks ? String(data.remarks) : null,
      verificationStatus: 'DRAFT',
    };

    const entry = await prisma.annexureIII.create({ data: createData });

    const userEmail = await getEmail();
    await logAudit({
      action: 'ADD_ANNEXURE_III_ENTRY',
      entity: 'AnnexureIII',
      entityId: entry.id,
      newData: `Added HR Support Entry for ${createData.personnelName} (${createData.designation}) - ₹${total}`,
      userEmail
    });

    revalidatePath('/dashboard');
    revalidatePath('/budget/annexure-3');
    return { success: true, data: entry };
  } catch (error: any) {
    console.error('Failed to add Annexure-III entry:', error);
    return { success: false, error: error.message || 'Failed to save entry' };
  }
}

// --- Component 4 ---
export async function getComponent4Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER']);
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 4 }, include: { annexureIV: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureIV.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureIVEntry(data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.infrastructureCost) || 0) + (Number(data.bandwidthCost) || 0) + (Number(data.archiveCost) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIV.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-4');
}

// --- Component 5 ---
export async function getComponent5Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER']);
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 5 }, include: { annexureV: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureV.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureVEntry(data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureV.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-5');
}

// --- Component 6 ---
export async function getComponent6Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER']);
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 6 }, include: { annexureVI: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureVI.forEach((a: any) => expenditure += a.totalExpenditure);
  return { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
}
export async function addAnnexureVIEntry(data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.amount) || 0) + (Number(data.tax) || 0);
  await prisma.annexureVI.create({ data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-6');
}

export async function updateAnnexureIIEntry(id: string, data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);
  
  const updateData: any = {
    datePeriod: data.datePeriod,
    trainingName: data.trainingName,
    trainingType: data.trainingType,
    participant: data.participant,
    venue: data.venue,
    trainingDays: Number(data.trainingDays) || 0,
    noOfParticipants: Number(data.noOfParticipants) || 0,
    trainerFee: Number(data.trainerFee) || 0,
    trainingCost: Number(data.trainingCost) || 0,
    travelAllowance: Number(data.travelAllowance) || 0,
    accommodation: Number(data.accommodation) || 0,
    otherExpenses: Number(data.otherExpenses) || 0,
    totalExpenditure: total,
    utrNumber: data.utrNumber,
    remarks: data.remarks,
    trainingDates: data.trainingDates,
  };

  // Remove undefined fields so they aren't written as null if not sent
  Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

  await prisma.annexureII.update({ where: { id }, data: updateData });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-2');
}
export async function updateAnnexureIIIEntry(id: string, data: any) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;

    const months = Number(data.workPeriod) || 1;
    const remuneration = Number(data.remuneration) || 0;
    const taDa = Number(data.taDa) || 0;
    const otherCharges = Number(data.otherCharges) || 0;
    const total = (remuneration * months) + taDa + otherCharges;

    const updateData: any = {
      datePeriod: String(data.datePeriod || ''),
      personnelName: String(data.personnelName || ''),
      designation: String(data.designation || ''),
      supportType: String(data.supportType || ''),
      department: String(data.department || ''),
      workPeriod: String(data.workPeriod || '1'),
      remuneration,
      taDa,
      otherCharges,
      totalExpenditure: total,
      utrNumber: data.utrNumber ? String(data.utrNumber) : null,
      remarks: data.remarks ? String(data.remarks) : null,
    };

    const entry = await prisma.annexureIII.update({ where: { id }, data: updateData });

    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_ANNEXURE_III_ENTRY',
      entity: 'AnnexureIII',
      entityId: id,
      newData: `Updated HR Support Entry for ${updateData.personnelName} (${updateData.designation}) - ₹${total}`,
      userEmail
    });

    revalidatePath('/dashboard');
    revalidatePath('/budget/annexure-3');
    return { success: true, data: entry };
  } catch (error: any) {
    console.error('Failed to update Annexure-III entry:', error);
    return { success: false, error: error.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureIIIEntry(id: string) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;

    const existing = await prisma.annexureIII.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Entry not found' };
    }

    await prisma.annexureIII.delete({ where: { id } });

    const userEmail = await getEmail();
    await logAudit({
      action: 'DELETE_ANNEXURE_III_ENTRY',
      entity: 'AnnexureIII',
      entityId: id,
      newData: `Deleted HR Support Entry for ${existing.personnelName} (${existing.designation})`,
      userEmail
    });

    revalidatePath('/dashboard');
    revalidatePath('/budget/annexure-3');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete Annexure-III entry:', error);
    return { success: false, error: error.message || 'Failed to delete entry' };
  }
}
export async function updateAnnexureIVEntry(id: string, data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.infrastructureCost) || 0) + (Number(data.bandwidthCost) || 0) + (Number(data.archiveCost) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-4');
}
export async function updateAnnexureVEntry(id: string, data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-5');
}
export async function updateAnnexureVIEntry(id: string, data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
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
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  await prisma.budgetComponent.update({
    where: { id },
    data: { approvedBudget }
  });
  revalidatePath('/budget');
  revalidatePath('/dashboard');
  return { success: true };
}
