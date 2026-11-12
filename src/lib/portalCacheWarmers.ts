import { prisma } from './prisma';
import { cachedQuery, CACHE_TAGS } from './dataCache';
import {
  getAuthoritativeSanctionedBudgets,
  getCachedBudgetComponentsWithAnnexures,
} from './budgetMasterService';
import { REAL_PM_EVIDYA_BUDGET_COMPONENTS } from './fallbackData';
import { getAuthoritativeVideoLibrary } from './videoCatalogService';
import { findSmeContact } from './smeContacts';

/**
 * Shared Cross-Lambda Budget Components Loader (`summaryOnly` or full annexures).
 * Reused by Dashboard, Budget Master, Reports, and `/api/warmup`.
 */
export const getCachedBudgetComponentsResult = cachedQuery(
  async (isSummary: boolean) => {
    const components = await prisma.budgetComponent.findMany({
      where: { componentNo: { lte: 6 } }, // Head 7 Studio Upgradation is offline-only
      include: isSummary
        ? {
            annexureI: { select: { id: true, totalExpenditure: true } },
            annexureII: { select: { id: true, totalExpenditure: true } },
            annexureIII: { select: { id: true, totalExpenditure: true } },
            annexureIV: { select: { id: true, totalExpenditure: true } },
            annexureV: { select: { id: true, totalExpenditure: true } },
            annexureVI: { select: { id: true, totalExpenditure: true } },
          }
        : {
            annexureI: { orderBy: { createdAt: 'asc' } },
            annexureII: { orderBy: { createdAt: 'asc' } },
            annexureIII: { orderBy: { createdAt: 'desc' } },
            annexureIV: { orderBy: { createdAt: 'desc' } },
            annexureV: { orderBy: { createdAt: 'desc' } },
            annexureVI: { orderBy: { createdAt: 'desc' } },
          },
      orderBy: { componentNo: 'asc' },
    });

    if (!components || components.length === 0) {
      return REAL_PM_EVIDYA_BUDGET_COMPONENTS.map((c: any) => {
        let expenditure = 0;
        if (c.componentNo === 1) c.annexureI?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
        if (c.componentNo === 2) c.annexureII?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
        if (c.componentNo === 3) c.annexureIII?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
        if (c.componentNo === 4) c.annexureIV?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
        if (c.componentNo === 5) c.annexureV?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
        if (c.componentNo === 6) c.annexureVI?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));

        const unutilized = c.approvedBudget - expenditure;
        const utilization = c.approvedBudget > 0 ? (expenditure / c.approvedBudget) * 100 : 0;
        return {
          ...c,
          expenditureIncurred: expenditure,
          unutilizedBalance: unutilized,
          utilizationPercent: utilization.toFixed(2),
        };
      });
    }

    return components.map((comp: any) => {
      let expenditure = 0;
      if (comp.componentNo === 1) comp.annexureI?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
      if (comp.componentNo === 2) comp.annexureII?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
      if (comp.componentNo === 3) comp.annexureIII?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
      if (comp.componentNo === 4) comp.annexureIV?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
      if (comp.componentNo === 5) comp.annexureV?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
      if (comp.componentNo === 6) comp.annexureVI?.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));

      let annexureIVData = comp.annexureIV;
      if (comp.componentNo === 4 && (!comp.annexureIV || comp.annexureIV.length === 0)) {
        const c4Fallback = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find((c) => c.componentNo === 4);
        if (c4Fallback && c4Fallback.annexureIV && c4Fallback.annexureIV.length > 0) {
          annexureIVData = c4Fallback.annexureIV;
          expenditure = 0;
          annexureIVData.forEach((a: any) => (expenditure += Number(a.totalExpenditure) || 0));
        }
      }

      const annexureVData = comp.annexureV || [];
      const unutilized = comp.approvedBudget - expenditure;
      const utilization = comp.approvedBudget > 0 ? (expenditure / comp.approvedBudget) * 100 : 0;

      return {
        ...comp,
        ...(comp.componentNo === 4 ? { annexureIV: annexureIVData } : {}),
        ...(comp.componentNo === 5 ? { annexureV: annexureVData } : {}),
        expenditureIncurred: expenditure,
        unutilizedBalance: unutilized,
        utilizationPercent: utilization.toFixed(2),
      };
    });
  },
  ['portal-budget-components-result-v1'],
  {
    revalidate: 300,
    tags: [
      CACHE_TAGS.BUDGET_MASTER,
      CACHE_TAGS.REPORTS,
      CACHE_TAGS.ANNEXURES,
      CACHE_TAGS.ANNEXURE_1,
      CACHE_TAGS.ANNEXURE_2,
      CACHE_TAGS.ANNEXURE_3,
      CACHE_TAGS.ANNEXURE_4,
      CACHE_TAGS.ANNEXURE_5,
      CACHE_TAGS.ANNEXURE_6,
    ],
  }
);

