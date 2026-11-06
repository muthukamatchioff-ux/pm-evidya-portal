'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { COMPONENT_4_COA_MASTER } from '@/lib/coaMaster';
// High-performance in-memory cache with instant invalidation on mutations
interface BudgetCacheEntry {
  data: any;
  expiry: number;
}
const budgetCache = new Map<string, BudgetCacheEntry>();
const BUDGET_CACHE_TTL = 60 * 1000; // 60 seconds TTL

export async function clearBudgetCache() {
  budgetCache.clear();
}


export async function getBudgetComponents(options?: { summaryOnly?: boolean }) {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const isSummary = options?.summaryOnly ?? false;
  const cacheKey = isSummary ? 'budget_summary' : 'budget_full';
  const cached = budgetCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  try {
    const components = await prisma.budgetComponent.findMany({
      include: isSummary ? {
        annexureI: { select: { id: true, totalExpenditure: true } },
        annexureII: { select: { id: true, totalExpenditure: true } },
        annexureIII: { select: { id: true, totalExpenditure: true } },
        annexureIV: { select: { id: true, totalExpenditure: true } },
        annexureV: { select: { id: true, totalExpenditure: true } },
        annexureVI: { select: { id: true, totalExpenditure: true } },
      } : {
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
    const calculatedResult = components.map((comp: any) => {
      let expenditure = 0;
      if (comp.componentNo === 1) comp.annexureI?.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 2) comp.annexureII?.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 3) comp.annexureIII?.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 4) comp.annexureIV?.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 5) comp.annexureV?.forEach((a: any) => (expenditure += a.totalExpenditure));
      if (comp.componentNo === 6) comp.annexureVI?.forEach((a: any) => (expenditure += a.totalExpenditure));

      const unutilized = comp.approvedBudget - expenditure;
      const utilization = comp.approvedBudget > 0 ? (expenditure / comp.approvedBudget) * 100 : 0;

      return {
        ...comp,
        expenditureIncurred: expenditure,
        unutilizedBalance: unutilized,
        utilizationPercent: utilization.toFixed(2),
      };
    });
    budgetCache.set(cacheKey, { data: calculatedResult, expiry: Date.now() + BUDGET_CACHE_TTL });
    return calculatedResult;
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
  clearBudgetCache();
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
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-1', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add entry' };
  }
}

export async function updateAnnexureIEntry(id: string, data: any) {
  clearBudgetCache();
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
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-1', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureIEntry(id: string) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  try {
    const entry = await prisma.annexureI.delete({
      where: { id }
    });

    const userEmail = await getEmail();
    await logAudit({
      action: 'DELETE_ANNEXURE_I_ENTRY',
      entity: 'AnnexureI',
      entityId: id,
      newData: `Deleted Annexure-I entry: ${entry.expertName || id}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-1', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete Annexure-I entry:', err);
    return { success: false, error: err.message || 'Failed to delete entry' };
  }
}

export async function getComponent1Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const cached = budgetCache.get('comp_1');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
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

  const result = {
    ...comp,
    expenditureIncurred: expenditure,
    unutilizedBalance: comp.approvedBudget - expenditure,
    utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00',
  };
  budgetCache.set('comp_1', { data: result, expiry: Date.now() + BUDGET_CACHE_TTL });
  return result;
}

// --- Component 2 ---
export async function getComponent2Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const cached = budgetCache.get('comp_2');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 2 },
    include: { annexureII: { orderBy: { createdAt: 'asc' } } }
  });

  if (!comp) return null;

  let expenditure = 0;
  comp.annexureII.forEach((a: any) => expenditure += a.totalExpenditure);
  const result = {
    ...comp,
    expenditureIncurred: expenditure,
    unutilizedBalance: comp.approvedBudget - expenditure,
    utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00'
  };
  budgetCache.set('comp_2', { data: result, expiry: Date.now() + BUDGET_CACHE_TTL });
  return result;
}

export async function addAnnexureIIEntry(data: any) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const total = (Number(data.travelAllowance) || 0) + (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);
  
  try {
    const createData: any = {
      budgetComponentId: data.budgetComponentId,
      datePeriod: data.datePeriod || '',
      trainingName: data.trainingName || 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.',
      trainingType: data.trainingType || 'Hybrid',
      participant: data.participant || '',
      venue: data.venue || 'NIMI Chennai',
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
      trainingDates: data.trainingDates || '30:07:2026 & 31:07:2026',
      verificationStatus: 'DRAFT',
    };

    const entry = await prisma.annexureII.create({ data: createData });

    const userEmail = await getEmail();
    await logAudit({
      action: 'ADD_ANNEXURE_II_ENTRY',
      entity: 'AnnexureII',
      entityId: entry.id,
      newData: `Added Annexure-II entry for ${createData.participant} - ₹${total}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-2', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to add Annexure-II entry:', err);
    return { success: false, error: err.message || 'Failed to add entry' };
  }
}

