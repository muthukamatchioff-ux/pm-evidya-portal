/**
 * PM e-Vidya Portal — Canonical Budget Master Financial Service
 * 
 * Authoritative single source of truth for sanctioned budget amounts across:
 * - Budget Master (/budget)
 * - Monthly Expenditure Report (/reports/monthly-expenditure)
 * - NCERT Activity & Fund Tracker Report (/reports/ncert-report)
 * - Head-wise Analysis & Financial Overview (/reports)
 * - Master Budget Dashboard (/dashboard)
 * - Component Annexure Ledgers (/budget/annexure-1 to 6)
 * 
 * Flow:
 * Budget Master (Prisma BudgetComponent) -> Canonical Budget Master Service -> All Reports & Dashboards
 */

import { prisma } from '@/lib/prisma';
import { REAL_PM_EVIDYA_BUDGET_COMPONENTS, REAL_PM_EVIDYA_BUDGET_HEADS } from '@/lib/fallbackData';

export interface AuthoritativeBudgetComponent {
  componentNo: number;
  id: string;
  name: string;
  approvedBudget: number;
  annexureRoman: string;
}

export interface AuthoritativeSanctionedBudgetsResult {
  componentBudgetMap: Record<number, number>; // componentNo -> approvedBudget (INR)
  totalSanctionedBudget: number;               // Sum of 6 online components (INR)
  components: AuthoritativeBudgetComponent[];
}

export interface AuthoritativeComponentSummary {
  componentNo: number;
  id: string;
  name: string;
  shortName: string;
  annexureRoman: string;
  sanctionedBudget: number;
  eligibleExpenditure: number;
  availableBalance: number;
  expenditurePercentage: number;
  recordsCount: number;
}

export interface AuthoritativeBudgetSummaryResult {
  financialYear: string;
  reportingPeriod: string;
  statementDate: string;
  totalSanctionedBudget: number;
  totalExpenditure: number;
  totalAvailableBalance: number;
  overallUtilizationPercent: number;
  totalRecordsCount: number;
  components: AuthoritativeComponentSummary[];
}

// Canonical component metadata
export const CANONICAL_ONLINE_COMPONENT_META: Array<{
  componentNo: number;
  name: string;
  shortName: string;
  color: string;
  annexureRoman: string;
  headKeywords: string[];
}> = [
  {
    componentNo: 1,
    name: '1. Digital Content Development & Production',
    shortName: 'Digital Content Development',
    color: '#2563eb',
    annexureRoman: 'I',
    headKeywords: ['VIDEO CONTENT', 'DIGITAL CONTENT']
  },
  {
    componentNo: 2,
    name: '2. Capacity Building & Training',
    shortName: 'Capacity Building',
    color: '#16a34a',
    annexureRoman: 'II',
    headKeywords: ['CAPACITY BUILDING', 'TRAINING']
  },
  {
    componentNo: 3,
    name: '3. Human Resource & Technical Support',
    shortName: 'Human Resource Support',
    color: '#7c3aed',
    annexureRoman: 'III',
    headKeywords: ['HUMAN RESOURCE', 'CONSULTANT']
  },
  {
    componentNo: 4,
    name: '4. Digital Infrastructure, Archive & Network Services',
    shortName: 'Archive / Bandwidth',
    color: '#ea580c',
    annexureRoman: 'IV',
    headKeywords: ['ARCHIVE', 'BANDWIDTH', 'DIGITAL INFRASTRUCTURE', 'CLOUD']
  },
  {
    componentNo: 5,
    name: '5. School Telecast & Distribution Infrastructure',
    shortName: 'School Telecast Infrastructure',
    color: '#db2777',
    annexureRoman: 'V',
    headKeywords: ['TELECAST', 'DISTRIBUTION', 'CONTINGENCY']
  },
  {
    componentNo: 6,
    name: '6. Outreach, Feedback, Research & Advocacy',
    shortName: 'Feedback / Research',
    color: '#0d9488',
    annexureRoman: 'VI',
    headKeywords: ['FEEDBACK', 'RESEARCH', 'ADVOCACY', 'MEDIA PRODUCTION', 'OUTREACH']
  }
];

/**
 * Retrieves the authoritative sanctioned budget for all 6 online components directly
 * from Budget Master (Prisma BudgetComponent table).
 * 
 * If the database query is unavailable (e.g. during static generation without DB connection),
 * it gracefully falls back to REAL_PM_EVIDYA_BUDGET_COMPONENTS.
 */
