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
    let whereFilter: any = undefined;
    let user: any = null;
    let assignedSequences: number[] = [];
    let userNameLower = '';
    let userEmailLower = '';

    if (role === 'CAMERAMAN' || role === 'EDITOR') {
      if (!email) {
        return { success: false, error: 'Unauthorized: User session required.' };
      }

      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, name: true, email: true, department: true }
      });

      if (!user) {
        return { success: false, error: 'User record not found.' };
      }

      assignedSequences = parseAssignedEpics(user.department);
      userNameLower = (user.name || '').toLowerCase().trim();
      userEmailLower = user.email.toLowerCase().trim();

      const names = [user.name, user.email].filter(Boolean) as string[];

      if (role === 'CAMERAMAN') {
        whereFilter = {
          OR: [
            ...(assignedSequences.length > 0 ? [{ epicSequence: { in: assignedSequences } }] : []),
            { shootingSchedules: { some: { cameraman: { in: names } } } }
          ]
        };
      } else if (role === 'EDITOR') {
        whereFilter = {
          OR: [
            ...(assignedSequences.length > 0 ? [{ epicSequence: { in: assignedSequences } }] : []),
            { videoEditorRecords: { some: { editorName: { in: names } } } }
          ]
        };
      }
    }

    let allRecords: any[] = [];
    try {
      allRecords = await prisma.sMEWorkEntry.findMany({
        where: whereFilter,
        include: {
          sme: {
            select: {
              id: true,
              name: true,
              designation: true,
              institute: true,
            }
          },
          shootingSchedules: true,
          videoEditorRecords: true,
          animationRecords: true,
          finalVideoRecords: true,
          videoLibraries: true,
        },
        orderBy: {
          epicSequence: 'desc'
        }
      });
    } catch (err: any) {
      console.warn('Extended video relations unavailable, falling back to core relations:', err?.message);
      const coreRecords = await prisma.sMEWorkEntry.findMany({
        where: whereFilter,
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
          payments: true,
        },
        orderBy: {
          epicSequence: 'desc'
        }
      });
      allRecords = coreRecords.map((r: any) => ({
        ...r,
        shootingSchedules: [],
        videoEditorRecords: [],
        animationRecords: [],
        finalVideoRecords: [],
        videoLibraries: []
      }));
    }

    if (role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'VIEWER') {
      return { success: true, data: allRecords };
    }

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
    if (!data.videoTitle) {
      return { success: false, error: 'Video Title is required.' };
    }

    if (data.scheduledStart && data.scheduledEnd && new Date(data.scheduledEnd) < new Date(data.scheduledStart)) {
      return { success: false, error: 'Production End Date cannot be earlier than Production Start Date.' };
    }

    const cameramanName = data.cameraman || (permCheck.role === 'CAMERAMAN' ? (permCheck.user?.name || permCheck.user?.email) : null);

    const newRecord = await prisma.shootingSchedule.create({
      data: {
        workEntryId,
        videoTitle: data.videoTitle,
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

    // Automatically ensure this video title flows into Stage 2 (Post-Production)
    const existingEditorRecord = await prisma.videoEditorRecord.findFirst({
      where: {
        workEntryId,
        assignedVideo: data.videoTitle
      }
    });

    if (!existingEditorRecord) {
      await prisma.videoEditorRecord.create({
        data: {
          workEntryId,
          assignedVideo: data.videoTitle,
          status: 'NOT_STARTED'
        }
      });
    }

    revalidatePath('/video-production');
    return { success: true, data: newRecord };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShootingSchedule(id: string, data: any) {
  const prev = await prisma.shootingSchedule.findUnique({ where: { id } });
  if (!prev) {
    return { success: false, error: 'Production record not found.' };
  }

  const permCheck = await verifyEpicPermission(prev.workEntryId, ['ADMIN', 'TEAM_MEMBER', 'CAMERAMAN']);
  if (!permCheck.authorized) {
    return { success: false, error: permCheck.error };
  }

  try {
    if (data.scheduledStart && data.scheduledEnd && new Date(data.scheduledEnd) < new Date(data.scheduledStart)) {
      return { success: false, error: 'Production End Date cannot be earlier than Production Start Date.' };
    }

    const trimmedTitle = data.videoTitle ? data.videoTitle.trim() : prev.videoTitle;

    const record = await prisma.shootingSchedule.update({
      where: { id },
      data: {
        videoTitle: trimmedTitle,
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

    // If video title changed, sync assignedVideo in VideoEditorRecord
    if (prev.videoTitle && trimmedTitle && prev.videoTitle !== trimmedTitle) {
      await prisma.videoEditorRecord.updateMany({
        where: {
          workEntryId: prev.workEntryId,
          assignedVideo: prev.videoTitle
        },
        data: {
          assignedVideo: trimmedTitle
        }
      });
    }

    revalidatePath('/video-production');
    return { success: true, data: record };
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

    const record = await prisma.videoEditorRecord.upsert({
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

    // Once post-production is marked COMPLETED, automatically advance/ensure FinalVideoRecord exists
    if (data.status === 'COMPLETED') {
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
    }

    revalidatePath('/video-production');
    return { success: true, data: record };
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
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFinalVideoRecord(id: string, data: any, workEntryId: string) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    const record = await prisma.finalVideoRecord.upsert({
      where: { workEntryId }, // Unique constraint
      update: {
        finalVideoStatus: data.finalVideoStatus || 'PENDING',
        finalVideoFile: data.finalVideoFile || null,
        finalDuration: data.finalDuration || null,
        finalApproval: data.finalApproval || null,
        approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,
        remarks: data.remarks || null,
        telecastChannel: data.telecastChannel || null,
        telecastDate: data.telecastDate ? new Date(data.telecastDate) : null,
        telecastEpisode: data.telecastEpisode || null,
        telecastStatus: data.telecastStatus || 'PENDING',
        telecastRemarks: data.telecastRemarks || null
      },
      create: {
        workEntryId,
        finalVideoStatus: data.finalVideoStatus || 'PENDING',
        finalVideoFile: data.finalVideoFile || null,
        finalDuration: data.finalDuration || null,
        finalApproval: data.finalApproval || null,
        approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,
        remarks: data.remarks || null,
        telecastChannel: data.telecastChannel || null,
        telecastDate: data.telecastDate ? new Date(data.telecastDate) : null,
        telecastEpisode: data.telecastEpisode || null,
        telecastStatus: data.telecastStatus || 'PENDING',
        telecastRemarks: data.telecastRemarks || null
      }
    });

    revalidatePath('/video-production');
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteShootingSchedule(id: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  try {
    await prisma.shootingSchedule.delete({
      where: { id }
    });
    revalidatePath('/video-production');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteVideoEditorRecord(id: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  try {
    await prisma.videoEditorRecord.delete({
      where: { id }
    });
    revalidatePath('/video-production');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFinalVideoRecord(id: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  try {
    await prisma.finalVideoRecord.delete({
      where: { id }
    });
    revalidatePath('/video-production');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