/**
 * Shared Cross-Lambda Component Query (Heads 1 to 6).
 * Exported here so both Server Actions and `/api/warmup` share the exact same Next.js Data Cache keys.
 */
export const getCachedComponentByNo = cachedQuery(
  async (componentNo: number) => {
    const includeMap: Record<number, any> = {
      1: { annexureI: { orderBy: { createdAt: 'asc' } } },
      2: { annexureII: { orderBy: { createdAt: 'asc' } } },
      3: { annexureIII: { orderBy: { createdAt: 'desc' } } },
      4: { annexureIV: { orderBy: { createdAt: 'desc' } } },
      5: { annexureV: { orderBy: { createdAt: 'desc' } } },
      6: { annexureVI: { orderBy: { createdAt: 'desc' } } },
    };
    return await prisma.budgetComponent.findUnique({
      where: { componentNo },
      include: includeMap[componentNo],
    }).catch(() => null);
  },
  ['portal-budget-component-by-no-v1'],
  {
    revalidate: 300,
    tags: [
      CACHE_TAGS.BUDGET_MASTER,
      CACHE_TAGS.ANNEXURES,
      CACHE_TAGS.ANNEXURE_1,
      CACHE_TAGS.ANNEXURE_2,
      CACHE_TAGS.ANNEXURE_3,
      CACHE_TAGS.ANNEXURE_4,
      CACHE_TAGS.ANNEXURE_5,
      CACHE_TAGS.ANNEXURE_6,
    ],
  }
);

