'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getDiagnosticInfo() {
  try {
    const db: any = await prisma.$queryRaw`SELECT current_database() as db, current_schema() as schema`;
    const tables: any = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('SMEWorkEntry', 'ShootingSchedule', 'VideoEditorRecord', 'AnimationRecord', 'FinalVideoRecord')
    `;
    return { success: true, database: db[0]?.db, schema: db[0]?.schema, tables: tables.map((t: any) => t.tablename) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getEpicWorkEntries() {
  try {
    const workEntries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        shootingSchedules: true,
        videoEditorRecords: true,
        animationRecords: true,
        finalVideoRecords: true,
      },
      orderBy: {
        epicSequence: 'desc'
      }
    });
    return { success: true, data: workEntries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTopicProductionRecords() {
  try {
    const records = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        shootingSchedules: true,
        videoEditorRecords: true,
        animationRecords: true,
        finalVideoRecords: true,
      },
      orderBy: {
        epicSequence: 'desc'
      }
    });
    return { success: true, data: records };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createShootingSchedule(workEntryId: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    if (!data.videoTitle) {
      return { success: false, error: 'Video Title is required.' };
    }

    const newRecord = await prisma.shootingSchedule.create({
      data: {
        workEntryId,
        videoTitle: data.videoTitle,
        shootDate: data.shootDate ? new Date(data.shootDate) : null,
        location: data.location || null,
        shootingType: data.shootingType || null,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
        actualStart: data.actualStart ? new Date(data.actualStart) : null,
        actualEnd: data.actualEnd ? new Date(data.actualEnd) : null,
        cameraman: data.cameraman || null,
        status: data.status || 'PLANNED',
        productionNotes: data.productionNotes || null
      }
    });

    revalidatePath('/video-production');
    return { success: true, data: newRecord };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShootingSchedule(id: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    const record = await prisma.shootingSchedule.update({
      where: { id },
      data: {
        videoTitle: data.videoTitle || undefined,
        shootDate: data.shootDate ? new Date(data.shootDate) : null,
        location: data.location || null,
        shootingType: data.shootingType || null,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
        actualStart: data.actualStart ? new Date(data.actualStart) : null,
        actualEnd: data.actualEnd ? new Date(data.actualEnd) : null,
        cameraman: data.cameraman || null,
        status: data.status || 'PLANNED',
        productionNotes: data.productionNotes || null
      }
    });

    revalidatePath('/video-production');
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateVideoEditorRecord(id: string, data: any, workEntryId: string) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    const record = await prisma.videoEditorRecord.upsert({
      where: { id: id || 'new' }, 
      update: {
        editorName: data.editorName || null,
        assignedVideo: data.assignedVideo || null,
        editingStartDate: data.editingStartDate ? new Date(data.editingStartDate) : null,
        roughCutLink: data.roughCutLink || null,
        finalCutLink: data.finalCutLink || null,
        duration: data.duration || null,
        status: data.status || 'NOT_STARTED',
        reviewComments: data.reviewComments || null,
        finalVideoFile: data.finalVideoFile || null
      },
      create: {
        workEntryId,
        editorName: data.editorName || null,
        assignedVideo: data.assignedVideo || null,
        editingStartDate: data.editingStartDate ? new Date(data.editingStartDate) : null,
        roughCutLink: data.roughCutLink || null,
        finalCutLink: data.finalCutLink || null,
        duration: data.duration || null,
        status: data.status || 'NOT_STARTED',
        reviewComments: data.reviewComments || null,
        finalVideoFile: data.finalVideoFile || null
      }
    });

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
