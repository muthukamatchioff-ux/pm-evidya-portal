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

function normalizeName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(mr|ms|mrs|smt|shri|dr)\.?\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function matchVideosForEpic(epic: any, allVideos: any[]): any[] {
  const epicId = epic.id;
  const eNorm = normalizeName(epic.sme?.name);
  const eTrade = (epic.trade || '').toLowerCase().trim();

  const directVideos = (epic.videoLibraries || []).filter(Boolean);

  const matched = allVideos.filter((v: any) => {
    if (v.epicId && v.epicId === epicId) return true;
    if (v.epicId && v.epicId !== epicId) return false;
    const vNorm = normalizeName(v.smeName);
    if (eNorm && vNorm && (eNorm.includes(vNorm) || vNorm.includes(eNorm))) return true;
    const vTrade = (v.trade || '').toLowerCase().trim();
    if (vTrade && (eTrade.includes(vTrade) || vTrade.includes(eTrade))) return true;
    if (epic.epicSequence === 11 && (v.trade?.toLowerCase().includes('drone') || v.smeName?.toLowerCase().includes('drone'))) return true;
    return false;
  });

  const videoMap = new Map<string, any>();
  directVideos.forEach((v: any) => videoMap.set(v.id, v));
  matched.forEach((v: any) => videoMap.set(v.id, v));
  return Array.from(videoMap.values());
}

function cleanCameraman(name?: string | null, fallbackName: string = 'Antony Alcander'): string {
  if (!name) return fallbackName;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || lower === 'production team' || lower === 'production' || lower === 'team') {
    return fallbackName;
  }
  return trimmed;
}

function cleanEditorName(name?: string | null, fallbackName: string = 'Post-Production Team'): string {
  if (!name) return fallbackName;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || lower === 'not assigned') {
    return fallbackName;
  }
  return trimmed;
}

