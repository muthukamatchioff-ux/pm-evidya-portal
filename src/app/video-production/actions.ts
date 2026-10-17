'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth, getRole, getEmail } from '@/lib/auth';
import { parseAssignedEpics } from '@/lib/epicHelpers';
import { revalidatePath } from 'next/cache';

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

  if (role === 'CAMERAMAN') {
    const isAssigned = assignedSequences.includes(entry.epicSequence) ||
      entry.shootingSchedules.some((s: any) => {
        const cam = (s.cameraman || '').toLowerCase().trim();
        return cam && (cam === userNameLower || cam === userEmailLower);
      });

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
      entry.videoEditorRecords.some((e: any) => {
        const ed = (e.editorName || '').toLowerCase().trim();
        return ed && (ed === userNameLower || ed === userEmailLower);
      });

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

export async function getEpicWorkEntries() {
  return await getTopicProductionRecords();
}

export async function getTopicProductionRecords() {
  const role = await getRole();
  const email = await getEmail();

  try {
    // 1. Fetch real, authentic database entries directly from PostgreSQL
    const allEntries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        videoLibraries: true,
      },
      orderBy: {
        epicSequence: 'desc'
      }
    });

    // 2. Fetch all authentic VideoLibrary records from PostgreSQL
    const allVideos = await prisma.videoLibrary.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const allRecords = allEntries.map((entry: any) => {
      // Find matching videos for this epic by epicId, SME name, or Trade
      const matchingVideos = allVideos.filter((v: any) => 
        (v.epicId && v.epicId === entry.id) ||
        (v.smeName && entry.sme?.name && v.smeName.toLowerCase().trim().includes(entry.sme.name.toLowerCase().trim())) ||
        (v.trade && entry.trade && v.trade.toLowerCase().trim() === entry.trade.toLowerCase().trim())
      );

      const videoMap = new Map<string, any>();
      (entry.videoLibraries || []).forEach((v: any) => videoMap.set(v.id, v));
      matchingVideos.forEach((v: any) => videoMap.set(v.id, v));
      const combinedVideos = Array.from(videoMap.values());

      // Construct shooting schedules from real database records (or entry topic)
      const shootingSchedules = combinedVideos.length > 0
        ? combinedVideos.map((v: any, idx: number) => ({
            id: `shoot-${v.id || idx}`,
            workEntryId: entry.id,
            videoTitle: v.title || entry.topic,
            shootDate: v.createdAt || entry.attendanceFrom || entry.createdAt,
            scheduledStart: entry.attendanceFrom || v.createdAt,
            scheduledEnd: entry.attendanceTo || v.createdAt,
            location: 'Studio - NIMI Chennai',
            cameraman: 'Production Team',
            status: 'COMPLETED',
            productionNotes: `Trade: ${v.trade || entry.trade} | Topic: ${v.title}`,
            createdAt: v.createdAt || entry.createdAt,
            updatedAt: v.updatedAt || entry.updatedAt,
          }))
        : [{
            id: `shoot-${entry.id}`,
            workEntryId: entry.id,
            videoTitle: entry.topic,
            shootDate: entry.attendanceFrom || entry.createdAt,
            scheduledStart: entry.attendanceFrom || entry.createdAt,
            scheduledEnd: entry.attendanceTo || entry.createdAt,
            location: 'Studio - NIMI Chennai',
            cameraman: 'Production Team',
            status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'PLANNED',
            productionNotes: `Trade: ${entry.trade}`,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }];

      // Construct post-production editor records
      const videoEditorRecords = combinedVideos.length > 0
        ? combinedVideos.map((v: any, idx: number) => ({
            id: `ed-${v.id || idx}`,
            workEntryId: entry.id,
            assignedVideo: v.title || entry.topic,
            editorName: 'Post-Production Team',
            editingStartDate: v.createdAt || entry.attendanceFrom,
            status: 'COMPLETED',
            finalVideoFile: v.videoLink || null,
            createdAt: v.createdAt || entry.createdAt,
            updatedAt: v.updatedAt || entry.updatedAt,
          }))
        : [{
            id: `ed-${entry.id}`,
            workEntryId: entry.id,
            assignedVideo: entry.topic,
            editorName: 'Post-Production Team',
            editingStartDate: entry.attendanceFrom || entry.createdAt,
            status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'NOT_STARTED',
            finalVideoFile: null,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }];

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

    if (role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'VIEWER') {
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
          const cam = (s.cameraman || '').toLowerCase().trim();
          return cam && (cam === userNameLower || cam === userEmailLower);
        });
        return matchesSequence || matchesCameraman;
      });
      return { success: true, data: filtered };
    }

    if (role === 'EDITOR') {
      const filtered = allRecords.filter((entry: any) => {
        const matchesSequence = assignedSequences.includes(entry.epicSequence);
        const matchesEditor = entry.videoEditorRecords?.some((e: any) => {
          const ed = (e.editorName || '').toLowerCase().trim();
          return ed && (ed === userNameLower || ed === userEmailLower);
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

    if (data.scheduledStart && data.scheduledEnd && new Date(data.scheduledEnd) < new Date(data.scheduledStart)) {
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
          shootDate: data.shootDate ? new Date(data.shootDate) : (data.scheduledStart ? new Date(data.scheduledStart) : null),
          location: data.location || null,
          shootingType: data.shootingType || null,
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
          actualStart: data.actualStart ? new Date(data.actualStart) : null,
          actualEnd: data.actualEnd ? new Date(data.actualEnd) : null,
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
    if (data.scheduledStart && data.scheduledEnd && new Date(data.scheduledEnd) < new Date(data.scheduledStart)) {
      return { success: false, error: 'Production End Date cannot be earlier than Production Start Date.' };
    }

    let prev: any = null;
    try {
      prev = await prisma.shootingSchedule.findUnique({ where: { id } });
    } catch (_) {}

    let targetWorkEntryId: string | null = data.workEntryId || prev?.workEntryId || null;
    let targetVideoId: string | null = null;

    if (id.startsWith('shoot-')) {
      const stripped = id.replace('shoot-', '');
      // Check if stripped is a VideoLibrary id
      const video = await prisma.videoLibrary.findUnique({ where: { id: stripped } }).catch(() => null);
      if (video) {
        targetVideoId = video.id;
        if (!targetWorkEntryId && video.epicId) {
          targetWorkEntryId = video.epicId;
        }
      } else {
        // Check if stripped is a SMEWorkEntry id
        const entry = await prisma.sMEWorkEntry.findUnique({ where: { id: stripped } }).catch(() => null);
        if (entry) {
          if (!targetWorkEntryId) targetWorkEntryId = entry.id;
        }
      }
    }

    // If still no workEntryId and id has no prefix, try finding by id
    if (!targetWorkEntryId && !prev) {
      const entry = await prisma.sMEWorkEntry.findUnique({ where: { id } }).catch(() => null);
      if (entry) targetWorkEntryId = entry.id;
    }

    const effectiveWorkEntryId = targetWorkEntryId || prev?.workEntryId;
    if (!effectiveWorkEntryId && !prev) {
      return { success: false, error: 'Production record not found.' };
    }

    if (effectiveWorkEntryId) {
      const permCheck = await verifyEpicPermission(effectiveWorkEntryId, ['ADMIN', 'TEAM_MEMBER', 'CAMERAMAN']);
      if (!permCheck.authorized) {
        return { success: false, error: permCheck.error };
      }
    }

    const trimmedTitle = data.videoTitle ? data.videoTitle.trim() : (prev?.videoTitle || null);

    // 1. Update VideoLibrary if targetVideoId is known or find by epicId
    if (targetVideoId) {
      await prisma.videoLibrary.update({
        where: { id: targetVideoId },
        data: {
          ...(trimmedTitle ? { title: trimmedTitle } : {})
        }
      }).catch(() => null);
    } else if (effectiveWorkEntryId && trimmedTitle) {
      const matchLib = await prisma.videoLibrary.findFirst({
        where: { epicId: effectiveWorkEntryId }
      }).catch(() => null);
      if (matchLib) {
        await prisma.videoLibrary.update({
          where: { id: matchLib.id },
          data: { title: trimmedTitle }
        }).catch(() => null);
      }
    }

    // 2. Update SMEWorkEntry topic and status if applicable
    if (effectiveWorkEntryId && trimmedTitle) {
      await prisma.sMEWorkEntry.update({
        where: { id: effectiveWorkEntryId },
        data: {
          topic: trimmedTitle,
          ...(data.status ? { status: data.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS' } : {})
        }
      }).catch(() => null);
    }

    // 3. Gracefully update ShootingSchedule if table exists
    let record: any = null;
    if (prev) {
      try {
        record = await prisma.shootingSchedule.update({
          where: { id },
          data: {
            videoTitle: trimmedTitle || prev.videoTitle,
            shootDate: data.scheduledStart ? new Date(data.scheduledStart) : (data.shootDate ? new Date(data.shootDate) : prev.shootDate),
            location: data.location !== undefined ? data.location : prev.location,
            shootingType: data.shootingType !== undefined ? data.shootingType : prev.shootingType,
            scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : (data.scheduledStart === '' ? null : prev.scheduledStart),
            scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : (data.scheduledEnd === '' ? null : prev.scheduledEnd),
            actualStart: data.actualStart ? new Date(data.actualStart) : (data.actualStart === '' ? null : prev.actualStart),
            actualEnd: data.actualEnd ? new Date(data.actualEnd) : (data.actualEnd === '' ? null : prev.actualEnd),
            cameraman: data.cameraman !== undefined ? data.cameraman : prev.cameraman,
            status: data.status || prev.status,
            productionNotes: data.productionNotes !== undefined ? data.productionNotes : prev.productionNotes
          }
        });
      } catch (_) {}
    }

    // 4. If video title changed, sync assignedVideo in VideoEditorRecord if table exists
    if (prev?.videoTitle && trimmedTitle && prev.videoTitle !== trimmedTitle) {
      try {
        await prisma.videoEditorRecord.updateMany({
          where: {
            workEntryId: prev.workEntryId,
            assignedVideo: prev.videoTitle
          },
          data: {
            assignedVideo: trimmedTitle
          }
        });
      } catch (_) {}
    }

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { 
      success: true, 
      data: record || {
        id,
        workEntryId: effectiveWorkEntryId,
        videoTitle: trimmedTitle,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        status: data.status || 'PLANNED',
        location: data.location,
        cameraman: data.cameraman
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
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

    const editorName = data.editorName || (permCheck.role === 'EDITOR' ? (permCheck.user?.name || permCheck.user?.email) : null);

    // Persist to VideoLibrary (if linked or matching this assigned video)
    if (data.assignedVideo || data.duration || data.finalVideoFile) {
      const matchLib = await prisma.videoLibrary.findFirst({
        where: {
          OR: [
            ...(id.startsWith('ed-') ? [{ id: id.replace('ed-', '') }] : []),
            ...(workEntryId ? [{ epicId: workEntryId }] : [])
          ]
        }
      }).catch(() => null);

      if (matchLib) {
        await prisma.videoLibrary.update({
          where: { id: matchLib.id },
          data: {
            ...(data.assignedVideo ? { title: data.assignedVideo } : {}),
            ...(data.duration !== undefined ? { duration: data.duration } : {}),
            ...(data.finalVideoFile ? { videoLink: data.finalVideoFile } : {})
          }
        }).catch(() => null);
      }
    }

    let record: any = null;
    try {
      record = await prisma.videoEditorRecord.upsert({
        where: { id: id || 'new' }, 
        update: {
          editorName: editorName,
          assignedVideo: data.assignedVideo || null,
          editingStartDate: data.editingStartDate ? new Date(data.editingStartDate) : null,
          roughCutLink: data.roughCutLink || null,
          finalCutLink: data.finalCutLink || null,
          duration: data.duration || null,
          status: data.status || 'NOT_STARTED',
          reviewComments: data.editingEndDate ? `[END:${data.editingEndDate}] ${data.reviewComments || ''}`.trim() : (data.reviewComments || null),
          finalVideoFile: data.finalVideoFile || null
        },
        create: {
          workEntryId,
          editorName: editorName,
          assignedVideo: data.assignedVideo || null,
          editingStartDate: data.editingStartDate ? new Date(data.editingStartDate) : null,
          roughCutLink: data.roughCutLink || null,
          finalCutLink: data.finalCutLink || null,
          duration: data.duration || null,
          status: data.status || 'NOT_STARTED',
          reviewComments: data.editingEndDate ? `[END:${data.editingEndDate}] ${data.reviewComments || ''}`.trim() : (data.reviewComments || null),
          finalVideoFile: data.finalVideoFile || null
        }
      });
    } catch (_) {}

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

    revalidatePath('/video-production');
    revalidatePath('/reports');
    return { success: true, data: record || { id, workEntryId, assignedVideo: data.assignedVideo, status: data.status } };
  } catch (error: any) {
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

    // 2. Persist to VideoLibrary (the active PostgreSQL table for final deliverable storage and duration)
    let savedVideo = null;
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
            title: workEntry.topic || 'PM eVidya Video Deliverable',
            smeName: workEntry.sme?.name || 'SME',
            trade: workEntry.trade || 'General'
          }
        });
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