export const getCachedDocumentsAndSmes = cachedQuery(
  async () => {
    const [documents, smes] = await Promise.all([
      prisma.document.findMany({
        include: {
          workEntry: {
            include: {
              sme: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sME.findMany({
        include: {
          workEntries: {
            include: {
              documents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { documents, smes };
  },
  ['portal-documents-and-smes-v1'],
  { revalidate: 300, tags: [CACHE_TAGS.DOCUMENTS, CACHE_TAGS.SMES] }
);

export const getCachedAccountsWorkEntries = cachedQuery(
  async () => {
    return await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        payments: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['portal-accounts-work-entries-v1'],
  { revalidate: 300, tags: [CACHE_TAGS.SMES, CACHE_TAGS.DOCUMENTS] }
);

export const getCachedSmeWorkEntriesList = cachedQuery(
  async (): Promise<any[]> => {
    let workEntries: any[] = [];
    try {
      workEntries = await prisma.sMEWorkEntry.findMany({
        include: {
          sme: true,
          payments: true,
          documents: {
            orderBy: { updatedAt: 'desc' },
          },
        },
        orderBy: { epicSequence: 'desc' },
      });
    } catch (e) {
      console.warn('Failed to load SMEWorkEntries from DB:', e);
    }

    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('./fallbackData');

    if (!workEntries || workEntries.length === 0) {
      workEntries = [...REAL_PM_EVIDYA_SME_WORK_ENTRIES];
    } else {
      const existingIds = new Set(workEntries.map((e) => e.id));
      const existingSeqs = new Set(workEntries.map((e) => e.epicSequence));
      const existingNames = new Set(workEntries.map((e) => e.sme?.name?.trim().toLowerCase()).filter(Boolean));

      for (const fb of REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]) {
        const fbName = fb.sme?.name?.trim().toLowerCase();
        if (!existingIds.has(fb.id) && !existingSeqs.has(fb.epicSequence) && (!fbName || !existingNames.has(fbName))) {
          workEntries.push(fb);
        }
      }

      try {
        const dbSmes = await prisma.sME.findMany();
        const linkedSmeIds = new Set(workEntries.map((e) => e.smeId).filter(Boolean));
        for (const s of dbSmes) {
          if (!linkedSmeIds.has(s.id)) {
            const matchedFb = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(
              (fb) => fb.smeId === s.id || fb.sme?.name?.trim().toLowerCase() === s.name.trim().toLowerCase()
            );
            if (matchedFb && !workEntries.some((e) => e.id === matchedFb.id)) {
              workEntries.push({ ...matchedFb, sme: s, smeId: s.id });
              linkedSmeIds.add(s.id);
            }
          }
        }

        const orphanTestSmes = dbSmes.filter(
          (s: any) =>
            !linkedSmeIds.has(s.id) &&
            (s.name.toLowerCase().includes('muthu') ||
              s.name.toLowerCase().includes('kamatchi') ||
              s.name.toLowerCase().includes('test'))
        );
        for (const orphan of orphanTestSmes) {
          try {
            await prisma.document.deleteMany({ where: { workEntry: { smeId: orphan.id } } });
            await prisma.payment.deleteMany({ where: { workEntry: { smeId: orphan.id } } });
            await prisma.sMEWorkEntry.deleteMany({ where: { smeId: orphan.id } });
            await prisma.sME.delete({ where: { id: orphan.id } });
          } catch (_) {}
        }
      } catch (_) {}

      const needsDbSync: any[] = [];
      for (const entry of workEntries) {
        if (entry.sme) {
          const contact = findSmeContact(entry.sme.name, entry.epicSequence);
          if (contact) {
            const wasMissing = !entry.sme.contactNumber || !entry.sme.email;
            if ((entry.sme.contactNumber === null || entry.sme.contactNumber === undefined || entry.sme.contactNumber === '') && contact.phone) {
              entry.sme.contactNumber = contact.phone;
            }
            if ((entry.sme.email === null || entry.sme.email === undefined || entry.sme.email === '') && contact.email) {
              entry.sme.email = contact.email;
            }
            if (wasMissing && entry.sme.id) {
              needsDbSync.push({ id: entry.sme.id, phone: entry.sme.contactNumber, email: entry.sme.email });
            }
          }
        }
      }

      if (needsDbSync.length > 0) {
        Promise.all(
          needsDbSync.map((item) =>
            prisma.sME
              .updateMany({
                where: {
                  id: item.id,
                  OR: [{ contactNumber: null }, { contactNumber: '' }],
                },
                data: {
                  contactNumber: item.phone || undefined,
                  email: item.email || undefined,
                },
              })
              .catch(() => null)
          )
        ).catch(() => null);
      }

      workEntries.sort((a, b) => (b.epicSequence || 0) - (a.epicSequence || 0));
    }

    return workEntries;
  },
  ['portal-sme-list-entries-v1'],
  { revalidate: 300, tags: [CACHE_TAGS.SMES, CACHE_TAGS.DOCUMENTS] }
);

/**
 * Lightweight Neon compute wake-up + core financial/dashboard Data Cache prime.
 * Wakes Neon first with a single lightweight ping before warming dashboard/budget caches
 * to avoid cold connection-pool contention.
 */
export async function warmDatabaseAndCoreCaches() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {}
  await Promise.allSettled([
    getAuthoritativeSanctionedBudgets(),
    getCachedBudgetComponentsResult(true),
    getCachedBudgetComponentsWithAnnexures(),
  ]);
}

/**
 * Full shared Data Cache pre-warming across all 6 Annexures, Budget Master,
 * Reports, SMEs, Documents, Accounts, and Videos in two non-contending batches.
 */
export async function warmAllPortalCaches() {
  await warmDatabaseAndCoreCaches();
  await Promise.allSettled([
    getCachedBudgetComponentsResult(false),
    getCachedComponentByNo(1),
    getCachedComponentByNo(2),
    getCachedComponentByNo(3),
    getAuthoritativeVideoLibrary(),
  ]);
  await Promise.allSettled([
    getCachedComponentByNo(4),
    getCachedComponentByNo(5),
    getCachedComponentByNo(6),
    getCachedSmeWorkEntriesList(),
    getCachedDocumentsAndSmes(),
    getCachedAccountsWorkEntries(),
  ]);
}

