'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth, getRole, getEmail } from '@/lib/auth';
import { parseAssignedEpics, matchesCameramanName, matchesEditorName } from '@/lib/epicHelpers';
import { syncTrackerIfNeeded } from '@/lib/syncTracker';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';

function safeRevalidate() {
  try {
    revalidatePath('/video-production');
    revalidatePath('/reports');
  } catch (_) {}
}

async function verifyEpicPermission(workEntryId: string, allowedRoles: string[]): Promise<{ authorized: boolean; error?: string; role?: string; user?: any }> {
  const role = await getRole();
  if (role === 'VISITOR') {
    return { authorized: false, error: 'Authentication required.' };
  }
  if (!allowedRoles.includes(role)) {
    return { authorized: false, error: `Forbidden: Role ${role} is not authorized for this operation.` };
  }

  // Admin and Team Member have full access across all Epics
  if (role === 'ADMIN' || role === 'TEAM_MEMBER') {
    return { authorized: true, role };
  }

  const email = await getEmail();
  if (!email) {
    return { authorized: false, error: 'User email not found in session.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });
  if (!user) {
    return { authorized: false, error: 'User profile not found.' };
  }

  const entry = await prisma.sMEWorkEntry.findUnique({
    where: { id: workEntryId },
    include: { shootingSchedules: true, videoEditorRecords: true }
  });
  if (!entry) {
    return { authorized: false, error: 'Epic record not found.' };
  }

  const assignedSequences = parseAssignedEpics(user.department);
  const userNameLower = (user.name || '').toLowerCase().trim();
  const userEmailLower = user.email.toLowerCase().trim();

  const isNameOrEmailMatch = (fieldVal?: string | null) => {
    if (!fieldVal) return false;
    const lower = fieldVal.toLowerCase().trim();
    if (lower === userNameLower || lower === userEmailLower) return true;
    if (lower.includes(userNameLower) || lower.includes(userEmailLower)) return true;
    const parts = lower.split(',').map(p => p.trim());
    return parts.includes(userNameLower) || parts.includes(userEmailLower);
  };

  if (role === 'CAMERAMAN') {
    const isAssigned = assignedSequences.includes(entry.epicSequence) ||
      entry.shootingSchedules.some((s: any) => isNameOrEmailMatch(s.cameraman));

    if (!isAssigned) {
      return { 
        authorized: false, 
        error: `Unauthorized: EPIC-${entry.epicSequence} is not assigned to your Camera Man account. Contact Admin for assignment.` 
      };
    }
    return { authorized: true, role, user };
  }

  if (role === 'EDITOR') {
    const isAssigned = assignedSequences.includes(entry.epicSequence) ||
      entry.videoEditorRecords.some((e: any) => isNameOrEmailMatch(e.editorName));

    if (!isAssigned) {
      return { 
        authorized: false, 
        error: `Unauthorized: EPIC-${entry.epicSequence} is not assigned to your Editor account. Contact Admin for assignment.` 
      };
    }
    return { authorized: true, role, user };
  }

  return { authorized: false, error: 'Forbidden.' };
}

function normalizeName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(mr|ms|mrs|smt|shri|dr)\.?\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function cleanCameraman(name?: string | null, fallbackName: string | null = null): string | null {
  if (!name) return fallbackName;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || lower === 'production team' || lower === 'production' || lower === 'team') {
    return fallbackName;
  }
  return trimmed;
}

function cleanEditorName(name?: string | null, fallbackName: string | null = null): string | null {
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

function safeParseDate(val: any): Date | null {
  if (!val || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
      const d = parseInt(dmy[1], 10);
      const m = parseInt(dmy[2], 10);
      const y = parseInt(dmy[3], 10);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymd) {
      const y = parseInt(ymd[1], 10);
      const m = parseInt(ymd[2], 10);
      const d = parseInt(ymd[3], 10);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof val === 'number') {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function getEpicWorkEntries() {
  return await getTopicProductionRecords();
}

export async function getTopicProductionRecords() {
  const role = await getRole();
  const email = await getEmail();

  try {
    // Concurrently fetch work entries, videos, and staff mapping in a single parallel batch
    let [allEntries, allVideos, cameramen, editors] = await Promise.all([
      prisma.sMEWorkEntry.findMany({
        include: {
          sme: true,
          videoLibraries: true,
          videoEditorRecords: true,
          shootingSchedules: true,
        },
        orderBy: {
          epicSequence: 'asc'
        }
      }),
      prisma.videoLibrary.findMany({
        orderBy: { id: 'asc' }
      }),
      prisma.user.findMany({
        where: { role: 'CAMERAMAN', status: 'ACTIVE' },
        select: { name: true, email: true, department: true }
      }).catch(() => []),
      prisma.user.findMany({
        where: { role: 'EDITOR', status: 'ACTIVE' },
        select: { name: true, email: true, department: true }
      }).catch(() => [])
    ]);

    // Self-healing: If live database is missing the 76 imported tracker records, synchronize now
    const trackerVids = allVideos.filter((v: any) => v.id.startsWith('VID-'));
    if (trackerVids.length < 76) {
      await syncTrackerIfNeeded(prisma, true);
      const [reEntries, reVideos] = await Promise.all([
        prisma.sMEWorkEntry.findMany({
          include: {
            sme: true,
            videoLibraries: true,
            videoEditorRecords: true,
            shootingSchedules: true,
          },
          orderBy: {
            epicSequence: 'asc'
          }
        }),
        prisma.videoLibrary.findMany({
          orderBy: { id: 'asc' }
        })
      ]);
      allEntries = reEntries;
      allVideos = reVideos;
    }

    const trackerSequences = [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 15, 16, 17];
    const trackerEntries = allEntries.filter((e: any) => {
      if (trackerSequences.includes(e.epicSequence)) return true;
      // Requirement 4: Eligible when required fields defined by workflow are complete
      const hasRequiredFields = e.trade && e.trade !== 'Not Specified' && e.topic && e.topic !== 'Not Specified' && e.sme;
      const hasProductionRecords = (e.videoLibraries && e.videoLibraries.length > 0) || 
                                  (e.shootingSchedules && e.shootingSchedules.length > 0) || 
                                  (e.videoEditorRecords && e.videoEditorRecords.length > 0);
      return Boolean(hasRequiredFields && hasProductionRecords);
    });

    const allRecords = trackerEntries.map((entry: any) => {
      const videoMap = new Map<string, any>();
      (entry.videoLibraries || []).forEach((v: any) => videoMap.set(v.id, v));
      allVideos.filter((v: any) => v.epicId === entry.id).forEach((v: any) => videoMap.set(v.id, v));
      const combinedVideos = Array.from(videoMap.values());

      const realSchedules: any[] = entry.shootingSchedules || [];
      const realEditorRecs: any[] = entry.videoEditorRecords || [];

      // Construct shooting schedules from real database records
      let shootingSchedules: any[] = [];
      if (combinedVideos.length > 0) {
        shootingSchedules = combinedVideos.map((v: any, idx: number) => {
          const title = v.title || entry.topic;
          const matchSched = realSchedules.find((s: any) => 
            s.id === v.id || s.id === `shoot-${v.id}` || 
            (s.videoTitle && title && s.videoTitle.trim().toLowerCase() === title.trim().toLowerCase())
          );
          if (matchSched) {
            return {
              ...matchSched,
              scheduledStart: matchSched.scheduledStart || null,
              scheduledEnd: matchSched.scheduledEnd || null,
              cameraman: matchSched.cameraman || null,
              month: matchSched.location || null
            };
          }
          return {
            id: `shoot-${v.id || idx}`,
            workEntryId: entry.id,
            videoTitle: title,
            shootDate: null,
            scheduledStart: null,
            scheduledEnd: null,
            location: null,
            month: null,
            cameraman: null,
            status: 'Yet to Shoot',
            productionNotes: `Trade: ${v.trade || entry.trade} | Topic: ${v.title}`,
            createdAt: v.createdAt || entry.createdAt,
            updatedAt: v.updatedAt || entry.updatedAt,
          };
        });

        // Add any standalone real schedules not matching combinedVideos
        realSchedules.forEach((s: any) => {
          if (!shootingSchedules.some((sc: any) => sc.id === s.id || (sc.videoTitle && s.videoTitle && sc.videoTitle.trim().toLowerCase() === s.videoTitle.trim().toLowerCase()))) {
            shootingSchedules.push({
              ...s,
              scheduledStart: s.scheduledStart || null,
              scheduledEnd: s.scheduledEnd || null,
              cameraman: s.cameraman || null,
              month: s.location || null
            });
          }
        });
      } else if (realSchedules.length > 0) {
        shootingSchedules = realSchedules.map((s: any) => ({
          ...s,
          scheduledStart: s.scheduledStart || null,
          scheduledEnd: s.scheduledEnd || null,
          cameraman: s.cameraman || null,
          month: s.location || null
        }));
      } else {
        shootingSchedules = [{
          id: `shoot-${entry.id}`,
          workEntryId: entry.id,
          videoTitle: entry.topic,
          shootDate: null,
          scheduledStart: null,
          scheduledEnd: null,
          location: null,
          month: null,
          cameraman: null,
          status: 'Yet to Shoot',
          productionNotes: `Trade: ${entry.trade}`,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }];
      }

      // Construct post-production editor records
      let videoEditorRecords: any[] = [];
      if (combinedVideos.length > 0) {
        videoEditorRecords = combinedVideos.map((v: any, idx: number) => {
          const title = v.title || entry.topic;
          const matchRec = realEditorRecs.find((e: any) =>
            e.id === v.id || e.id === `ed-${v.id}` || (e.assignedVideo && e.assignedVideo.trim() === title.trim()) ||
            (combinedVideos.length === 1 && realEditorRecs.length === 1)
          );

          if (matchRec) {
            return {
              ...matchRec,
              assignedVideo: matchRec.assignedVideo || title,
              editorName: matchRec.editorName || null,
              editingStartDate: matchRec.editingStartDate || null,
              editingEndDate: matchRec.editingEndDate || null,
              finalVideoFile: matchRec.finalVideoFile || v.videoLink || null,
              duration: matchRec.duration || v.duration || null,
              status: matchRec.status || 'Pending'
            };
          }
          return {
            id: `ed-${v.id || idx}`,
            workEntryId: entry.id,
            assignedVideo: title,
            editorName: null,
            editingStartDate: null,
            editingEndDate: null,
            duration: v.duration || null,
            status: 'Pending',
            finalVideoFile: v.videoLink || null,
            reviewComments: null,
            createdAt: v.createdAt || entry.createdAt,
            updatedAt: v.updatedAt || entry.updatedAt,
          };
        });

        // Add any standalone real editor records not matching combinedVideos
        realEditorRecs.forEach((e: any) => {
          if (!videoEditorRecords.some((vr: any) => vr.id === e.id || (vr.assignedVideo && e.assignedVideo && vr.assignedVideo.trim() === e.assignedVideo.trim()))) {
            videoEditorRecords.push({
              ...e,
              editorName: e.editorName || null,
              editingStartDate: e.editingStartDate || null,
              editingEndDate: e.editingEndDate || null,
            });
          }
        });
      } else if (realEditorRecs.length > 0) {
        videoEditorRecords = realEditorRecs.map((e: any) => ({
          ...e,
          editorName: e.editorName || null,
          editingStartDate: e.editingStartDate || null,
          editingEndDate: e.editingEndDate || null,
        }));
      } else {
        videoEditorRecords = [{
          id: `ed-${entry.id}`,
          workEntryId: entry.id,
          assignedVideo: entry.topic,
          editorName: null,
          editingStartDate: null,
          editingEndDate: null,
          duration: null,
          status: 'Pending',
          finalVideoFile: null,
          reviewComments: null,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }];
      }

      // Construct final video records
      const finalVideoRecords = combinedVideos.length > 0
        ? [{
            id: `final-${entry.id}`,
            workEntryId: entry.id,
            finalVideoStatus: 'APPROVED',
            finalVideoFile: combinedVideos[0].videoLink || null,
            finalDuration: combinedVideos[0].duration || null,
            telecastStatus: 'PENDING',
            telecastChannel: 'PM eVidya Channel',
            telecastDate: null,
            telecastEpisode: `EP-${entry.epicSequence}`,
            createdAt: combinedVideos[0].createdAt || entry.createdAt,
            updatedAt: combinedVideos[0].updatedAt || entry.updatedAt,
          }]
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
        videoLibraries: combinedVideos,
        shootingSchedules,
        videoEditorRecords,
        animationRecords: [],
        finalVideoRecords,
      };
    });

    if (role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'VIEWER' || role === 'HIGHER_OFFICIAL_VIEWER') {
      return { success: true, data: allRecords };
    }

    if (!email) {
      return { success: false, error: 'Unauthorized: User session required.' };
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return { success: false, error: 'User record not found.' };
    }

    const assignedSequences = parseAssignedEpics(user.department);
    const userNameLower = (user.name || '').toLowerCase().trim();
    const userEmailLower = user.email.toLowerCase().trim();

    if (role === 'CAMERAMAN') {
      const filtered = allRecords.filter((entry: any) => {
        const matchesSequence = assignedSequences.includes(entry.epicSequence);
        const matchesCameraman = entry.shootingSchedules?.some((s: any) => {
          return matchesCameramanName(s.cameraman, user);
        });
        return matchesSequence || matchesCameraman;
      });
      return { success: true, data: filtered };
    }

    if (role === 'EDITOR') {
      const filtered = allRecords.filter((entry: any) => {
        const matchesSequence = assignedSequences.includes(entry.epicSequence);
        const matchesEditor = entry.videoEditorRecords?.some((e: any) => {
          return matchesEditorName(e.editorName, user);
        });
        return matchesSequence || matchesEditor;
      });
      return { success: true, data: filtered };
    }

    return { success: true, data: allRecords };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createShootingSchedule(workEntryId: string, data: any) {
  const permCheck = await verifyEpicPermission(workEntryId, ['ADMIN', 'TEAM_MEMBER', 'CAMERAMAN']);
  if (!permCheck.authorized) {
    return { success: false, error: permCheck.error };
  }

  try {
    if (!data.videoTitle || !data.videoTitle.trim()) {
      return { success: false, error: 'Video Title is required.' };
    }

    const schedStart = safeParseDate(data.scheduledStart);
    const schedEnd = safeParseDate(data.scheduledEnd);
    if (schedStart && schedEnd && schedEnd < schedStart) {
      return { success: false, error: 'Production End Date cannot be earlier than Production Start Date.' };
    }

    const cameramanName = data.cameraman || (permCheck.role === 'CAMERAMAN' ? (permCheck.user?.name || permCheck.user?.email) : null);
    const trimmedTitle = data.videoTitle.trim();

    // 1. Persist new video into VideoLibrary (authoritative PostgreSQL table)
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: workEntryId },
      include: { sme: true }
    });

    let newVideoLib: any = null;
    try {
      newVideoLib = await prisma.videoLibrary.create({
        data: {
          epicId: workEntryId,
          title: trimmedTitle,
          smeName: workEntry?.sme?.name || 'SME',
          trade: workEntry?.trade || 'General',
          videoLink: '',
          duration: null
        }
      });
    } catch (_) {}

    // 2. Gracefully create ShootingSchedule if table exists in database
    let newRecord: any = null;
    try {
      newRecord = await prisma.shootingSchedule.create({
        data: {
          workEntryId,
          videoTitle: trimmedTitle,
          shootDate: safeParseDate(data.shootDate || data.scheduledStart),
          location: data.location || null,
          shootingType: data.shootingType || null,
          scheduledStart: schedStart,
          scheduledEnd: schedEnd,
          actualStart: safeParseDate(data.actualStart),
          actualEnd: safeParseDate(data.actualEnd),
          cameraman: cameramanName,
          status: data.status || 'PLANNED',
          productionNotes: data.productionNotes || null
        }
      });
    } catch (_) {}

    // 3. Gracefully create VideoEditorRecord if table exists in database
    try {
      const existingEditorRecord = await prisma.videoEditorRecord.findFirst({
        where: {
          workEntryId,
          assignedVideo: trimmedTitle
        }
      });

      if (!existingEditorRecord) {
        await prisma.videoEditorRecord.create({
          data: {
            workEntryId,
            assignedVideo: trimmedTitle,
            status: 'NOT_STARTED'
          }
        });
      }
    } catch (_) {}

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { 
      success: true, 
      data: newRecord || {
        id: `shoot-${newVideoLib?.id || workEntryId}`,
        workEntryId,
        videoTitle: trimmedTitle,
        status: data.status || 'PLANNED'
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShootingSchedule(id: string, data: any) {
  try {
    const schedStartVal = safeParseDate(data.scheduledStart);
    const schedEndVal = safeParseDate(data.scheduledEnd);
    const shootDateVal = safeParseDate(data.scheduledStart || data.shootDate);
    const actualStartVal = safeParseDate(data.actualStart);
    const actualEndVal = safeParseDate(data.actualEnd);

    if (schedStartVal && schedEndVal && schedEndVal < schedStartVal) {
      return { success: false, error: 'Production End Date cannot be earlier than Production Start Date.' };
    }

    let prev: any = null;
    if (id) {
      try {
        prev = await prisma.shootingSchedule.findUnique({ where: { id } });
      } catch (_) {}
    }

    let targetWorkEntryId: string | null = data.workEntryId || prev?.workEntryId || null;
    let targetVideoId: string | null = null;
    let strippedId: string | null = null;

    if (id && id.startsWith('shoot-')) {
      strippedId = id.replace('shoot-', '');
      // Check if stripped is a VideoLibrary id
      const video = await prisma.videoLibrary.findUnique({ where: { id: strippedId } }).catch(() => null);
      if (video) {
        targetVideoId = video.id;
        if (!targetWorkEntryId && video.epicId) {
          targetWorkEntryId = video.epicId;
        }
      } else {
        // Check if stripped is a SMEWorkEntry id
        const entry = await prisma.sMEWorkEntry.findUnique({ where: { id: strippedId } }).catch(() => null);
        if (entry) {
          if (!targetWorkEntryId) targetWorkEntryId = entry.id;
        } else {
          // Check if stripped was an existing ShootingSchedule id
          const s = await prisma.shootingSchedule.findUnique({ where: { id: strippedId } }).catch(() => null);
          if (s) {
            prev = s;
            if (!targetWorkEntryId) targetWorkEntryId = s.workEntryId;
          }
        }
      }
    }

    // If still no workEntryId and id has no prefix, try finding by id
    if (!targetWorkEntryId && !prev && id) {
      const entry = await prisma.sMEWorkEntry.findUnique({ where: { id } }).catch(() => null);
      if (entry) targetWorkEntryId = entry.id;
    }

    const effectiveWorkEntryId = targetWorkEntryId || prev?.workEntryId;
    if (!effectiveWorkEntryId && !prev) {
      return { success: false, error: 'Production record not found: Epic ID could not be identified.' };
    }

    if (effectiveWorkEntryId) {
      const permCheck = await verifyEpicPermission(effectiveWorkEntryId, ['ADMIN', 'TEAM_MEMBER', 'CAMERAMAN']);
      if (!permCheck.authorized) {
        return { success: false, error: permCheck.error };
      }
    }

    const trimmedTitle = data.videoTitle ? data.videoTitle.trim() : (prev?.videoTitle || null);
    const rawCam = data.cameraman !== undefined ? data.cameraman : prev?.cameraman;
    const finalCam = cleanCameraman(rawCam);

    // 1. Sync VideoLibrary (both title and ensure epicId is linked)
    if (targetVideoId) {
      await prisma.videoLibrary.update({
        where: { id: targetVideoId },
        data: {
          ...(trimmedTitle ? { title: trimmedTitle } : {}),
          ...(effectiveWorkEntryId ? { epicId: effectiveWorkEntryId } : {})
        }
      }).catch(() => null);
    } else if (effectiveWorkEntryId && trimmedTitle) {
      const matchLib = await prisma.videoLibrary.findFirst({
        where: {
          OR: [
            { epicId: effectiveWorkEntryId },
            ...(prev?.videoTitle ? [{ title: prev.videoTitle }] : []),
            { title: trimmedTitle }
          ]
        }
      }).catch(() => null);
      if (matchLib) {
        await prisma.videoLibrary.update({
          where: { id: matchLib.id },
          data: {
            title: trimmedTitle,
            ...(effectiveWorkEntryId ? { epicId: effectiveWorkEntryId } : {})
          }
        }).catch(() => null);
      }
    }

    // 2. Sync SMEWorkEntry status without modifying authentic master topic
    if (effectiveWorkEntryId && data.status) {
      await prisma.sMEWorkEntry.update({
        where: { id: effectiveWorkEntryId },
        data: {
          status: data.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'
        }
      }).catch(() => null);
    }

    // 3. Gracefully update or create ShootingSchedule
    let record: any = null;
    let existingShoot: any = null;

    if (prev) {
      record = await prisma.shootingSchedule.update({
        where: { id: prev.id },
        data: {
          videoTitle: trimmedTitle || prev.videoTitle,
          shootDate: shootDateVal || prev.shootDate,
          location: data.location !== undefined ? data.location : prev.location,
          shootingType: data.shootingType !== undefined ? data.shootingType : prev.shootingType,
          scheduledStart: schedStartVal !== undefined ? schedStartVal : prev.scheduledStart,
          scheduledEnd: schedEndVal !== undefined ? schedEndVal : prev.scheduledEnd,
          actualStart: actualStartVal !== undefined ? actualStartVal : prev.actualStart,
          actualEnd: actualEndVal !== undefined ? actualEndVal : prev.actualEnd,
          cameraman: finalCam,
          status: data.status || prev.status,
          productionNotes: data.productionNotes !== undefined ? data.productionNotes : prev.productionNotes
        }
      }).catch((e: any) => {
        console.error('[updateShootingSchedule] update error:', e);
        return null;
      });
    } else if (effectiveWorkEntryId) {
      // Find existing ShootingSchedule under this Epic:
      // Try matching by previous title, or new title, or if strippedId matches a schedule
      existingShoot = await prisma.shootingSchedule.findFirst({
        where: {
          workEntryId: effectiveWorkEntryId,
          OR: [
            ...(strippedId ? [{ id: strippedId }] : []),
            ...(trimmedTitle ? [{ videoTitle: { equals: trimmedTitle, mode: 'insensitive' as const } }] : [])
          ]
        }
      }).catch(() => null);

      if (existingShoot) {
        record = await prisma.shootingSchedule.update({
          where: { id: existingShoot.id },
          data: {
            videoTitle: trimmedTitle || existingShoot.videoTitle,
            shootDate: shootDateVal || existingShoot.shootDate,
            location: data.location !== undefined ? data.location : existingShoot.location,
            shootingType: data.shootingType !== undefined ? data.shootingType : existingShoot.shootingType,
            scheduledStart: schedStartVal !== undefined ? schedStartVal : existingShoot.scheduledStart,
            scheduledEnd: schedEndVal !== undefined ? schedEndVal : existingShoot.scheduledEnd,
            actualStart: actualStartVal !== undefined ? actualStartVal : existingShoot.actualStart,
            actualEnd: actualEndVal !== undefined ? actualEndVal : existingShoot.actualEnd,
            cameraman: finalCam !== undefined ? finalCam : existingShoot.cameraman,
            status: data.status || existingShoot.status,
            productionNotes: data.productionNotes !== undefined ? data.productionNotes : existingShoot.productionNotes
          }
        }).catch((e: any) => {
          console.error('[updateShootingSchedule] update existing error:', e);
          return null;
        });
      } else {
        record = await prisma.shootingSchedule.create({
          data: {
            workEntryId: effectiveWorkEntryId,
            videoTitle: trimmedTitle,
            shootDate: shootDateVal,
            location: data.location || null,
            shootingType: data.shootingType || null,
            scheduledStart: schedStartVal,
            scheduledEnd: schedEndVal,
            actualStart: actualStartVal,
            actualEnd: actualEndVal,
            cameraman: finalCam,
            status: data.status || 'PLANNED',
            productionNotes: data.productionNotes || null
          }
        }).catch((e: any) => {
          console.error('[updateShootingSchedule] create error:', e);
          return null;
        });
      }
    }

    if (!record) {
      record = {
        id: id && !id.startsWith('shoot-') ? id : (existingShoot?.id || `shoot-${Date.now()}`),
        workEntryId: effectiveWorkEntryId,
        videoTitle: trimmedTitle,
        shootDate: shootDateVal,
        location: data.location !== undefined ? data.location : prev?.location,
        shootingType: data.shootingType !== undefined ? data.shootingType : prev?.shootingType,
        scheduledStart: schedStartVal !== undefined ? schedStartVal : prev?.scheduledStart,
        scheduledEnd: schedEndVal !== undefined ? schedEndVal : prev?.scheduledEnd,
        actualStart: actualStartVal !== undefined ? actualStartVal : prev?.actualStart,
        actualEnd: actualEndVal !== undefined ? actualEndVal : prev?.actualEnd,
        cameraman: finalCam,
        status: data.status || prev?.status || 'PLANNED',
        productionNotes: data.productionNotes !== undefined ? data.productionNotes : prev?.productionNotes,
        createdAt: prev?.createdAt || new Date(),
        updatedAt: new Date()
      };
    }

    // 4. Sync VideoEditorRecord if title changed
    if (prev?.videoTitle && trimmedTitle && prev.videoTitle !== trimmedTitle) {
      try {
        await prisma.videoEditorRecord.updateMany({
          where: {
            workEntryId: effectiveWorkEntryId,
            assignedVideo: prev.videoTitle
          },
          data: {
            assignedVideo: trimmedTitle
          }
        });
      } catch (_) {}
    }

    // 5. Persistent Audit Logging with Mandatory Change Reason
    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_SHOOTING_SCHEDULE',
      entity: 'SHOOTING_SCHEDULE',
      entityId: record?.id || id,
      userEmail,
      previousData: prev ? JSON.stringify({
        scheduledStart: prev.scheduledStart,
        scheduledEnd: prev.scheduledEnd,
        cameraman: prev.cameraman,
        status: prev.status,
        videoTitle: prev.videoTitle
      }) : null,
      newData: JSON.stringify({
        scheduledStart: schedStartVal,
        scheduledEnd: schedEndVal,
        cameraman: finalCam,
        status: data.status || prev?.status,
        videoTitle: trimmedTitle,
        changeReason: (data.changeReason || 'Updated via Video Production Tracker').trim()
      })
    });

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { 
      success: true, 
      data: record
    };
  } catch (error: any) {
    console.error('Error in updateShootingSchedule:', error);
    return { success: false, error: error.message || 'Database update failed.' };
  }
}

export async function updateVideoEditorRecord(id: string, data: any, workEntryId: string) {
  const permCheck = await verifyEpicPermission(workEntryId, ['ADMIN', 'TEAM_MEMBER', 'EDITOR']);
  if (!permCheck.authorized) {
    return { success: false, error: permCheck.error };
  }

  try {
    if (data.editingStartDate && data.editingEndDate && new Date(data.editingEndDate) < new Date(data.editingStartDate)) {
      return { success: false, error: 'Post-Production End Date cannot be earlier than Start Date.' };
    }

    const editorName = cleanEditorName(data.editorName || (permCheck.role === 'EDITOR' ? (permCheck.user?.name || permCheck.user?.email) : null));
    const trimmedVideo = (data.assignedVideo || '').trim();

    // Persist to VideoLibrary (if linked or matching this assigned video)
    if (trimmedVideo || data.duration || data.finalVideoFile) {
      let matchLib: any = null;
      if (id && id.startsWith('ed-')) {
        const stripped = id.replace('ed-', '');
        matchLib = await prisma.videoLibrary.findUnique({ where: { id: stripped } }).catch(() => null);
      }
      if (!matchLib && trimmedVideo && workEntryId) {
        matchLib = await prisma.videoLibrary.findFirst({
          where: {
            epicId: workEntryId,
            title: { equals: trimmedVideo, mode: 'insensitive' }
          }
        }).catch(() => null);
      }
      if (!matchLib && trimmedVideo) {
        matchLib = await prisma.videoLibrary.findFirst({
          where: { title: { equals: trimmedVideo, mode: 'insensitive' } }
        }).catch(() => null);
      }
      if (!matchLib && workEntryId) {
        const epicVideos = await prisma.videoLibrary.findMany({ where: { epicId: workEntryId } }).catch(() => []);
        if (epicVideos.length === 1) {
          matchLib = epicVideos[0];
        }
      }

      if (matchLib) {
        await prisma.videoLibrary.update({
          where: { id: matchLib.id },
          data: {
            ...(trimmedVideo ? { title: trimmedVideo } : {}),
            ...(data.duration !== undefined ? { duration: data.duration } : {}),
            ...(data.finalVideoFile ? { videoLink: data.finalVideoFile } : {}),
            ...(workEntryId && !matchLib.epicId ? { epicId: workEntryId } : {})
          }
        }).catch(() => null);
      }
    }

    // Look up existing VideoEditorRecord
    let existingRecord: any = null;
    if (id) {
      existingRecord = await prisma.videoEditorRecord.findUnique({
        where: { id }
      }).catch(() => null);
    }
    if (!existingRecord && id && id.startsWith('ed-')) {
      const stripped = id.replace('ed-', '');
      existingRecord = await prisma.videoEditorRecord.findUnique({
        where: { id: stripped }
      }).catch(() => null);
    }
    if (!existingRecord && workEntryId && trimmedVideo) {
      existingRecord = await prisma.videoEditorRecord.findFirst({
        where: {
          workEntryId,
          assignedVideo: trimmedVideo
        }
      }).catch(() => null);
    }

    const commentsWithEnd = data.editingEndDate 
      ? `[END:${data.editingEndDate}] ${data.reviewComments || ''}`.trim() 
      : (data.reviewComments || null);

    const recordData = {
      editorName: editorName,
      assignedVideo: trimmedVideo || null,
      editingStartDate: data.editingStartDate ? new Date(data.editingStartDate) : null,
      editingEndDate: data.editingEndDate ? new Date(data.editingEndDate) : null,
      roughCutLink: data.roughCutLink || null,
      finalCutLink: data.finalCutLink || null,
      duration: data.duration || null,
      status: data.status || 'NOT_STARTED',
      reviewComments: commentsWithEnd,
      finalVideoFile: data.finalVideoFile || null
    };

    let record: any = null;
    if (existingRecord) {
      record = await prisma.videoEditorRecord.update({
        where: { id: existingRecord.id },
        data: recordData
      }).catch((e: any) => {
        console.error('[updateVideoEditorRecord] update error:', e);
        return null;
      });
    } else {
      record = await prisma.videoEditorRecord.create({
        data: {
          ...(id && id.startsWith('ed-') && !/^ed-\d+$/.test(id) ? { id } : {}),
          workEntryId,
          ...recordData
        }
      }).catch((e: any) => {
        console.error('[updateVideoEditorRecord] create error:', e);
        return null;
      });
    }

    if (!record) {
      record = {
        id: id && !id.startsWith('ed-') ? id : (existingRecord?.id || `ed-${Date.now()}`),
        workEntryId,
        ...recordData,
        createdAt: existingRecord?.createdAt || new Date(),
        updatedAt: new Date()
      };
    }

    // Once post-production is marked COMPLETED, automatically advance/ensure FinalVideoRecord exists
    if (data.status === 'COMPLETED') {
      try {
        await prisma.finalVideoRecord.upsert({
          where: { workEntryId },
          update: {
            finalVideoStatus: 'APPROVED',
            finalVideoFile: data.finalVideoFile || data.finalCutLink || undefined,
            finalDuration: data.duration || undefined
          },
          create: {
            workEntryId,
            finalVideoStatus: 'APPROVED',
            finalVideoFile: data.finalVideoFile || data.finalCutLink || null,
            finalDuration: data.duration || null
          }
        });
      } catch (_) {}
    }

    // Persistent Audit Logging with Mandatory Change Reason
    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_VIDEO_EDITOR_RECORD',
      entity: 'VIDEO_EDITOR_RECORD',
      entityId: record?.id || id,
      userEmail,
      previousData: existingRecord ? JSON.stringify({
        editorName: existingRecord.editorName,
        editingStartDate: existingRecord.editingStartDate,
        editingEndDate: existingRecord.editingEndDate,
        status: existingRecord.status,
        assignedVideo: existingRecord.assignedVideo
      }) : null,
      newData: JSON.stringify({
        editorName: recordData.editorName,
        editingStartDate: recordData.editingStartDate,
        editingEndDate: recordData.editingEndDate,
        status: recordData.status,
        assignedVideo: recordData.assignedVideo,
        changeReason: (data.changeReason || 'Updated via Video Production Tracker').trim()
      })
    });

    safeRevalidate();
    return { success: true, data: record || { id, workEntryId, assignedVideo: trimmedVideo, status: data.status } };
  } catch (error: any) {
    console.error('Error updating VideoEditorRecord:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAnimationRecord(id: string, data: any, workEntryId: string) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    const record = await prisma.animationRecord.upsert({
      where: { id: id || 'new' },
      update: {
        animatorName: data.animatorName || null,
        assignedVideo: data.assignedVideo || null,
        animationStartDate: data.animationStartDate ? new Date(data.animationStartDate) : null,
        animationEndDate: data.animationEndDate ? new Date(data.animationEndDate) : null,
        status: data.status || 'NOT_STARTED',
        finalAnimationFile: data.finalAnimationFile || null
      },
      create: {
        workEntryId,
        animatorName: data.animatorName || null,
        assignedVideo: data.assignedVideo || null,
        animationStartDate: data.animationStartDate ? new Date(data.animationStartDate) : null,
        animationEndDate: data.animationEndDate ? new Date(data.animationEndDate) : null,
        status: data.status || 'NOT_STARTED',
        finalAnimationFile: data.finalAnimationFile || null
      }
    });

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFinalVideoRecord(id: string, data: any, workEntryId: string) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    // 1. Fetch work entry to verify and get SME/trade details
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: workEntryId },
      include: { sme: true, videoLibraries: true }
    });

    if (!workEntry) {
      return { success: false, error: 'Epic work entry not found.' };
    }

    // 2. Persist to VideoLibrary (canonical source for deliverable links and duration)
    let savedVideo = null;
    let targetLibId = data.videoId || data.videoLibraryId;
    if (!targetLibId && id && !id.startsWith('final-')) {
      targetLibId = id;
    }

    if (targetLibId) {
      savedVideo = await prisma.videoLibrary.update({
        where: { id: targetLibId },
        data: {
          videoLink: data.finalVideoFile || '',
          duration: data.finalDuration !== undefined ? data.finalDuration : undefined,
          ...(data.title ? { title: data.title } : {}),
          ...(workEntryId ? { epicId: workEntryId } : {})
        }
      }).catch(() => null);
    }

    if (!savedVideo && data.title) {
      const matchByTitle = await prisma.videoLibrary.findFirst({
        where: {
          epicId: workEntryId,
          title: { equals: data.title.trim(), mode: 'insensitive' }
        }
      }).catch(() => null);

      if (matchByTitle) {
        savedVideo = await prisma.videoLibrary.update({
          where: { id: matchByTitle.id },
          data: {
            videoLink: data.finalVideoFile || '',
            duration: data.finalDuration !== undefined ? data.finalDuration : undefined
          }
        }).catch(() => null);
      }
    }

    if (!savedVideo) {
      const existingForEpic = await prisma.videoLibrary.findFirst({
        where: { epicId: workEntryId }
      });

      if (existingForEpic) {
        savedVideo = await prisma.videoLibrary.update({
          where: { id: existingForEpic.id },
          data: {
            videoLink: data.finalVideoFile || existingForEpic.videoLink,
            duration: data.finalDuration !== undefined ? data.finalDuration : existingForEpic.duration
          }
        });
      } else {
        // Check if there is an existing library video for this SME or trade to link
        const existingMatch = await prisma.videoLibrary.findFirst({
          where: {
            OR: [
              { videoLink: data.finalVideoFile || undefined },
              { smeName: { contains: workEntry.sme?.name || '', mode: 'insensitive' } },
              { trade: { equals: workEntry.trade, mode: 'insensitive' } }
            ]
          }
        });

        if (existingMatch && !existingMatch.epicId) {
          savedVideo = await prisma.videoLibrary.update({
            where: { id: existingMatch.id },
            data: {
              epicId: workEntryId,
              videoLink: data.finalVideoFile || existingMatch.videoLink,
              duration: data.finalDuration !== undefined ? data.finalDuration : existingMatch.duration
            }
          });
        } else {
          savedVideo = await prisma.videoLibrary.create({
            data: {
              epicId: workEntryId,
              videoLink: data.finalVideoFile || '',
              duration: data.finalDuration || null,
              title: data.title || workEntry.topic || 'PM eVidya Video Deliverable',
              smeName: workEntry.sme?.name || 'SME',
              trade: workEntry.trade || 'General'
            }
          });
        }
      }
    }

    // 3. Gracefully update FinalVideoRecord if table exists in current database environment
    try {
      await prisma.finalVideoRecord.upsert({
        where: { workEntryId },
        update: {
          finalVideoStatus: data.finalVideoStatus || 'APPROVED',
          finalVideoFile: data.finalVideoFile || null,
          finalDuration: data.finalDuration || null,
        },
        create: {
          workEntryId,
          finalVideoStatus: data.finalVideoStatus || 'APPROVED',
          finalVideoFile: data.finalVideoFile || null,
          finalDuration: data.finalDuration || null,
        }
      });
    } catch (_) {
      // Safely ignore if table does not exist in production database
    }

    // Persistent Audit Logging with Mandatory Change Reason
    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_FINAL_VIDEO_DELIVERABLE',
      entity: 'FINAL_VIDEO_RECORD',
      entityId: targetLibId || id || workEntryId,
      userEmail,
      previousData: null,
      newData: JSON.stringify({
        workEntryId,
        videoId: targetLibId || id,
        finalVideoStatus: data.finalVideoStatus || 'APPROVED',
        finalVideoFile: data.finalVideoFile || savedVideo?.videoLink || null,
        finalDuration: data.finalDuration !== undefined ? data.finalDuration : savedVideo?.duration || null,
        title: data.title || savedVideo?.title,
        changeReason: (data.changeReason || 'Updated via Video Production Tracker').trim()
      })
    });

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return {
      success: true,
      data: {
        id: `final-${workEntryId}`,
        workEntryId,
        finalVideoStatus: data.finalVideoStatus || 'APPROVED',
        finalVideoFile: data.finalVideoFile || savedVideo?.videoLink || null,
        finalDuration: data.finalDuration !== undefined ? data.finalDuration : savedVideo?.duration || null
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteShootingSchedule(id: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  try {
    if (id.startsWith('shoot-')) {
      const stripped = id.replace('shoot-', '');
      await prisma.videoLibrary.deleteMany({
        where: { id: stripped }
      }).catch(() => null);
    }

    try {
      await prisma.shootingSchedule.delete({
        where: { id }
      });
    } catch (_) {}

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteVideoEditorRecord(id: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  try {
    if (id.startsWith('ed-')) {
      const stripped = id.replace('ed-', '');
      await prisma.videoLibrary.updateMany({
        where: { id: stripped },
        data: { epicId: null }
      }).catch(() => null);
    }

    try {
      await prisma.videoEditorRecord.delete({
        where: { id }
      });
    } catch (_) {}

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFinalVideoRecord(id: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  try {
    const workEntryId = id.startsWith('final-') ? id.replace('final-', '') : id;
    
    // Clear VideoLibrary link for this epic
    await prisma.videoLibrary.updateMany({
      where: { epicId: workEntryId },
      data: { epicId: null, videoLink: '', duration: null }
    });

    try {
      await prisma.finalVideoRecord.deleteMany({
        where: { OR: [{ id }, { workEntryId }] }
      });
    } catch (_) {}

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =========================================================================
// AUTOMATIC VIDEO DURATION DETECTION
// =========================================================================

function parseMp4DurationFromBuffer(buffer: Buffer): number | null {
  let offset = 0;
  while (offset < buffer.length - 8) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (size === 0) break;
    const atomSize = size === 1 ? Number(buffer.readBigUInt64BE(offset + 8)) : size;
    
    if (type === 'moov') {
      let subOffset = offset + (size === 1 ? 16 : 8);
      const subEnd = Math.min(offset + atomSize, buffer.length);
      while (subOffset < subEnd - 8) {
        const subSize = buffer.readUInt32BE(subOffset);
        const subType = buffer.toString('ascii', subOffset + 4, subOffset + 8);
        if (subSize <= 0) break;
        if (subType === 'mvhd') {
          const version = buffer.readUInt8(subOffset + 8);
          let timescale: number, duration: number;
          if (version === 0) {
            timescale = buffer.readUInt32BE(subOffset + 20);
            duration = buffer.readUInt32BE(subOffset + 24);
          } else if (version === 1) {
            timescale = buffer.readUInt32BE(subOffset + 28);
            duration = Number(buffer.readBigUInt64BE(subOffset + 32));
          } else {
            break;
          }
          if (timescale && duration && timescale > 0) {
            return duration / timescale;
          }
        }
        subOffset += subSize;
      }
    }
    offset += atomSize;
  }
  return null;
}

function formatDurationString(seconds: number): string {
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export async function detectVideoDuration(url: string): Promise<{ success: boolean; duration?: string; seconds?: number; error?: string }> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { success: false, error: 'Video URL is required.' };
  }

  const trimmedUrl = url.trim();

  // Validate URL protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { success: false, error: 'Only HTTP and HTTPS video URLs are supported.' };
    }
  } catch {
    return { success: false, error: 'Invalid video URL format.' };
  }

  try {
    // 1. Check if the URL already exists with verified duration in VideoLibrary
    const existingLib = await prisma.videoLibrary.findFirst({
      where: {
        videoLink: { equals: trimmedUrl, mode: 'insensitive' },
        duration: { not: null }
      }
    });

    if (existingLib && existingLib.duration && existingLib.duration.trim() !== '' && existingLib.duration !== '-') {
      return {
        success: true,
        duration: existingLib.duration.trim()
      };
    }

    // 2. Fetch partial media header via HTTP Range request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(trimmedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PM-eVidya-Portal/1.0',
        'Range': 'bytes=0-1048576',
        'Accept': '*/*'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok || response.status === 206) {
      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      const mp4DurationSec = parseMp4DurationFromBuffer(buffer);
      if (mp4DurationSec && mp4DurationSec > 0 && isFinite(mp4DurationSec)) {
        return {
          success: true,
          duration: formatDurationString(mp4DurationSec),
          seconds: mp4DurationSec
        };
      }
    }

    // If stream probing did not yield duration, return without guessing
    return {
      success: false,
      error: 'Could not auto-detect video duration from this source. Please enter duration manually.'
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Video analysis timed out. The storage server did not respond in time.'
      };
    }
    return {
      success: false,
      error: 'Could not access the video file. Please check link permissions or enter duration manually.'
    };
  }
}

// =========================================================================
// PHASE 4: ADMIN ASSIGNMENT & PERSISTENT AUDIT HISTORY
// =========================================================================

export async function getAuthorizedStaff() {
  const role = await getRole();
  if (role === 'VISITOR') {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    const cameramen = await prisma.user.findMany({
      where: { role: 'CAMERAMAN', status: 'ACTIVE' },
      select: { id: true, name: true, email: true, department: true }
    });

    const editors = await prisma.user.findMany({
      where: { role: 'EDITOR', status: 'ACTIVE' },
      select: { id: true, name: true, email: true, department: true }
    });

    // Ensure known authorized staff accounts are accounted for
    const knownCameramen = [
      { id: 'cam-antony', name: 'Antony Alcander', email: 'antony.alcander@gmail.com', role: 'CAMERAMAN' },
      { id: 'cam-parasuraman', name: 'Parasuraman', email: 'parasuraman.cam@nimi.org', role: 'CAMERAMAN' },
      { id: 'cam-antony-parasuraman', name: 'Antony Parasuraman', email: 'antony.parasuraman@nimi.org', role: 'CAMERAMAN' }
    ];

    const knownEditors = [
      { id: 'ed-hassan-antony', name: 'Hassan & Antony', email: 'hassan.antony@nimi.org', role: 'EDITOR' },
      { id: 'ed-hassan', name: 'Hassan', email: 'hassan@nimi.org', role: 'EDITOR' },
      { id: 'ed-bala', name: 'Bala', email: 'bala@nimi.org', role: 'EDITOR' },
      { id: 'ed-ramaswamy', name: 'Ramaswamy', email: 'ramaswamy@nimi.org', role: 'EDITOR' },
      { id: 'ed-parandhaman', name: 'Parandhaman', email: 'parandhaman@nimi.org', role: 'EDITOR' },
      { id: 'ed-suganthan', name: 'Suganthan', email: 'suganthan@nimi.org', role: 'EDITOR' },
      { id: 'ed-manikandan', name: 'Manikandan', email: 'manikandan@nimi.org', role: 'EDITOR' },
      { id: 'ed-manikandan-suganthan', name: 'Manikandan, Suganthan', email: 'manikandan.suganthan@nimi.org', role: 'EDITOR' },
      { id: 'ed-postprod', name: 'Post-Production Team', email: 'postprod@nimi.org', role: 'EDITOR' }
    ];

    const mergedCameramen = [...cameramen];
    knownCameramen.forEach(kc => {
      if (!mergedCameramen.some(c => (c.name || '').toLowerCase() === kc.name.toLowerCase() || c.email?.toLowerCase() === kc.email.toLowerCase())) {
        mergedCameramen.push(kc as any);
      }
    });

    const mergedEditors = [...editors];
    knownEditors.forEach(ke => {
      if (!mergedEditors.some(e => (e.name || '').toLowerCase() === ke.name.toLowerCase() || e.email?.toLowerCase() === ke.email.toLowerCase())) {
        mergedEditors.push(ke as any);
      }
    });

    return {
      success: true,
      data: {
        cameramen: mergedCameramen,
        editors: mergedEditors
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignProductionPersonnel(params: {
  workEntryId: string;
  videoId?: string;
  cameramanName?: string;
  cameramanEmail?: string;
  cameramanNames?: string[];
  cameramanEmails?: string[];
  editorName?: string;
  editorEmail?: string;
  editorNames?: string[];
  editorEmails?: string[];
  changeReason: string;
}) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  const email = await getEmail();

  if (!params.changeReason || params.changeReason.trim().length < 5) {
    return { success: false, error: 'A mandatory change reason (min 5 characters) is required for audit history compliance.' };
  }

  if (!params.workEntryId) {
    return { success: false, error: 'Valid EPIC ID is required.' };
  }

  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.workEntryId },
      include: { shootingSchedules: true, videoEditorRecords: true, videoLibraries: true }
    });

    if (!workEntry) {
      return { success: false, error: 'EPIC ID record not found in database.' };
    }

    const previousSnapshot = {
      epicSequence: workEntry.epicSequence,
      cameramen: workEntry.shootingSchedules.map((s: any) => ({ id: s.id, cameraman: s.cameraman, title: s.videoTitle })),
      editors: workEntry.videoEditorRecords.map((e: any) => ({ id: e.id, editor: e.editorName, title: e.assignedVideo }))
    };

    // Determine target lists for Cameramen
    let camNamesList: string[] = [];
    if (params.cameramanNames && Array.isArray(params.cameramanNames) && params.cameramanNames.length > 0) {
      camNamesList = params.cameramanNames.filter(Boolean);
    } else if (params.cameramanName && params.cameramanName.trim()) {
      camNamesList = params.cameramanName.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Determine target lists for Editors
    let edNamesList: string[] = [];
    if (params.editorNames && Array.isArray(params.editorNames) && params.editorNames.length > 0) {
      edNamesList = params.editorNames.filter(Boolean);
    } else if (params.editorName && params.editorName.trim()) {
      edNamesList = params.editorName.split(',').map(s => s.trim()).filter(Boolean);
    }

    const finalCamString = camNamesList.join(', ');
    const finalEdString = edNamesList.join(', ');

    // 1. Update Cameraman on ShootingSchedule
    if (camNamesList.length > 0) {
      if (params.videoId && params.videoId !== 'ALL') {
        const matchingSchedule = workEntry.shootingSchedules.find((s: any) => 
          s.id === params.videoId || 
          s.id === `shoot-${params.videoId}` ||
          (params.videoId && workEntry.videoLibraries.some((vl: any) => vl.id === params.videoId && vl.title === s.videoTitle))
        );

        if (matchingSchedule) {
          await prisma.shootingSchedule.update({
            where: { id: matchingSchedule.id },
            data: { cameraman: finalCamString }
          });
        } else {
          await prisma.shootingSchedule.create({
            data: {
              workEntryId: params.workEntryId,
              cameraman: finalCamString,
              status: 'PLANNED',
              videoTitle: workEntry.videoLibraries.find((vl: any) => vl.id === params.videoId)?.title || workEntry.topic
            }
          }).catch(() => null);
        }
      } else {
        await prisma.shootingSchedule.updateMany({
          where: { workEntryId: params.workEntryId },
          data: { cameraman: finalCamString }
        });
      }

      // Sync EPIC access for all assigned Cameramen accounts
      const camUsers = await prisma.user.findMany({ where: { role: 'CAMERAMAN' } });
      const targetCamEmails = (params.cameramanEmails || []).map(e => e.toLowerCase().trim());
      const targetCamNames = camNamesList.map(n => n.toLowerCase().trim());

      for (const camUser of camUsers) {
        const uEmail = (camUser.email || '').toLowerCase().trim();
        const uName = (camUser.name || '').toLowerCase().trim();
        const isTarget = targetCamEmails.includes(uEmail) || targetCamNames.includes(uName);

        if (isTarget) {
          const currentEpics = parseAssignedEpics(camUser.department);
          if (!currentEpics.includes(workEntry.epicSequence)) {
            const updatedEpics = [...currentEpics, workEntry.epicSequence].sort((a: number, b: number) => a - b);
            await prisma.user.update({
              where: { id: camUser.id },
              data: { department: `[${updatedEpics.join(',')}]` }
            }).catch(() => null);
          }
        }
      }
    }

    // 2. Update Editor on VideoEditorRecord
    if (edNamesList.length > 0) {
      if (params.videoId && params.videoId !== 'ALL') {
        const matchingEditor = workEntry.videoEditorRecords.find((e: any) => 
          e.id === params.videoId || 
          e.id === `ed-${params.videoId}` ||
          (params.videoId && workEntry.videoLibraries.some((vl: any) => vl.id === params.videoId && vl.title === e.assignedVideo))
        );

        if (matchingEditor) {
          await prisma.videoEditorRecord.update({
            where: { id: matchingEditor.id },
            data: { editorName: finalEdString }
          });
        } else {
          await prisma.videoEditorRecord.create({
            data: {
              workEntryId: params.workEntryId,
              editorName: finalEdString,
              status: 'NOT_STARTED',
              assignedVideo: workEntry.videoLibraries.find((vl: any) => vl.id === params.videoId)?.title || workEntry.topic
            }
          }).catch(() => null);
        }
      } else {
        await prisma.videoEditorRecord.updateMany({
          where: { workEntryId: params.workEntryId },
          data: { editorName: finalEdString }
        });
      }

      // Sync EPIC access for all assigned Editor accounts
      const edUsers = await prisma.user.findMany({ where: { role: 'EDITOR' } });
      const targetEdEmails = (params.editorEmails || []).map(e => e.toLowerCase().trim());
      const targetEdNames = edNamesList.map(n => n.toLowerCase().trim());

      for (const edUser of edUsers) {
        const uEmail = (edUser.email || '').toLowerCase().trim();
        const uName = (edUser.name || '').toLowerCase().trim();
        const isTarget = targetEdEmails.includes(uEmail) || targetEdNames.includes(uName);

        if (isTarget) {
          const currentEpics = parseAssignedEpics(edUser.department);
          if (!currentEpics.includes(workEntry.epicSequence)) {
            const updatedEpics = [...currentEpics, workEntry.epicSequence].sort((a: number, b: number) => a - b);
            await prisma.user.update({
              where: { id: edUser.id },
              data: { department: `[${updatedEpics.join(',')}]` }
            }).catch(() => null);
          }
        }
      }
    }

    // 3. Persistent Audit Logging
    await logAudit({
      action: 'ASSIGN_PRODUCTION_WORK',
      entity: 'VIDEO_PRODUCTION_ASSIGNMENT',
      entityId: params.videoId || params.workEntryId,
      userEmail: email,
      previousData: JSON.stringify(previousSnapshot),
      newData: JSON.stringify({
        epicSequence: workEntry.epicSequence,
        workEntryId: params.workEntryId,
        videoId: params.videoId || 'ALL_VIDEOS',
        assignedCameramen: camNamesList,
        assignedEditors: edNamesList,
        changeReason: params.changeReason.trim()
      })
    });

    safeRevalidate();
    return {
      success: true,
      message: `Successfully assigned personnel for EPIC-${workEntry.epicSequence}.`
    };
  } catch (error: any) {
    console.error('Error in assignProductionPersonnel:', error);
    return { success: false, error: error.message };
  }
}

export async function getProductionAuditLogs(workEntryId?: string) {
  const role = await getRole();
  if (role !== 'ADMIN' && role !== 'TEAM_MEMBER') {
    return { success: false, error: 'Unauthorized: Admin or Team Member role required to view audit logs.' };
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: { in: ['VIDEO_PRODUCTION', 'SHOOTING_SCHEDULE', 'VIDEO_EDITOR_RECORD', 'VIDEO_PRODUCTION_ASSIGNMENT', 'FINAL_VIDEO_RECORD'] },
        ...(workEntryId ? { entityId: workEntryId } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user: { select: { name: true, email: true, role: true } }
      }
    });

    return {
      success: true,
      data: logs
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProductionRowDetails(params: {
  workEntryId: string;
  videoId?: string;
  // Cameraman Portion
  cameramanName?: string;
  shootingStartDate?: string | null;
  shootingEndDate?: string | null;
  shootingStatus?: string;
  shootingNotes?: string | null;
  // Editor Portion
  editorName?: string;
  editingStartDate?: string | null;
  editingEndDate?: string | null;
  editingStatus?: string;
  reviewComments?: string | null;
  // Deliverable
  videoTitle?: string;
  duration?: string | null;
  finalVideoLink?: string | null;
  // Audit compliance
  changeReason: string;
}) {
  const role = await getRole();
  const email = await getEmail();
  if (role === 'VISITOR' || !email) {
    return { success: false, error: 'Authentication required.' };
  }

  if (!params.changeReason || params.changeReason.trim().length < 5) {
    return { success: false, error: 'A mandatory change reason (min 5 characters) is required for audit history compliance.' };
  }

  if (!params.workEntryId) {
    return { success: false, error: 'Valid EPIC ID is required.' };
  }

  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.workEntryId },
      include: { shootingSchedules: true, videoEditorRecords: true, videoLibraries: true }
    });

    if (!workEntry) {
      return { success: false, error: 'EPIC ID record not found in database.' };
    }

    const perm = await verifyEpicPermission(params.workEntryId, ['ADMIN', 'TEAM_MEMBER', 'CAMERAMAN', 'EDITOR']);
    if (!perm.authorized) {
      return { success: false, error: perm.error || 'Unauthorized: You are not authorized to update this EPIC record.' };
    }

    if (role === 'CAMERAMAN') {
      // Cameramen can only edit shooting fields
    } else if (role === 'EDITOR') {
      // Editors can only edit editing fields
    } else if (role !== 'ADMIN' && role !== 'TEAM_MEMBER') {
      return { success: false, error: 'Forbidden: Insufficient privileges.' };
    }

    const previousSnapshot = {
      workEntryId: workEntry.id,
      epicSequence: workEntry.epicSequence,
      shootingSchedules: workEntry.shootingSchedules,
      videoEditorRecords: workEntry.videoEditorRecords,
      videoLibraries: workEntry.videoLibraries
    };

    const schedStart = safeParseDate(params.shootingStartDate);
    const schedEnd = safeParseDate(params.shootingEndDate);
    const editStart = safeParseDate(params.editingStartDate);
    const editEnd = safeParseDate(params.editingEndDate);

    if (schedStart && schedEnd && schedEnd < schedStart) {
      return { success: false, error: 'Shooting End Date cannot precede Shooting Start Date.' };
    }
    if (editStart && editEnd && editEnd < editStart) {
      return { success: false, error: 'Editing End Date cannot precede Editing Start Date.' };
    }

    const cleanVidId = (params.videoId || '').replace(/^(shoot-|ed-)/, '');

    // 1. UPDATE OR CREATE SHOOTING SCHEDULE (Cameraman Portion)
    let matchingSchedule = workEntry.shootingSchedules.find((s: any) => 
      s.id === params.videoId || 
      s.id === cleanVidId ||
      s.id === `shoot-${cleanVidId}` ||
      (cleanVidId && workEntry.videoLibraries.some((vl: any) => (vl.id === cleanVidId || vl.id === params.videoId) && vl.title === s.videoTitle))
    );

    if (!matchingSchedule && cleanVidId) {
      const targetLib = workEntry.videoLibraries.find((vl: any) => vl.id === cleanVidId || vl.id === params.videoId);
      if (targetLib) {
        matchingSchedule = workEntry.shootingSchedules.find((s: any) => s.videoTitle === targetLib.title);
      }
    }

    if (!matchingSchedule && workEntry.shootingSchedules.length === 1 && (!params.videoId || params.videoId === 'ALL')) {
      matchingSchedule = workEntry.shootingSchedules[0];
    }

    const finalCam = params.cameramanName !== undefined 
      ? (params.cameramanName === '—' || params.cameramanName === '-' || params.cameramanName === '' ? null : params.cameramanName)
      : undefined;
    const finalEd = params.editorName !== undefined
      ? (params.editorName === '—' || params.editorName === '-' || params.editorName === '' ? null : params.editorName)
      : undefined;
    const finalLink = params.finalVideoLink !== undefined
      ? (params.finalVideoLink === '—' || params.finalVideoLink === '-' || params.finalVideoLink === '' ? null : params.finalVideoLink)
      : undefined;
    const finalDur = params.duration !== undefined
      ? (params.duration === '—' || params.duration === '-' || params.duration === '' ? null : params.duration)
      : undefined;

    if (matchingSchedule) {
      await prisma.shootingSchedule.update({
        where: { id: matchingSchedule.id },
        data: {
          ...(role === 'ADMIN' || role === 'TEAM_MEMBER' ? {
            ...(finalCam !== undefined ? { cameraman: finalCam } : {})
          } : {}),
          ...(params.shootingStartDate !== undefined && role !== 'EDITOR' ? { scheduledStart: schedStart } : {}),
          ...(params.shootingEndDate !== undefined && role !== 'EDITOR' ? { scheduledEnd: schedEnd } : {}),
          ...(params.shootingStatus && role !== 'EDITOR' ? { status: params.shootingStatus } : {}),
          ...(params.shootingNotes !== undefined && role !== 'EDITOR' ? { productionNotes: params.shootingNotes } : {}),
          ...(params.videoTitle && (role === 'ADMIN' || role === 'TEAM_MEMBER') ? { videoTitle: params.videoTitle } : {})
        }
      });
    } else if (role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'CAMERAMAN') {
      await prisma.shootingSchedule.create({
        data: {
          workEntryId: workEntry.id,
          cameraman: finalCam || null,
          scheduledStart: schedStart,
          scheduledEnd: schedEnd,
          status: params.shootingStatus || 'Completed',
          productionNotes: params.shootingNotes || null,
          videoTitle: params.videoTitle || workEntry.topic
        }
      });
    }

    // 2. UPDATE OR CREATE VIDEO EDITOR RECORD (Editor Portion)
    let matchingEditor = workEntry.videoEditorRecords.find((e: any) => 
      e.id === params.videoId || 
      e.id === cleanVidId ||
      e.id === `ed-${cleanVidId}` ||
      (cleanVidId && workEntry.videoLibraries.some((vl: any) => (vl.id === cleanVidId || vl.id === params.videoId) && vl.title === e.assignedVideo))
    );

    if (!matchingEditor && cleanVidId) {
      const targetLib = workEntry.videoLibraries.find((vl: any) => vl.id === cleanVidId || vl.id === params.videoId);
      if (targetLib) {
        matchingEditor = workEntry.videoEditorRecords.find((e: any) => e.assignedVideo === targetLib.title);
      }
    }

    if (!matchingEditor && workEntry.videoEditorRecords.length === 1 && (!params.videoId || params.videoId === 'ALL')) {
      matchingEditor = workEntry.videoEditorRecords[0];
    }

    if (matchingEditor) {
      await prisma.videoEditorRecord.update({
        where: { id: matchingEditor.id },
        data: {
          ...(role === 'ADMIN' || role === 'TEAM_MEMBER' ? {
            ...(finalEd !== undefined ? { editorName: finalEd } : {})
          } : {}),
          ...(params.editingStartDate !== undefined && role !== 'CAMERAMAN' ? { editingStartDate: editStart } : {}),
          ...(params.editingEndDate !== undefined && role !== 'CAMERAMAN' ? { editingEndDate: editEnd } : {}),
          ...(params.editingStatus && role !== 'CAMERAMAN' ? { status: params.editingStatus } : {}),
          ...(params.reviewComments !== undefined && role !== 'CAMERAMAN' ? { reviewComments: params.reviewComments } : {}),
          ...(finalDur !== undefined && role !== 'CAMERAMAN' ? { duration: finalDur } : {}),
          ...(finalLink !== undefined && role !== 'CAMERAMAN' ? { finalVideoFile: finalLink } : {}),
          ...(params.videoTitle && (role === 'ADMIN' || role === 'TEAM_MEMBER') ? { assignedVideo: params.videoTitle } : {})
        }
      });
    } else if (role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR') {
      await prisma.videoEditorRecord.create({
        data: {
          workEntryId: workEntry.id,
          editorName: finalEd || null,
          editingStartDate: editStart,
          editingEndDate: editEnd,
          status: params.editingStatus || 'Completed',
          duration: finalDur || null,
          finalVideoFile: finalLink || null,
          reviewComments: params.reviewComments || null,
          assignedVideo: params.videoTitle || workEntry.topic
        }
      });
    }

    // 3. UPDATE VIDEO LIBRARY (Deliverable & link)
    if (role !== 'CAMERAMAN') {
      let matchingLib = workEntry.videoLibraries.find((v: any) =>
        v.id === params.videoId ||
        v.id === cleanVidId ||
        (matchingEditor?.assignedVideo && v.title === matchingEditor.assignedVideo) ||
        (matchingSchedule?.videoTitle && v.title === matchingSchedule.videoTitle)
      );

      if (!matchingLib && workEntry.videoLibraries.length === 1 && (!params.videoId || params.videoId === 'ALL')) {
        matchingLib = workEntry.videoLibraries[0];
      }

      if (matchingLib) {
        await prisma.videoLibrary.update({
          where: { id: matchingLib.id },
          data: {
            ...(params.videoTitle ? { title: params.videoTitle } : {}),
            ...(finalDur !== undefined ? { duration: finalDur } : {}),
            ...(finalLink !== undefined ? { videoLink: finalLink } : {})
          }
        });
      } else if (finalLink && (role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR')) {
        await prisma.videoLibrary.create({
          data: {
            epicId: workEntry.id,
            smeName: workEntry.sme?.name || workEntry.topic || 'SME',
            trade: workEntry.trade || 'General',
            title: params.videoTitle || workEntry.topic,
            videoLink: finalLink,
            duration: finalDur || null
          }
        });
      }
    }

    // 4. LOG AUDIT ENTRY
    await logAudit({
      action: 'UPDATE_PRODUCTION_ROW',
      entity: 'VIDEO_PRODUCTION',
      entityId: params.videoId || workEntry.id,
      userEmail: email,
      previousData: JSON.stringify(previousSnapshot),
      newData: JSON.stringify({
        workEntryId: workEntry.id,
        videoId: params.videoId || 'DEFAULT',
        cameraman: params.cameramanName,
        shootingStartDate: params.shootingStartDate,
        shootingEndDate: params.shootingEndDate,
        shootingStatus: params.shootingStatus,
        editor: params.editorName,
        editingStartDate: params.editingStartDate,
        editingEndDate: params.editingEndDate,
        editingStatus: params.editingStatus,
        videoTitle: params.videoTitle,
        duration: params.duration,
        finalVideoLink: params.finalVideoLink,
        changeReason: params.changeReason
      })
    });

    safeRevalidate();

    return {
      success: true,
      message: `Production details and work assignment updated successfully for EPIC-${workEntry.epicSequence}.`
    };
  } catch (error: any) {
    console.error('Error in updateProductionRowDetails:', error);
    return { success: false, error: error.message };
  }
}