export async function getAuthoritativeSanctionedBudgets(): Promise<AuthoritativeSanctionedBudgetsResult> {
  const componentBudgetMap: Record<number, number> = {};
  const components: AuthoritativeBudgetComponent[] = [];

  try {
    const dbComponents = await prisma.budgetComponent.findMany({
      where: { componentNo: { lte: 6 } }, // Strictly online components 1 to 6 (Head 7 offline-only)
      orderBy: { componentNo: 'asc' }
    });

    if (dbComponents && dbComponents.length > 0) {
      dbComponents.forEach((c: any) => {
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][c.componentNo - 1] || 'I';
        const budget = Number(c.approvedBudget) || 0;
        componentBudgetMap[c.componentNo] = budget;
        components.push({
          componentNo: c.componentNo,
          id: c.id,
          name: c.name,
          approvedBudget: budget,
          annexureRoman: roman
        });
      });
    }
  } catch (err) {
    console.warn('[BudgetMasterService] Could not query Prisma BudgetComponent, using canonical fallback:', err);
  }

  // Ensure all 6 components are populated using fallback if missing in DB response
  for (const meta of CANONICAL_ONLINE_COMPONENT_META) {
    if (componentBudgetMap[meta.componentNo] === undefined) {
      const fallbackComp = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find(c => c.componentNo === meta.componentNo);
      const budget = fallbackComp ? (Number(fallbackComp.approvedBudget) || 0) : 0;
      componentBudgetMap[meta.componentNo] = budget;
      components.push({
        componentNo: meta.componentNo,
        id: fallbackComp?.id || `comp-${meta.componentNo}`,
        name: meta.name,
        approvedBudget: budget,
        annexureRoman: meta.annexureRoman
      });
    }
  }

  // Sort components by componentNo 1..6
  components.sort((a, b) => a.componentNo - b.componentNo);

  const totalSanctionedBudget = Object.values(componentBudgetMap).reduce((sum, b) => sum + b, 0);

  return {
    componentBudgetMap,
    totalSanctionedBudget,
    components
  };
}

/**
 * Retrieves the comprehensive authoritative financial summary.
 * 
 * - Sanctioned Budget: Authoritative Budget Master values
 * - Actual Expenditure: Existing authorized expenditure records
 * - Available Balance: Sanctioned Budget - Eligible Expenditure
 * - Expenditure Percentage: (Eligible Expenditure / Sanctioned Budget) * 100
 */
