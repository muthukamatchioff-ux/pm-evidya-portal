'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, checkAuth } from '@/lib/auth';

export async function generateReportData(reportId: string, dateFrom: string, dateTo: string) {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!authCheck.success) return authCheck;
  let data: any[] = [];
  
  const dateFilter = dateFrom && dateTo ? {
    createdAt: {
      gte: new Date(dateFrom),
      lte: new Date(dateTo + 'T23:59:59.999Z')
    }
  } : {};

  switch (reportId) {
    case 'financial_overview':
    case 'seven_head':
      data = await prisma.budgetHead.findMany({ orderBy: { name: 'asc' } });
      break;
    case 'video_content':
    case 'capacity_building':
    case 'hr_support':
    case 'archive_network':
    case 'telecast_setup':
    case 'feedback_research':
    case 'studio_setup':
      data = await prisma.expenditure.findMany({
        where: { ...dateFilter },
        include: { budgetHead: true, payment: { include: { workEntry: { include: { sme: true } } } }, hrSalary: { include: { hr: true } } },
        orderBy: { transactionDate: 'desc' }
      });
      break;
    case 'sme_payment':
      data = await prisma.payment.findMany({
        where: { ...dateFilter },
        include: { workEntry: { include: { sme: true } } },
        orderBy: { createdAt: 'desc' }
      });
      break;
    case 'manpower_salary':
      data = await prisma.hRSalary.findMany({
        where: { ...dateFilter },
        include: { hr: true },
        orderBy: { createdAt: 'desc' }
      });
      break;
    case 'projects':
      data = await prisma.project.findMany({
        where: { ...dateFilter },
        include: { trade: true, language: true, status: true },
        orderBy: { projectCode: 'asc' }
      });
      break;
    default:
      data = [{ message: 'No specific data handler for this report type yet.', reportId }];
  }
  
  return JSON.parse(JSON.stringify(data));
}

export async function getComprehensiveReportData() {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!authCheck.success) return authCheck;
  const smes = await prisma.sME.findMany({
    include: {
      workEntries: {
        include: {
          documents: true,
          payments: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const production = await prisma.productionRecord.findMany({
    include: { project: true },
    orderBy: { createdAt: 'desc' }
  });

  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000
  });

  const epicWorkEntries = await prisma.sMEWorkEntry.findMany({
    include: {
      sme: true,
      documents: true,
      payments: true,
      shootingSchedules: true,
      videoEditorRecords: true,
      animationRecords: true,
      finalVideoRecords: true,
      videoLibraries: true,
    },
    orderBy: { epicSequence: 'asc' }
  });

  return JSON.parse(JSON.stringify({ smes, production, auditLogs, epicWorkEntries }));
}

export async function getEpicCompleteHistory(workEntryId: string) {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!authCheck.success) return { success: false, error: authCheck.error };
  
  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: workEntryId },
      include: {
        sme: true,
        documents: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        shootingSchedules: { orderBy: { createdAt: 'asc' } },
        videoEditorRecords: { orderBy: { createdAt: 'asc' } },
        animationRecords: { orderBy: { createdAt: 'asc' } },
        finalVideoRecords: { orderBy: { createdAt: 'asc' } },
        videoLibraries: { orderBy: { createdAt: 'desc' } },
      }
    });

    if (!workEntry) return { success: false, error: 'Epic record not found.' };

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: workEntry.id },
          ...(workEntry.smeId ? [{ entityId: workEntry.smeId }] : [])
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify({ workEntry, auditLogs }))
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Epic complete history.' };
  }
}