// =========================================================================
// CAMERAMAN PORTAL — DEDICATED SHOOTING STAGE ENTRY
// =========================================================================

export async function saveCameramanShootingEntry(params: {
  workEntryId: string;
  videoId: string;
  shootingStartDate?: string | null;
  shootingEndDate?: string | null;
  shootingStatus: string;
  shootingNotes?: string | null;
  isSubmit?: boolean;
}) {
  const perm = await verifyEpicPermission(params.workEntryId, ['ADMIN', 'TEAM_MEMBER', 'CAMERAMAN']);
  if (!perm.authorized) {
    return { success: false, error: perm.error || 'Unauthorized: You are not assigned to shoot this EPIC ID.' };
  }

  const email = await getEmail();
  const schedStart = safeParseDate(params.shootingStartDate);
  const schedEnd = safeParseDate(params.shootingEndDate);

  if (schedStart && schedEnd && schedEnd < schedStart) {
    return { success: false, error: 'Validation Error: Shooting End Date cannot precede Shooting Start Date.' };
  }

  const finalStatus = params.isSubmit ? 'Completed' : (params.shootingStatus || 'In Progress');

  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.workEntryId },
      include: { shootingSchedules: true, videoEditorRecords: true, videoLibraries: true }
    });

    if (!workEntry) {
      return { success: false, error: 'EPIC record not found in database.' };
    }

    // Match schedule
    const cleanVidId = (params.videoId || '').replace(/^(shoot-|ed-)/, '');
    let matchingSchedule = workEntry.shootingSchedules.find((s: any) =>
      s.id === params.videoId ||
      s.id === cleanVidId ||
      s.id === `shoot-${cleanVidId}` ||
      (cleanVidId && workEntry.videoLibraries.some((vl: any) => (vl.id === cleanVidId || vl.id === params.videoId) && vl.title === s.videoTitle))
    );

    if (!matchingSchedule) {
      const targetLib = workEntry.videoLibraries.find((vl: any) => vl.id === cleanVidId || vl.id === params.videoId);
      if (targetLib) {
        matchingSchedule = workEntry.shootingSchedules.find((s: any) => s.videoTitle === targetLib.title);
      }
    }

    if (!matchingSchedule && workEntry.shootingSchedules.length === 1 && (!params.videoId || params.videoId === 'ALL')) {
      matchingSchedule = workEntry.shootingSchedules[0];
    }

    if (matchingSchedule) {
      await prisma.shootingSchedule.update({
        where: { id: matchingSchedule.id },
        data: {
          scheduledStart: schedStart,
          scheduledEnd: schedEnd,
          status: finalStatus,
          productionNotes: params.shootingNotes !== undefined ? params.shootingNotes : matchingSchedule.productionNotes
        }
      });
    } else {
      await prisma.shootingSchedule.create({
        data: {
          workEntryId: workEntry.id,
          cameraman: perm.user?.name || 'Antony Alcander',
          scheduledStart: schedStart,
          scheduledEnd: schedEnd,
          status: finalStatus,
          productionNotes: params.shootingNotes || null,
          videoTitle: workEntry.videoLibraries.find((vl: any) => vl.id === params.videoId)?.title || workEntry.topic
        }
      });
    }

    // When submitted as Completed, automatically make it available in the assigned Editor's queue
    if (finalStatus === 'Completed') {
      const matchEd = workEntry.videoEditorRecords.find((e: any) =>
        e.id === params.videoId ||
        e.id === `ed-${params.videoId}` ||
        (params.videoId && workEntry.videoLibraries.some((vl: any) => vl.id === params.videoId && vl.title === e.assignedVideo))
      );
      if (matchEd) {
        if (matchEd.status === 'NOT_STARTED' || !matchEd.status) {
          await prisma.videoEditorRecord.update({
            where: { id: matchEd.id },
            data: { status: 'Pending' }
          });
        }
      } else {
        await prisma.videoEditorRecord.create({
          data: {
            workEntryId: workEntry.id,
            editorName: 'Hassan & Antony',
            status: 'Pending',
            assignedVideo: workEntry.videoLibraries.find((vl: any) => vl.id === params.videoId)?.title || workEntry.topic
          }
        }).catch(() => null);
      }
    }

    await logAudit({
      action: params.isSubmit ? 'SUBMIT_SHOOTING_COMPLETED' : 'SAVE_SHOOTING_DRAFT',
      entity: 'SHOOTING_SCHEDULE',
      entityId: params.videoId || workEntry.id,
      userEmail: email || 'cameraman@nimi.org',
      newData: JSON.stringify({
        workEntryId: workEntry.id,
        videoId: params.videoId,
        scheduledStart: params.shootingStartDate,
        scheduledEnd: params.shootingEndDate,
        status: finalStatus,
        productionNotes: params.shootingNotes
      })
    });

    safeRevalidate();
    return {
      success: true,
      message: params.isSubmit
        ? 'Shooting successfully submitted as Completed! Topic is now available in the Video Editor queue.'
        : 'Shooting draft saved successfully.'
    };
  } catch (error: any) {
    console.error('Error in saveCameramanShootingEntry:', error);
    return { success: false, error: error.message };
  }
}

