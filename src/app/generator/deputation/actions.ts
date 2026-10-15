'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

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

export interface StageBParameters {
  programmeName: string;
  workTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  topicsCovered: string;
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
  totalDays: number;
  ratePerDay: number;
  grossAmount: number;
  taAmount: number;
  otherAmount: number;
  totalAmount: number;
  amountInWords: string;
  submissionDate: string;
  verifierName: string;
  verifierDesignation: string;
}

function getEpicId(epicSequence: number): string {
  return `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;
}

export async function getCommunicationsWorkEntries() {
  try {
    const entries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        payments: true,
        documents: true,
      },
      orderBy: { epicSequence: 'asc' }
    });

    if (entries && entries.length > 0) {
      return { success: true, entries };
    }

    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
    return { success: true, entries: REAL_PM_EVIDYA_SME_WORK_ENTRIES };
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

  if (authCheck.role === 'VIEWER') {
    return {
      success: false,
      error: 'Viewers have read-only access. Only Administrators and Team Members can save changes.'
    };
  }

  try {
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: workEntryId },
      include: { sme: true, payments: true, documents: true }
    });

    if (!workEntry) {
      return { success: false, error: 'SME Work Entry not found for the selected Epic ID.' };
    }

    const epicIdStr = getEpicId(workEntry.epicSequence || 1);
    const userEmail = await getEmail();
    let savedDocument = null;

    if (stage === 'STAGE_A') {
      const docType = 'STAGE_A_APPROVAL_LETTER';
      const existingDoc = await prisma.document.findFirst({
        where: { workEntryId, type: docType }
      });

      if (existingDoc) {
        savedDocument = await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            name: `Approval Letter Parameters - ${epicIdStr}`,
            filePath: JSON.stringify(parameters),
            status: 'SAVED',
            version: { increment: 1 }
          }
        });
      } else {
        savedDocument = await prisma.document.create({
          data: {
            name: `Approval Letter Parameters - ${epicIdStr}`,
            type: docType,
            status: 'SAVED',
            filePath: JSON.stringify(parameters),
            workEntryId,
            version: 1
          }
        });
      }

      await logAudit({
        action: 'SAVE_STAGE_A_APPROVAL_LETTER',
        entity: 'SMEWorkEntry',
        entityId: workEntryId,
        newData: `Saved Approval Letter parameters for ${epicIdStr} (${workEntry.sme?.name})`,
        userEmail
      });
    } else if (stage === 'STAGE_B') {
      const docType = 'STAGE_B_WORK_COMPLETION';
      const existingDoc = await prisma.document.findFirst({
        where: { workEntryId, type: docType }
      });

      if (existingDoc) {
        savedDocument = await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            name: `Work Completion Parameters - ${epicIdStr}`,
            filePath: JSON.stringify(parameters),
            status: 'SAVED',
            version: { increment: 1 }
          }
        });
      } else {
        savedDocument = await prisma.document.create({
          data: {
            name: `Work Completion Parameters - ${epicIdStr}`,
            type: docType,
            status: 'SAVED',
            filePath: JSON.stringify(parameters),
            workEntryId,
            version: 1
          }
        });
      }

      // Sync primary fields in SMEWorkEntry without overwriting Stage A or Stage C
      await prisma.sMEWorkEntry.update({
        where: { id: workEntryId },
        data: {
          topic: parameters.topicsCovered || workEntry.topic,
          attendanceFrom: parameters.startDate ? new Date(parameters.startDate) : workEntry.attendanceFrom,
          attendanceTo: parameters.endDate ? new Date(parameters.endDate) : workEntry.attendanceTo,
        }
      });

      await logAudit({
        action: 'SAVE_STAGE_B_WORK_COMPLETION',
        entity: 'SMEWorkEntry',
        entityId: workEntryId,
        newData: `Saved Work Completion parameters for ${epicIdStr} (${workEntry.sme?.name})`,
        userEmail
      });
    } else if (stage === 'STAGE_C') {
      const docType = 'STAGE_C_REMUNERATION';
      const existingDoc = await prisma.document.findFirst({
        where: { workEntryId, type: docType }
      });

      if (existingDoc) {
        savedDocument = await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            name: `Remuneration Parameters - ${epicIdStr}`,
            filePath: JSON.stringify(parameters),
            status: 'SAVED',
            version: { increment: 1 }
          }
        });
      } else {
        savedDocument = await prisma.document.create({
          data: {
            name: `Remuneration Parameters - ${epicIdStr}`,
            type: docType,
            status: 'SAVED',
            filePath: JSON.stringify(parameters),
            workEntryId,
            version: 1
          }
        });
      }

      // Update primary SMEWorkEntry financial fields
      const days = Number(parameters.totalDays) || workEntry.days || 0;
      const ratePerDay = Number(parameters.ratePerDay) || workEntry.ratePerDay || 0;
      const taAmount = Number(parameters.taAmount) || 0;
      const otherAmount = Number(parameters.otherAmount) || 0;
      const grossAmount = Number(parameters.grossAmount) || (days * ratePerDay);
      const totalAmount = Number(parameters.totalAmount) || (grossAmount + taAmount + otherAmount);

      await prisma.sMEWorkEntry.update({
        where: { id: workEntryId },
        data: {
          days,
          ratePerDay,
          taAmount,
          otherAmount,
        }
      });

      // Synchronize Payment record
      const payments = await prisma.payment.findMany({ where: { workEntryId } });
      if (payments.length > 0) {
        await prisma.payment.update({
          where: { id: payments[0].id },
          data: {
            grossAmount,
            taAmount,
            otherAmount,
            totalAmount,
          }
        });
      } else {
        await prisma.payment.create({
          data: {
            workEntryId,
            grossAmount,
            taAmount,
            otherAmount,
            totalAmount,
            status: 'PENDING'
          }
        });
      }

      await logAudit({
        action: 'SAVE_STAGE_C_REMUNERATION',
        entity: 'SMEWorkEntry',
        entityId: workEntryId,
        newData: `Saved Remuneration parameters for ${epicIdStr}: ₹${totalAmount}`,
        userEmail
      });
    }

    revalidatePath('/generator/deputation');
    revalidatePath('/communications');
    revalidatePath('/smes');
    if (workEntry.smeId) {
      revalidatePath(`/smes/${workEntry.smeId}`);
    }

    return {
      success: true,
      stage,
      document: savedDocument,
      message: `Stage ${stage.replace('STAGE_', '')} parameters saved successfully!`
    };
  } catch (error: any) {
    console.error(`Error saving stage ${stage} parameters:`, error);
    return {
      success: false,
      error: error?.message || `Failed to save ${stage} parameters`
    };
  }
}