export async function updateAnnexureIIEntry(id: string, data: any) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  const total = (Number(data.travelAllowance) || 0) + (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);

  try {
    const updateData: any = {
      totalExpenditure: total,
    };
    if (data.datePeriod !== undefined) updateData.datePeriod = data.datePeriod || '';
    if (data.trainingName !== undefined) updateData.trainingName = data.trainingName || 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.';
    if (data.trainingType !== undefined) updateData.trainingType = data.trainingType || 'Hybrid';
    if (data.participant !== undefined) updateData.participant = data.participant || '';
    if (data.venue !== undefined) updateData.venue = data.venue || 'NIMI Chennai';
    if (data.trainingDays !== undefined) updateData.trainingDays = Number(data.trainingDays) || 0;
    if (data.noOfParticipants !== undefined) updateData.noOfParticipants = Number(data.noOfParticipants) || 0;
    if (data.trainerFee !== undefined) updateData.trainerFee = Number(data.trainerFee) || 0;
    if (data.trainingCost !== undefined) updateData.trainingCost = Number(data.trainingCost) || 0;
    if (data.travelAllowance !== undefined) updateData.travelAllowance = Number(data.travelAllowance) || 0;
    if (data.accommodation !== undefined) updateData.accommodation = Number(data.accommodation) || 0;
    if (data.otherExpenses !== undefined) updateData.otherExpenses = Number(data.otherExpenses) || 0;
    if (data.utrNumber !== undefined) updateData.utrNumber = data.utrNumber || '';
    if (data.remarks !== undefined) updateData.remarks = data.remarks || '';
    if (data.trainingDates !== undefined) updateData.trainingDates = data.trainingDates || '30:07:2026 & 31:07:2026';

    const entry = await prisma.annexureII.update({
      where: { id },
      data: updateData
    });

    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_ANNEXURE_II_ENTRY',
      entity: 'AnnexureII',
      entityId: id,
      newData: `Updated Annexure-II entry for ${entry.participant} - ₹${total}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-2', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to update Annexure-II entry:', err);
    return { success: false, error: err.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureIIEntry(id: string) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  try {
    const entry = await prisma.annexureII.delete({
      where: { id }
    });

    const userEmail = await getEmail();
    await logAudit({
      action: 'DELETE_ANNEXURE_II_ENTRY',
      entity: 'AnnexureII',
      entityId: id,
      newData: `Deleted Annexure-II entry: ${entry.participant || id}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-2', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete Annexure-II entry:', err);
    return { success: false, error: err.message || 'Failed to delete entry' };
  }
}

// --- Component 3 ---
export async function getComponent3Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const cached = budgetCache.get('comp_3');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 3 }, include: { annexureIII: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureIII.forEach((a: any) => expenditure += a.totalExpenditure);
  const result = { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
  budgetCache.set('comp_3', { data: result, expiry: Date.now() + BUDGET_CACHE_TTL });
  return result;
}
export async function addAnnexureIIIEntry(data: any) {
  clearBudgetCache();
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

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-3', 'page');
    return { success: true, data: entry };
  } catch (error: any) {
    console.error('Failed to add Annexure-III entry:', error);
    return { success: false, error: error.message || 'Failed to save entry' };
  }
}