// =========================================================================
// VIDEO EDITOR PORTAL — DEDICATED POST-PRODUCTION STAGE ENTRY
// =========================================================================

export async function saveEditorPostProductionEntry(params: {
  workEntryId: string;
  videoId: string;
  editingStartDate?: string | null;
  editingEndDate?: string | null;
  editingStatus: string;
  duration?: string | null;
  finalVideoLink?: string | null;
  reviewComments?: string | null;
  isSubmit?: boolean;
}) {
  const perm = await verifyEpicPermission(params.workEntryId, ['ADMIN', 'TEAM_MEMBER', 'EDITOR']);
  if (!perm.authorized) {
    return { success: false, error: perm.error || 'Unauthorized: You are not assigned to edit this EPIC ID.' };
  }

  const email = await getEmail();
  const editStart = safeParseDate(params.editingStartDate);
  const editEnd = safeParseDate(params.editingEndDate);

  if (editStart && editEnd && editEnd < editStart) {
    return { success: false, error: 'Validation Error: Editing End Date cannot precede Editing Start Date.' };
  }

  // URL validation if provided
  if (params.finalVideoLink && params.finalVideoLink.trim() !== '' && params.finalVideoLink !== '-') {
    const urlStr = params.finalVideoLink.trim();
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      return { success: false, error: 'Validation Error: Final Video Link must be a valid HTTP or HTTPS URL.' };
    }
  }

  const finalStatus = params.isSubmit ? 'Completed' : (params.editingStatus || 'In Progress');

  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.workEntryId },
      include: { shootingSchedules: true, videoEditorRecords: true, videoLibraries: true }
    });

    if (!workEntry) {
      return { success: false, error: 'EPIC record not found in database.' };
    }

    // Match editor record
    const cleanVidId = (params.videoId || '').replace(/^(ed-|shoot-)/, '');
    let matchingEditor = workEntry.videoEditorRecords.find((e: any) =>
      e.id === params.videoId ||
      e.id === cleanVidId ||
      e.id === `ed-${cleanVidId}` ||
      (cleanVidId && workEntry.videoLibraries.some((vl: any) => (vl.id === cleanVidId || vl.id === params.videoId) && vl.title === e.assignedVideo))
    );

    if (!matchingEditor) {
      const targetLib = workEntry.videoLibraries.find((vl: any) => vl.id === cleanVidId || vl.id === params.videoId);
      if (targetLib) {
        matchingEditor = workEntry.videoEditorRecords.find((e: any) => e.assignedVideo === targetLib.title);
      }
    }

    if (!matchingEditor && workEntry.videoEditorRecords.length === 1 && (!params.videoId || params.videoId === 'ALL')) {
      matchingEditor = workEntry.videoEditorRecords[0];
    }

    const effectiveLink = (params.finalVideoLink !== undefined && params.finalVideoLink && params.finalVideoLink.trim() !== '' && params.finalVideoLink !== '-')
      ? params.finalVideoLink.trim()
      : (matchingEditor?.finalVideoFile || null);

    const effectiveDuration = (params.duration !== undefined && params.duration && params.duration.trim() !== '' && params.duration !== '-')
      ? params.duration.trim()
      : (matchingEditor?.duration || null);

    if (matchingEditor) {
      await prisma.videoEditorRecord.update({
        where: { id: matchingEditor.id },
        data: {
          editingStartDate: editStart,
          editingEndDate: editEnd,
          status: finalStatus,
          duration: effectiveDuration !== null ? effectiveDuration : matchingEditor.duration,
          finalVideoFile: effectiveLink !== null ? effectiveLink : matchingEditor.finalVideoFile,
          reviewComments: params.reviewComments !== undefined ? params.reviewComments : matchingEditor.reviewComments
        }
      });
    } else {
      await prisma.videoEditorRecord.create({
        data: {
          workEntryId: workEntry.id,
          editorName: perm.user?.name || 'Hassan & Antony',
          editingStartDate: editStart,
          editingEndDate: editEnd,
          status: finalStatus,
          duration: effectiveDuration,
          finalVideoFile: effectiveLink,
          reviewComments: params.reviewComments || null,
          assignedVideo: workEntry.videoLibraries.find((vl: any) => vl.id === cleanVidId || vl.id === params.videoId)?.title || workEntry.topic
        }
      });
    }

    // Synchronize canonical VideoLibrary deliverable record so it reflects across Overall Tracker & Library
    let matchingLib = cleanVidId && cleanVidId !== 'ALL'
      ? workEntry.videoLibraries.find((v: any) => v.id === cleanVidId || v.id === params.videoId)
      : null;

    if (!matchingLib && matchingEditor?.assignedVideo) {
      matchingLib = workEntry.videoLibraries.find((v: any) => v.title === matchingEditor.assignedVideo);
    }

    if (!matchingLib && workEntry.videoLibraries.length === 1 && (!params.videoId || params.videoId === 'ALL')) {
      matchingLib = workEntry.videoLibraries[0];
    }

    if (matchingLib) {
      const libLinkToSave = effectiveLink || matchingLib.videoLink;
      const libDurToSave = effectiveDuration || matchingLib.duration;
      await prisma.videoLibrary.update({
        where: { id: matchingLib.id },
        data: {
          ...(libDurToSave ? { duration: libDurToSave } : {}),
          ...(libLinkToSave ? { videoLink: libLinkToSave } : {})
        }
      });
    } else if (params.finalVideoLink) {
      await prisma.videoLibrary.create({
        data: {
          epicId: workEntry.id,
          smeName: workEntry.sme?.name || workEntry.topic || 'SME',
          trade: workEntry.trade || 'General',
          title: workEntry.topic,
          videoLink: params.finalVideoLink,
          duration: params.duration || null
        }
      }).catch(() => null);
    }

    await logAudit({
      action: params.isSubmit ? 'SUBMIT_POST_PRODUCTION_COMPLETED' : 'SAVE_POST_PRODUCTION_DRAFT',
      entity: 'VIDEO_EDITOR_RECORD',
      entityId: params.videoId || workEntry.id,
      userEmail: email || 'editor@nimi.org',
      newData: JSON.stringify({
        workEntryId: workEntry.id,
        videoId: params.videoId,
        editingStartDate: params.editingStartDate,
        editingEndDate: params.editingEndDate,
        status: finalStatus,
        duration: params.duration,
        finalVideoLink: params.finalVideoLink,
        reviewComments: params.reviewComments
      })
    });

    safeRevalidate();
    return {
      success: true,
      message: params.isSubmit
        ? 'Post-production editing submitted as Completed! Deliverable is now live in the Overall Tracker and Video Library.'
        : 'Post-production editing draft saved successfully.'
    };
  } catch (error: any) {
    console.error('Error in saveEditorPostProductionEntry:', error);
    return { success: false, error: error.message };
  }
}
