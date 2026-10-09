'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth';

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
    const records = await prisma.topicProductionRecord.findMany({
      include: {
        workEntry: {
          include: {
            sme: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return { success: true, data: records };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTopicProductionRecord(workEntryId: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    if (!data.topicTitle) {
      return { success: false, error: 'Topic Title is required.' };
    }

    // Ensure the workEntryId exists
    const workEntry = await prisma.sMEWorkEntry.findUnique({
      where: { id: workEntryId }
    });

    if (!workEntry) {
      return { success: false, error: 'Invalid Epic ID selected.' };
    }

    // Use a transaction to safely get the next topicNo and create the record
    const result = await prisma.$transaction(async (tx) => {
      // Get the max topicNo for this workEntry
      const maxTopic = await tx.topicProductionRecord.findFirst({
        where: { workEntryId },
        orderBy: { topicNo: 'desc' },
      });

      const nextTopicNo = maxTopic ? maxTopic.topicNo + 1 : 1;

      // Determine initial production status
      const productionStatus = (data.shootingDate && data.cameraman) ? 'COMPLETED' : 'PENDING';

      const newRecord = await tx.topicProductionRecord.create({
        data: {
          workEntryId,
          topicNo: nextTopicNo,
          topicTitle: data.topicTitle,
          shootingDate: data.shootingDate ? new Date(data.shootingDate) : null,
          cameraman: data.cameraman || null,
          productionStatus,
          overallStatus: productionStatus === 'COMPLETED' ? 'STAGE_1_COMPLETED' : 'PENDING'
        },
        include: {
          workEntry: {
            include: { sme: true }
          }
        }
      });

      return newRecord;
    });

    return { success: true, data: result };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'A concurrency conflict occurred. Please try saving again.' };
    }
    return { success: false, error: error.message };
  }
}

export async function updateTopicStage1(id: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    const existing = await prisma.topicProductionRecord.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Record not found' };

    const productionStatus = (data.shootingDate && data.cameraman) ? 'COMPLETED' : 'PENDING';
    
    // Only upgrade overallStatus, do not downgrade if already FINAL_COMPLETED
    let overallStatus = existing.overallStatus;
    
    // Check if we're downgrading while Stage 2 has started
    if (existing.productionStatus === 'COMPLETED' && productionStatus === 'PENDING') {
      const stage2Started = existing.editingStatus !== 'NOT_STARTED' || 
                            existing.animationStatus !== 'NOT_STARTED' ||
                            existing.editorName || 
                            existing.animatorName;
      if (stage2Started) {
        return { success: false, error: 'Cannot downgrade Production Stage to Pending because Post-Production has already started.' };
      }
    }

    if (productionStatus === 'COMPLETED' && overallStatus === 'PENDING') {
      overallStatus = 'STAGE_1_COMPLETED';
    } else if (productionStatus === 'PENDING') {
      overallStatus = 'PENDING';
    }

    const record = await prisma.topicProductionRecord.update({
      where: { id },
      data: {
        topicTitle: data.topicTitle || existing.topicTitle,
        shootingDate: data.shootingDate ? new Date(data.shootingDate) : null,
        cameraman: data.cameraman || null,
        productionStatus,
        overallStatus
      },
      include: {
        workEntry: { include: { sme: true } }
      }
    });

    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTopicStage2(id: string, data: any) {
  const auth = await checkAuth(['ADMIN', 'TEAM_MEMBER']);
  if (!auth.success) return auth;

  try {
    const existing = await prisma.topicProductionRecord.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Record not found' };

    if (existing.productionStatus !== 'COMPLETED') {
      return { success: false, error: 'Production (Stage 1) must be completed before updating Stage 2.' };
    }

    // Date Validations
    if (data.editingStartDate && data.editingEndDate) {
      if (new Date(data.editingEndDate) < new Date(data.editingStartDate)) {
        return { success: false, error: 'Editing End Date cannot be before Start Date.' };
      }
    }

    if (data.animationStartDate && data.animationEndDate) {
      if (new Date(data.animationEndDate) < new Date(data.animationStartDate)) {
        return { success: false, error: 'Animation End Date cannot be before Start Date.' };
      }
    }

    // Auto-calculate final completion
    const editingDone = data.editingStatus === 'COMPLETED';
    // If no animator was provided, we assume animation is skipped or we just require editingDone if there is no animator?
    // The requirement says: "Mark a topic Final Completed only when all configured required post-production steps are complete."
    // Let's assume Editing must be completed, and IF animator is assigned, animation must be completed.
    
    let isFinalCompleted = false;
    
    if (editingDone) {
       if (data.animatorName) {
           isFinalCompleted = data.animationStatus === 'COMPLETED';
       } else {
           isFinalCompleted = true; // no animation required
       }
    }

    const overallStatus = isFinalCompleted ? 'FINAL_COMPLETED' : 'STAGE_1_COMPLETED';

    const record = await prisma.topicProductionRecord.update({
      where: { id },
      data: {
        editorName: data.editorName || null,
        editingStartDate: data.editingStartDate ? new Date(data.editingStartDate) : null,
        editingEndDate: data.editingEndDate ? new Date(data.editingEndDate) : null,
        editingStatus: data.editingStatus || 'NOT_STARTED',
        editingNotes: data.editingNotes || null,
        
        animatorName: data.animatorName || null,
        animationStartDate: data.animationStartDate ? new Date(data.animationStartDate) : null,
        animationEndDate: data.animationEndDate ? new Date(data.animationEndDate) : null,
        animationStatus: data.animationStatus || 'NOT_STARTED',
        animationNotes: data.animationNotes || null,
        
        overallStatus
      },
      include: {
        workEntry: { include: { sme: true } }
      }
    });

    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
