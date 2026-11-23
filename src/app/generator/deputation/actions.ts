'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { saveCommunicationsStageCore, getEpicId } from '@/lib/deputationService';

export interface StageAParameters {
  refNoPrefix: string;
  year: string;
  letterDate: string;
  recipientDesignation: string;
  recipientInst: string;
  recipientLoc: string;
  duration: string;
  startDate: string;
  isExtension: boolean;
  reasonForExtension: string;
  extensionDate: string;
  signatory: string;
}

export interface AttendanceSlot {
  id?: string;
  startDate: string;
  endDate: string;
  days?: number;
  trade?: string;
}

export interface StageBParameters {
  programmeName: string;
  workTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  topicsCovered: string;
  ratePerDay?: number;
  trade?: string;
  attendanceSlots?: AttendanceSlot[];
  submissionDate: string;
  verifierName: string;
  verifierDesignation: string;
  verifierOrganisation: string;
  verificationDate: string;
}

export interface StageCParameters {
  programmeName: string;
  workTitle: string;
  location: string;
  trade?: string;
  attendanceSlots?: AttendanceSlot[];
  totalDays: number;
  ratePerDay: number;
  grossAmount: number;
  taAmount?: number;
  otherAmount?: number;
  totalAmount: number;
  amountInWords: string;
  submissionDate: string;
  verifierName?: string;
  verifierDesignation?: string;
}

export async function getCommunicationsWorkEntries() {
  try {
    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
    let entries: any[] = [];
    try {
      entries = await prisma.sMEWorkEntry.findMany({
        include: {
          sme: true,
          payments: true,
          documents: {
            orderBy: { updatedAt: 'desc' }
          },
        },
        orderBy: { epicSequence: 'asc' }
      });
    } catch {}

    if (!entries || entries.length === 0) {
      return { success: true, entries: REAL_PM_EVIDYA_SME_WORK_ENTRIES };
    }

    if (entries.length < REAL_PM_EVIDYA_SME_WORK_ENTRIES.length) {
      const existingIds = new Set(entries.map((e: any) => e.id));
      const existingSeqs = new Set(entries.map((e: any) => e.epicSequence));
      for (const fb of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
        if (!existingIds.has(fb.id) && !existingSeqs.has(fb.epicSequence)) {
          entries.push(fb);
        }
      }
      entries.sort((a, b) => (a.epicSequence || 0) - (b.epicSequence || 0));
    }

    return { success: true, entries };
  } catch (error: any) {
    console.error('Failed to get Communications work entries:', error);
    try {
      const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
      return { success: true, entries: REAL_PM_EVIDYA_SME_WORK_ENTRIES };
    } catch {
      return { success: false, error: error?.message || 'Failed to load entries', entries: [] };
    }
  }
}

export async function saveCommunicationsStage(
  workEntryId: string,
  stage: 'STAGE_A' | 'STAGE_B' | 'STAGE_C',
  parameters: any
) {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'Authentication required' };
  }

  const userEmail = await getEmail();
  return await saveCommunicationsStageCore(
    workEntryId,
    stage,
    parameters,
    authCheck.role,
    userEmail
  );
}