async function validateAndSanitizeAnnexureIVPayload(data: any): Promise<{
  valid: boolean;
  sanitized?: any;
  error?: string;
  fieldErrors?: Record<string, string>;
}> {
  const fieldErrors: Record<string, string> = {};

  // 1. Resolve & Validate BudgetComponent ID
  let compId = (data.budgetComponentId || data.BudgetComponentId || '').trim();
  if (!compId) {
    try {
      const comp4 = await prisma.budgetComponent.findUnique({ where: { componentNo: 4 } });
      compId = comp4?.id || '';
    } catch {
      // fallback
    }
  }

  if (!compId) {
    return {
      valid: false,
      error: 'The selected budget component is unavailable.',
      fieldErrors: { budgetComponentId: 'The selected budget component is unavailable.' }
    };
  }

  // 2. Validate Name (Vendor / Party)
  const name = (data.name || data.vendor || '').trim();
  if (!name) {
    fieldErrors.name = 'Please enter a valid vendor, agency, or party name.';
  }

  // 3. Validate Date
  const rawDate = data.date || data.transactionDate || data.datePeriod;
  let parsedDate: Date | null = null;
  let datePeriod = '';

  if (!rawDate) {
    fieldErrors.date = 'Please select a valid date.';
  } else {
    if (rawDate instanceof Date) {
      parsedDate = rawDate;
    } else if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
        const parts = trimmed.split(/[-/]/);
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        parsedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      } else {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      fieldErrors.date = 'Please select a valid date.';
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      datePeriod = `${monthNames[parsedDate.getUTCMonth()]} ${parsedDate.getUTCFullYear()}`;
    }
  }

  // 4. Validate Expenditure Amount (Exact Decimal Handling)
  let rawExp = data.expenditure !== undefined && data.expenditure !== '' && data.expenditure !== null
    ? data.expenditure
    : (data.totalExpenditure !== undefined && data.totalExpenditure !== '' && data.totalExpenditure !== null
      ? data.totalExpenditure
      : null);

  if (rawExp === null) {
    const costBreakdown = (Number(data.infrastructureCost) || 0) +
                          (Number(data.bandwidthCost) || 0) +
                          (Number(data.archiveCost) || 0) +
                          (Number(data.otherCharges) || 0);
    rawExp = costBreakdown;
  }

  const expNum = Number(rawExp);
  if (isNaN(expNum) || !isFinite(expNum)) {
    fieldErrors.expenditure = 'Please enter a valid expenditure amount.';
  } else if (expNum < 0) {
    fieldErrors.expenditure = 'Expenditure amount cannot be negative.';
  }

  // 5. Validate Voucher / Reference
  const voucher = (data.voucher || data.voucherNo || data.utrNumber || data.purchaseRef || '').trim();
  if (!voucher) {
    fieldErrors.voucher = 'Please enter a valid voucher or reference number.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      error: Object.values(fieldErrors)[0],
      fieldErrors
    };
  }

  const totalExpenditure = Math.round((expNum || 0) * 100) / 100;
  const coaCode = (data.coaCode || '').trim() || '4.1';
  const matchedMaster = COMPONENT_4_COA_MASTER.find(c => c.code.toLowerCase() === coaCode.toLowerCase());
  const coaName = (data.coaName || '').trim() || matchedMaster?.name || data.service || 'Archive / Bandwidth / Networking';
  const txnType = (data.txnType || data.tranType || '').trim() || 'Journal Voucher';
  const narration = (data.narration || data.description || coaName).trim();
  const transcriptionNote = (data.transcriptionNote || data.remarks || '').trim();

  const sanitized = {
    budgetComponentId: compId,
    datePeriod: datePeriod || data.datePeriod || 'Aug 2026',
    service: coaName,
    description: narration,
    vendor: name,
    purchaseRef: voucher,
    quantity: Math.max(1, parseInt(data.quantity, 10) || 1),
    unitCost: totalExpenditure,
    servicePeriod: data.servicePeriod || datePeriod || 'FY 2026-2027',
    infrastructureCost: Number(data.infrastructureCost) || totalExpenditure,
    bandwidthCost: Number(data.bandwidthCost) || 0,
    archiveCost: Number(data.archiveCost) || 0,
    otherCharges: Number(data.otherCharges) || 0,
    totalExpenditure,
    invoiceNo: data.invoiceNo || null,
    utrNumber: voucher,
    remarks: transcriptionNote || null,
    supportingDoc: data.supportingDoc || null,
    verificationStatus: data.verificationStatus || 'VERIFIED',
    coaCode,
    coaName,
    transactionDate: parsedDate,
    txnType,
    voucher,
    narration,
    transcriptionNote
  };

  return { valid: true, sanitized };
}

