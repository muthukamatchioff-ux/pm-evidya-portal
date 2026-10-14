'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, checkAuth, getCurrentUser } from '@/lib/auth';
import { parseAssignedEpics } from '@/lib/epicHelpers';

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
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  if (!authCheck.success) return authCheck;
  const role = authCheck.role || 'VIEWER';
  const user = await getCurrentUser();

  let epicFilter: any = {};
  if (role === 'CAMERAMAN' || role === 'EDITOR') {
    const assigned = parseAssignedEpics(user?.department);
    if (role === 'CAMERAMAN') {
      epicFilter = {
        OR: [
          ...(assigned.length > 0 ? [{ epicSequence: { in: assigned } }] : []),
          { shootingSchedules: { some: { cameraman: { in: [user?.name, user?.email].filter(Boolean) as string[] } } } }
        ]
      };
    } else {
      epicFilter = {
        OR: [
          ...(assigned.length > 0 ? [{ epicSequence: { in: assigned } }] : []),
          { videoEditorRecords: { some: { editorName: { in: [user?.name, user?.email].filter(Boolean) as string[] } } } }
        ]
      };
    }
  }

  const [smes, production, auditLogs, epicWorkEntries] = await Promise.all([
    (role === 'CAMERAMAN' || role === 'EDITOR')
      ? Promise.resolve([])
      : prisma.sME.findMany({
          select: {
            id: true,
            name: true,
            institute: true,
            workEntries: {
              select: {
                id: true,
                epicSequence: true,
                trade: true,
                topic: true,
                status: true,
                createdAt: true,
                documents: {
                  select: {
                    id: true,
                    type: true,
                  }
                },
                payments: (role === 'ADMIN' || role === 'TEAM_MEMBER')
                  ? {
                      select: {
                        id: true,
                        status: true,
                      }
                    }
                  : false
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),

    prisma.productionRecord.findMany({
      select: {
        id: true,
        shootDate: true,
        status: true,
        videoUrl: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            projectCode: true,
            title: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),

    (role === 'ADMIN' || role === 'TEAM_MEMBER')
      ? prisma.auditLog.findMany({
          select: {
            id: true,
            createdAt: true,
            action: true,
            entity: true,
            entityId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 250
        })
      : Promise.resolve([]),

    prisma.sMEWorkEntry.findMany({
      where: epicFilter,
      include: {
        sme: {
          select: {
            id: true,
            name: true,
            designation: true,
            institute: true,
          }
        },
        documents: true,
        payments: (role === 'ADMIN' || role === 'TEAM_MEMBER'),
        shootingSchedules: true,
        videoEditorRecords: true,
        animationRecords: true,
        finalVideoRecords: true,
        videoLibraries: true,
      },
      orderBy: { epicSequence: 'asc' }
    })
  ]);

  return JSON.parse(JSON.stringify({ smes, production, auditLogs, epicWorkEntries }));
}

export async function getEpicCompleteHistory(workEntryId: string) {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  if (!authCheck.success) return { success: false, error: authCheck.error };
  const role = authCheck.role || 'VIEWER';
  const user = await getCurrentUser();
  
  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: workEntryId },
      include: {
        sme: true,
        documents: { orderBy: { createdAt: 'desc' } },
        payments: (role === 'ADMIN' || role === 'TEAM_MEMBER') ? { orderBy: { createdAt: 'desc' } } : false,
        shootingSchedules: { orderBy: { createdAt: 'asc' } },
        videoEditorRecords: { orderBy: { createdAt: 'asc' } },
        animationRecords: { orderBy: { createdAt: 'asc' } },
        finalVideoRecords: { orderBy: { createdAt: 'asc' } },
        videoLibraries: { orderBy: { createdAt: 'desc' } },
      }
    });

    if (!workEntry) return { success: false, error: 'Epic record not found.' };

    if (role === 'CAMERAMAN' || role === 'EDITOR') {
      const assigned = parseAssignedEpics(user?.department);
      const isAssignedSeq = workEntry.epicSequence && assigned.includes(workEntry.epicSequence);
      const isAssignedName = role === 'CAMERAMAN'
        ? workEntry.shootingSchedules?.some((s: any) => s.cameraman === user?.name || s.cameraman === user?.email)
        : workEntry.videoEditorRecords?.some((e: any) => e.editorName === user?.name || e.editorName === user?.email);
      
      if (!isAssignedSeq && !isAssignedName) {
        return { success: false, error: 'Unauthorized: You are not assigned to this Epic ID.' };
      }
    }

    const auditLogs = (role === 'ADMIN' || role === 'TEAM_MEMBER')
      ? await prisma.auditLog.findMany({
          where: {
            OR: [
              { entityId: workEntry.id },
              ...(workEntry.smeId ? [{ entityId: workEntry.smeId }] : [])
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        })
      : [];

    return {
      success: true,
      data: JSON.parse(JSON.stringify({ workEntry, auditLogs }))
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Epic complete history.' };
  }
}