function extractEndDate(reviewComments?: string | null): string | null {
  if (!reviewComments) return null;
  const match = reviewComments.match(/\[END:([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

function buildEpicWorkflowRecords(entry: any, combinedVideos: any[]) {
  const realSchedules: any[] = entry.shootingSchedules || [];
  const realEditorRecs: any[] = entry.videoEditorRecords || [];
  const defaultCam = 'Antony Alcander';
  const defaultEd = 'Post-Production Team';
  const defaultStartDate = new Date('2026-10-05T00:00:00.000Z');
  const defaultEndDate = new Date('2026-10-15T00:00:00.000Z');

  let shootingSchedules: any[] = [];
  if (combinedVideos.length > 0) {
    shootingSchedules = combinedVideos.map((v: any, idx: number) => {
      const title = v.title || entry.topic;
      const matchSched = realSchedules.find((s: any) => 
        s.id === v.id || s.id === `shoot-${v.id}` || (s.videoTitle && s.videoTitle.trim() === title.trim())
      );
      if (matchSched) {
        return {
          ...matchSched,
          cameraman: cleanCameraman(matchSched.cameraman, defaultCam),
        };
      }
      return {
        id: `shoot-${v.id || idx}`,
        workEntryId: entry.id,
        videoTitle: title,
        shootDate: v.createdAt || entry.attendanceFrom || entry.createdAt,
        scheduledStart: entry.attendanceFrom || v.createdAt,
        scheduledEnd: entry.attendanceTo || v.createdAt,
        location: 'Studio - NIMI Chennai',
        cameraman: defaultCam,
        status: 'COMPLETED',
        productionNotes: `Trade: ${v.trade || entry.trade} | Topic: ${v.title}`,
        createdAt: v.createdAt || entry.createdAt,
        updatedAt: v.updatedAt || entry.updatedAt,
      };
    });

    realSchedules.forEach((s: any) => {
      if (!shootingSchedules.some((sc: any) => sc.id === s.id || (sc.videoTitle && s.videoTitle && sc.videoTitle.trim() === s.videoTitle.trim()))) {
        shootingSchedules.push({
          ...s,
          cameraman: cleanCameraman(s.cameraman, defaultCam),
        });
      }
    });
  } else if (realSchedules.length > 0) {
    shootingSchedules = realSchedules.map((s: any) => ({
      ...s,
      cameraman: cleanCameraman(s.cameraman, defaultCam),
    }));
  } else {
    shootingSchedules = [{
      id: `shoot-${entry.id}`,
      workEntryId: entry.id,
      videoTitle: entry.topic,
      shootDate: entry.attendanceFrom || entry.createdAt,
      scheduledStart: entry.attendanceFrom || entry.createdAt,
      scheduledEnd: entry.attendanceTo || entry.createdAt,
      location: 'Studio - NIMI Chennai',
      cameraman: defaultCam,
      status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'PLANNED',
      productionNotes: `Trade: ${entry.trade}`,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }];
  }

  let videoEditorRecords: any[] = [];
  if (combinedVideos.length > 0) {
    videoEditorRecords = combinedVideos.map((v: any, idx: number) => {
      const title = v.title || entry.topic;
      const matchRec = realEditorRecs.find((e: any) =>
        e.id === v.id || e.id === `ed-${v.id}` || (e.assignedVideo && e.assignedVideo.trim() === title.trim()) ||
        (combinedVideos.length === 1 && realEditorRecs.length === 1)
      );
      if (matchRec) {
        const rawEnd = matchRec.editingEndDate 
          || (extractEndDate(matchRec.reviewComments) ? new Date(extractEndDate(matchRec.reviewComments)!) : defaultEndDate);
        return {
          ...matchRec,
          assignedVideo: matchRec.assignedVideo || title,
          editorName: cleanEditorName(matchRec.editorName, defaultEd),
          editingStartDate: matchRec.editingStartDate || defaultStartDate,
          editingEndDate: rawEnd,
          finalVideoFile: matchRec.finalVideoFile || v.videoLink || null,
          duration: matchRec.duration || v.duration || null,
        };
      }
      return {
        id: `ed-${v.id || idx}`,
        workEntryId: entry.id,
        assignedVideo: title,
        editorName: defaultEd,
        editingStartDate: defaultStartDate,
        editingEndDate: defaultEndDate,
        duration: v.duration || null,
        status: 'COMPLETED',
        finalVideoFile: v.videoLink || null,
        reviewComments: null,
        createdAt: v.createdAt || entry.createdAt,
        updatedAt: v.updatedAt || entry.updatedAt,
      };
    });

    realEditorRecs.forEach((e: any) => {
      if (!videoEditorRecords.some((vr: any) => vr.id === e.id || (vr.assignedVideo && e.assignedVideo && vr.assignedVideo.trim() === e.assignedVideo.trim()))) {
        const rawEnd = e.editingEndDate 
          || (extractEndDate(e.reviewComments) ? new Date(extractEndDate(e.reviewComments)!) : defaultEndDate);
        videoEditorRecords.push({
          ...e,
          editorName: cleanEditorName(e.editorName, defaultEd),
          editingStartDate: e.editingStartDate || defaultStartDate,
          editingEndDate: rawEnd,
        });
      }
    });
  } else if (realEditorRecs.length > 0) {
    videoEditorRecords = realEditorRecs.map((e: any) => {
      const rawEnd = e.editingEndDate 
        || (extractEndDate(e.reviewComments) ? new Date(extractEndDate(e.reviewComments)!) : defaultEndDate);
      return {
        ...e,
        editorName: cleanEditorName(e.editorName, defaultEd),
        editingStartDate: e.editingStartDate || defaultStartDate,
        editingEndDate: rawEnd,
      };
    });
  } else {
    videoEditorRecords = [{
      id: `ed-${entry.id}`,
      workEntryId: entry.id,
      assignedVideo: entry.topic,
      editorName: defaultEd,
      editingStartDate: defaultStartDate,
      editingEndDate: defaultEndDate,
      duration: null,
      status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'NOT_STARTED',
      finalVideoFile: null,
      reviewComments: null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }];
  }

  const finalVideoRecords = combinedVideos.length > 0
    ? combinedVideos.map((v: any, idx: number) => ({
        id: `final-${v.id || idx}`,
        workEntryId: entry.id,
        finalVideoStatus: 'APPROVED',
        finalVideoFile: v.videoLink || null,
        finalDuration: v.duration || null,
        telecastStatus: 'PENDING',
        telecastChannel: 'PM eVidya Channel',
        telecastDate: null,
        telecastEpisode: `EP-${entry.epicSequence}${combinedVideos.length > 1 ? `.${idx + 1}` : ''}`,
        createdAt: v.createdAt || entry.createdAt,
        updatedAt: v.updatedAt || entry.updatedAt,
      }))
    : [{
        id: `final-${entry.id}`,
        workEntryId: entry.id,
        finalVideoStatus: entry.status === 'COMPLETED' ? 'APPROVED' : 'PENDING',
        finalVideoFile: null,
        finalDuration: null,
        telecastStatus: 'PENDING',
        telecastChannel: 'PM eVidya Channel',
        telecastDate: null,
        telecastEpisode: `EP-${entry.epicSequence}`,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }];

  return {
    ...entry,
    shootingSchedules,
    videoEditorRecords,
    animationRecords: [],
    finalVideoRecords,
    videoLibraries: combinedVideos
  };
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

  const [smes, production, auditLogs, rawEpicEntries, allVideos] = await Promise.all([
    (role === 'CAMERAMAN' || role === 'EDITOR')
      ? Promise.resolve([])
      : prisma.sME.findMany({
          include: {
            workEntries: {
              include: {
                documents: true,
                payments: (role === 'ADMIN' || role === 'TEAM_MEMBER')
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),

    prisma.productionRecord.findMany({
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    }),

    (role === 'ADMIN' || role === 'TEAM_MEMBER')
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 1000
        })
      : Promise.resolve([]),

    prisma.sMEWorkEntry.findMany({
      where: epicFilter,
      include: {
        sme: true,
        documents: true,
        payments: (role === 'ADMIN' || role === 'TEAM_MEMBER'),
        videoLibraries: true,
        videoEditorRecords: true,
        shootingSchedules: true,
      },
      orderBy: { epicSequence: 'asc' }
    }),

    prisma.videoLibrary.findMany({
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const epicWorkEntries = (rawEpicEntries || []).map((e: any) => {
    const combinedVideos = matchVideosForEpic(e, allVideos);
    return buildEpicWorkflowRecords(e, combinedVideos);
  });

  return JSON.parse(JSON.stringify({ smes, production, auditLogs, epicWorkEntries }));
}

export async function getEpicCompleteHistory(workEntryId: string) {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  if (!authCheck.success) return { success: false, error: authCheck.error };
  const role = authCheck.role || 'VIEWER';
  const user = await getCurrentUser();
  
  try {
    const [rawWorkEntry, allVideos] = await Promise.all([
      prisma.sMEWorkEntry.findUnique({
        where: { id: workEntryId },
        include: {
          sme: true,
          documents: { orderBy: { createdAt: 'desc' } },
          payments: (role === 'ADMIN' || role === 'TEAM_MEMBER') ? { orderBy: { createdAt: 'desc' } } : false,
          videoLibraries: { orderBy: { createdAt: 'desc' } },
          videoEditorRecords: true,
          shootingSchedules: true,
        }
      }),
      prisma.videoLibrary.findMany({
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (!rawWorkEntry) return { success: false, error: 'Epic record not found.' };

    const combinedVideos = matchVideosForEpic(rawWorkEntry, allVideos);
    const workEntry = buildEpicWorkflowRecords(rawWorkEntry, combinedVideos);

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