// --- Component 4 ---
export async function getComponent4Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER']);
  const cached = budgetCache.get('comp_4');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 4 },
    include: { annexureIV: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;

  let expenditure = 0;
  const mappedAnnexureIV = (comp.annexureIV || []).map((item: any) => {
    const exp = Number(item.totalExpenditure) || 0;
    expenditure += exp;

    const transactionDateStr = item.transactionDate
      ? new Date(item.transactionDate).toISOString().split('T')[0]
      : (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '2026-08-06');

    return {
      ...item,
      coaCode: item.coaCode || '4.1',
      coaName: item.coaName || item.service || 'Archive, Cloud Storage & Data Repository',
      name: item.vendor || item.service || 'National Informatics Centre / Media Cloud CDN',
      date: transactionDateStr,
      txnType: item.txnType || 'Journal Voucher',
      voucher: item.voucher || item.utrNumber || item.invoiceNo || item.purchaseRef || 'JV20000017/26-27',
      narration: item.narration || item.description || item.service || '',
      expenditure: exp,
      transcriptionNote: item.transcriptionNote || item.remarks || '',
    };
  });

  const roundedExp = Math.round(expenditure * 100) / 100;
  const result = {
    ...comp,
    annexureIV: mappedAnnexureIV,
    expenditureIncurred: roundedExp,
    unutilizedBalance: comp.approvedBudget - roundedExp,
    utilizationPercent: comp.approvedBudget > 0 ? ((roundedExp / comp.approvedBudget) * 100).toFixed(2) : '0.00'
  };

  budgetCache.set('comp_4', { data: result, expiry: Date.now() + BUDGET_CACHE_TTL });
  return result;
}

export async function addAnnexureIVEntry(data: any) {
  clearBudgetCache();
  const reqId = `req-a4-add-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return { success: false, error: 'Unauthorized: Admin role required to create expenditure entries.' };
    }

    const validation = await validateAndSanitizeAnnexureIVPayload(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        fieldErrors: validation.fieldErrors
      };
    }

    const entry = await prisma.annexureIV.create({
      data: validation.sanitized
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-4', 'page');
    revalidatePath('/reports/monthly-expenditure', 'page');

    return { success: true, data: entry };
  } catch (err: any) {
    console.error(`[AnnexureIV ${reqId}] Error saving entry:`, err.message, err.stack);
    return {
      success: false,
      error: 'Unable to save the entry. Please verify your inputs and try again.',
      reqId
    };
  }
}

// updateAnnexureIVEntry and deleteAnnexureIVEntry replaced above

// --- Component 5 ---
export async function getComponent5Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const cached = budgetCache.get('comp_5');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 5 }, include: { annexureV: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureV.forEach((a: any) => expenditure += a.totalExpenditure);
  const result = { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
  budgetCache.set('comp_5', { data: result, expiry: Date.now() + BUDGET_CACHE_TTL });
  return result;
}
export async function addAnnexureVEntry(data: any) {
  clearBudgetCache();
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;
    const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
    const entry = await prisma.annexureV.create({ data: { ...data, totalExpenditure: total } });
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-5', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to add Annexure-V entry:', err);
    return { success: false, error: err.message || 'Failed to add entry' };
  }
}

// --- Component 6 ---
export async function getComponent6Data() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const cached = budgetCache.get('comp_6');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const comp = await prisma.budgetComponent.findUnique({
    where: { componentNo: 6 }, include: { annexureVI: { orderBy: { createdAt: 'desc' } } }
  });
  if (!comp) return null;
  let expenditure = 0; comp.annexureVI.forEach((a: any) => expenditure += a.totalExpenditure);
  const result = { ...comp, expenditureIncurred: expenditure, unutilizedBalance: comp.approvedBudget - expenditure, utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00' };
  budgetCache.set('comp_6', { data: result, expiry: Date.now() + BUDGET_CACHE_TTL });
  return result;
}
export async function addAnnexureVIEntry(data: any) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const amount = Number(data.amount) || 0;
  const tax = Number(data.tax) || 0;
  const total = amount + tax;

  try {
    const entry = await prisma.annexureVI.create({
      data: {
        budgetComponentId: data.budgetComponentId,
        datePeriod: data.datePeriod || '',
        platform: data.platform || '',
        campaignDesc: data.campaignDesc || '',
        serviceProvider: data.serviceProvider || '',
        campaignType: data.campaignType || '',
        amount,
        tax,
        totalExpenditure: total,
        utrNumber: data.utrNumber || '',
        remarks: data.remarks || '',
        verificationStatus: 'DRAFT',
      }
    });

    const userEmail = await getEmail();
    await logAudit({
      action: 'ADD_ANNEXURE_VI_ENTRY',
      entity: 'AnnexureVI',
      entityId: entry?.id || 'new',
      newData: `Added Annexure-VI entry for ${data.platform || data.campaignDesc} - ₹${total}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-6', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to add Annexure-VI entry:', err);
    return { success: false, error: err.message || 'Failed to add entry' };
  }
}