export async function getAuthoritativeBudgetSummary(options?: {
  financialYear?: string;
  projectId?: string;
}): Promise<AuthoritativeBudgetSummaryResult> {
  const { componentBudgetMap, totalSanctionedBudget, components: masterComps } = await getAuthoritativeSanctionedBudgets();

  let totalExpenditure = 0;
  let totalRecordsCount = 0;

  // Retrieve actual expenditures from BudgetComponent relation or fallback data
  let dbComps: any[] = [];
  try {
    dbComps = await prisma.budgetComponent.findMany({
      where: { componentNo: { lte: 6 } },
      include: {
        annexureI: { select: { id: true, totalExpenditure: true } },
        annexureII: { select: { id: true, totalExpenditure: true } },
        annexureIII: { select: { id: true, totalExpenditure: true } },
        annexureIV: { select: { id: true, totalExpenditure: true } },
        annexureV: { select: { id: true, totalExpenditure: true } },
        annexureVI: { select: { id: true, totalExpenditure: true } }
      },
      orderBy: { componentNo: 'asc' }
    });
  } catch (err) {
    console.warn('[BudgetMasterService] Prisma expenditure fetch error, using fallback records:', err);
  }

  const componentSummaries: AuthoritativeComponentSummary[] = CANONICAL_ONLINE_COMPONENT_META.map((meta) => {
    const sanctioned = componentBudgetMap[meta.componentNo] ?? 0;
    const dbComp = dbComps.find(c => c.componentNo === meta.componentNo);
    const fallbackComp = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find(c => c.componentNo === meta.componentNo);

    let compExp = 0;
    let recCount = 0;

    if (dbComp) {
      if (meta.componentNo === 1) {
        dbComp.annexureI?.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
        recCount = dbComp.annexureI?.length || 0;
      } else if (meta.componentNo === 2) {
        dbComp.annexureII?.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
        recCount = dbComp.annexureII?.length || 0;
      } else if (meta.componentNo === 3) {
        dbComp.annexureIII?.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
        recCount = dbComp.annexureIII?.length || 0;
      } else if (meta.componentNo === 4) {
        if (!dbComp.annexureIV || dbComp.annexureIV.length === 0) {
          // Fallback to verified canonical Annexure IV record
          const c4Fallback = fallbackComp?.annexureIV || [];
          c4Fallback.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
          recCount = c4Fallback.length;
        } else {
          dbComp.annexureIV.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
          recCount = dbComp.annexureIV.length;
        }
      } else if (meta.componentNo === 5) {
        dbComp.annexureV?.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
        recCount = dbComp.annexureV?.length || 0;
      } else if (meta.componentNo === 6) {
        dbComp.annexureVI?.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
        recCount = dbComp.annexureVI?.length || 0;
      }
    } else if (fallbackComp) {
      const aKey = ['annexureI', 'annexureII', 'annexureIII', 'annexureIV', 'annexureV', 'annexureVI'][meta.componentNo - 1];
      const records = (fallbackComp as any)[aKey] || [];
      records.forEach((a: any) => compExp += (Number(a.totalExpenditure) || 0));
      recCount = records.length;
    }

    const availableBal = sanctioned - compExp;
    const utilPct = sanctioned > 0 ? (compExp / sanctioned) * 100 : 0;

    totalExpenditure += compExp;
    totalRecordsCount += recCount;

    return {
      componentNo: meta.componentNo,
      id: masterComps.find(c => c.componentNo === meta.componentNo)?.id || `comp-${meta.componentNo}`,
      name: meta.name,
      shortName: meta.shortName,
      annexureRoman: meta.annexureRoman,
      sanctionedBudget: sanctioned,
      eligibleExpenditure: compExp,
      availableBalance: availableBal,
      expenditurePercentage: Number(utilPct.toFixed(2)),
      recordsCount: recCount
    };
  });

  const totalAvailableBalance = totalSanctionedBudget - totalExpenditure;
  const overallUtilizationPercent = totalSanctionedBudget > 0
    ? Number(((totalExpenditure / totalSanctionedBudget) * 100).toFixed(2))
    : 0;

  return {
    financialYear: options?.financialYear || 'FY 2026-2027',
    reportingPeriod: 'June 2026 – September 2026 (Q2 FY 2026-27)',
    statementDate: '07-Oct-2026',
    totalSanctionedBudget,
    totalExpenditure,
    totalAvailableBalance,
    overallUtilizationPercent,
    totalRecordsCount,
    components: componentSummaries
  };
}

/**
 * Synchronizes the corresponding BudgetHead table record when a BudgetComponent is updated.
 * Also keeps in-memory fallback models updated so changes reflect immediately.
 */
export async function syncBudgetComponentToBudgetHead(componentNo: number, approvedBudget: number): Promise<void> {
  const meta = CANONICAL_ONLINE_COMPONENT_META.find(m => m.componentNo === componentNo);
  if (!meta) return;

  // 1. Update matching BudgetHead records in Prisma
  for (const kw of meta.headKeywords) {
    try {
      await prisma.budgetHead.updateMany({
        where: { name: { contains: kw } },
        data: { approvedBudget }
      });
    } catch (_) {}
  }

  // Also match by component number prefix (e.g. "1.", "2.", "3.", etc.)
  try {
    await prisma.budgetHead.updateMany({
      where: { name: { startsWith: `${componentNo}.` } },
      data: { approvedBudget }
    });
  } catch (_) {}

  // 2. Update in-memory fallback arrays in REAL_PM_EVIDYA_BUDGET_COMPONENTS & REAL_PM_EVIDYA_BUDGET_HEADS
  const fallbackComp = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find(c => c.componentNo === componentNo);
  if (fallbackComp) {
    fallbackComp.approvedBudget = approvedBudget;
  }

  const fallbackHead = REAL_PM_EVIDYA_BUDGET_HEADS.find(h =>
    h.name.startsWith(`${componentNo}.`) || meta.headKeywords.some(kw => h.name.includes(kw))
  );
  if (fallbackHead) {
    fallbackHead.approvedBudget = approvedBudget;
  }
}
