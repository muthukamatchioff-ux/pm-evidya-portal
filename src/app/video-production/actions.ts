'use server';

import { PrismaClient } from '@prisma/client';
import { checkAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function getVideoProductionRecords() {
  try {
    const workEntries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        documents: true,
        topicRef: true,
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

export async function saveShootingSchedule(workEntryId: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;
  try {
    const record = await prisma.shootingSchedule.create({
      data: {
        ...data,
        workEntryId
      }
    });
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveVideoEditorRecord(workEntryId: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;
  try {
    const record = await prisma.videoEditorRecord.create({
      data: {
        ...data,
        workEntryId
      }
    });
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveAnimationRecord(workEntryId: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;
  try {
    const record = await prisma.animationRecord.create({
      data: {
        ...data,
        workEntryId
      }
    });
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveFinalVideoRecord(workEntryId: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;
  try {
    const existing = await prisma.finalVideoRecord.findUnique({
      where: { workEntryId }
    });
    let record;
    if (existing) {
      record = await prisma.finalVideoRecord.update({
        where: { workEntryId },
        data
      });
    } else {
      record = await prisma.finalVideoRecord.create({
        data: {
          ...data,
          workEntryId
        }
      });
    }
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