export async function updateAnnexureIIIEntry(id: string, data: any) {
  clearBudgetCache();
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

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-3', 'page');
    return { success: true, data: entry };
  } catch (error: any) {
    console.error('Failed to update Annexure-III entry:', error);
    return { success: false, error: error.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureIIIEntry(id: string) {
  clearBudgetCache();
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

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-3', 'page');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete Annexure-III entry:', error);
    return { success: false, error: error.message || 'Failed to delete entry' };
  }
}
export async function updateAnnexureIVEntry(id: string, data: any) {
  clearBudgetCache();
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;
    const total = (Number(data.infrastructureCost) || 0) + (Number(data.bandwidthCost) || 0) + (Number(data.archiveCost) || 0) + (Number(data.otherCharges) || 0);
    const entry = await prisma.annexureIV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-4', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to update Annexure-IV entry:', err);
    return { success: false, error: err.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureIVEntry(id: string) {
  clearBudgetCache();
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;
    await prisma.annexureIV.delete({ where: { id } });
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-4', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete Annexure-IV entry:', err);
    return { success: false, error: err.message || 'Failed to delete entry' };
  }
}

export async function updateAnnexureVEntry(id: string, data: any) {
  clearBudgetCache();
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;
    const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
    const entry = await prisma.annexureV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-5', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to update Annexure-V entry:', err);
    return { success: false, error: err.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureVEntry(id: string) {
  clearBudgetCache();
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) return authCheck;
    await prisma.annexureV.delete({ where: { id } });
    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-5', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete Annexure-V entry:', err);
    return { success: false, error: err.message || 'Failed to delete entry' };
  }
}
export async function updateAnnexureVIEntry(id: string, data: any) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  const amount = Number(data.amount) || 0;
  const tax = Number(data.tax) || 0;
  const total = amount + tax;

  try {
    const updateData: any = {
      amount,
      tax,
      totalExpenditure: total,
    };
    if (data.datePeriod !== undefined) updateData.datePeriod = data.datePeriod || '';
    if (data.platform !== undefined) updateData.platform = data.platform || '';
    if (data.campaignDesc !== undefined) updateData.campaignDesc = data.campaignDesc || '';
    if (data.serviceProvider !== undefined) updateData.serviceProvider = data.serviceProvider || '';
    if (data.campaignType !== undefined) updateData.campaignType = data.campaignType || '';
    if (data.utrNumber !== undefined) updateData.utrNumber = data.utrNumber || '';
    if (data.remarks !== undefined) updateData.remarks = data.remarks || '';

    const entry = await prisma.annexureVI.update({
      where: { id },
      data: updateData
    });

    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_ANNEXURE_VI_ENTRY',
      entity: 'AnnexureVI',
      entityId: id,
      newData: `Updated Annexure-VI entry for ${entry.platform || id} - ₹${total}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-6', 'page');
    return { success: true, data: entry };
  } catch (err: any) {
    console.error('Failed to update Annexure-VI entry:', err);
    return { success: false, error: err.message || 'Failed to update entry' };
  }
}

export async function deleteAnnexureVIEntry(id: string) {
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  try {
    const entry = await prisma.annexureVI.delete({ where: { id } });

    const userEmail = await getEmail();
    await logAudit({
      action: 'DELETE_ANNEXURE_VI_ENTRY',
      entity: 'AnnexureVI',
      entityId: id,
      newData: `Deleted Annexure-VI entry: ${entry.platform || id}`,
      userEmail
    });

    revalidatePath('/dashboard', 'page');
    revalidatePath('/budget', 'page');
    revalidatePath('/budget/annexure-6', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete Annexure-VI entry:', err);
    return { success: false, error: err.message || 'Failed to delete entry' };
  }
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
  clearBudgetCache();
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  await prisma.budgetComponent.update({
    where: { id },
    data: { approvedBudget }
  });
  revalidatePath('/budget', 'page');
  revalidatePath('/dashboard', 'page');
  return { success: true };
}
