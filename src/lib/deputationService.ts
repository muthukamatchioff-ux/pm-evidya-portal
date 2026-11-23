import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export function getEpicId(epicSequence: number): string {
  return `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;
}

export async function saveCommunicationsStageCore(
  workEntryId: string,
  stage: 'STAGE_A' | 'STAGE_B' | 'STAGE_C',
  parameters: any,
  role?: string,
  userEmail?: string | null
) {
  if (role === 'VIEWER') {
    return {
      success: false,
      error: 'Viewers have read-only access. Only Administrators and Team Members can save changes.'
    };
  }

  try {
    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES, REAL_PM_EVIDYA_SMES } = await import('@/lib/fallbackData');
    let workEntry: any = null;

    try {
      workEntry = await prisma.sMEWorkEntry.findUnique({
        where: { id: workEntryId },
        include: { sme: true, payments: true, documents: true }
      });
    } catch (dbErr) {
      console.warn('Prisma lookup by ID failed in saveCommunicationsStageCore:', dbErr);
    }

    if (!workEntry) {
      // Try find by epicSequence in DB
      const seqMatch = String(workEntryId).match(/(\d+)/);
      const seqNum = seqMatch ? parseInt(seqMatch[1], 10) : null;
      if (seqNum) {
        try {
          workEntry = await prisma.sMEWorkEntry.findFirst({
            where: { epicSequence: seqNum },
            include: { sme: true, payments: true, documents: true }
          });
        } catch {}
      }
    }

    // If still not found in DB, check fallbackData
    const fallbackEntry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(
      (e: any) =>
        e.id === workEntryId ||
        String(e.epicSequence) === String(workEntryId) ||
        getEpicId(e.epicSequence).toLowerCase() === String(workEntryId).toLowerCase() ||
        (String(workEntryId).includes(String(e.epicSequence)) && e.epicSequence > 0)
    );

    if (!workEntry && fallbackEntry) {
      // Self-heal: Upsert SME and WorkEntry into database if connected
      try {
        const smeObj = fallbackEntry.sme || (REAL_PM_EVIDYA_SMES as any[]).find((s: any) => s.id === fallbackEntry.smeId);
        if (smeObj) {
          await prisma.sME.upsert({
            where: { id: smeObj.id },
            update: {
              name: smeObj.name,
              designation: smeObj.designation,
              institute: smeObj.institute,
              location: smeObj.location,
              status: smeObj.status || 'ACTIVE'
            },
            create: {
              id: smeObj.id,
              name: smeObj.name,
              designation: smeObj.designation,
              institute: smeObj.institute,
              location: smeObj.location,
              status: smeObj.status || 'ACTIVE'
            }
          });
        }

        workEntry = await prisma.sMEWorkEntry.upsert({
          where: { id: fallbackEntry.id },
          update: {
            trade: fallbackEntry.trade,
            topic: fallbackEntry.topic,
            epicSequence: fallbackEntry.epicSequence,
            status: fallbackEntry.status || 'IN_PROGRESS'
          },
          create: {
            id: fallbackEntry.id,
            smeId: fallbackEntry.smeId,
            trade: fallbackEntry.trade,
            topic: fallbackEntry.topic,
            attendanceFrom: fallbackEntry.attendanceFrom ? new Date(fallbackEntry.attendanceFrom) : null,
            attendanceTo: fallbackEntry.attendanceTo ? new Date(fallbackEntry.attendanceTo) : null,
            days: fallbackEntry.days,
            ratePerDay: fallbackEntry.ratePerDay || 1500,
            taAmount: fallbackEntry.taAmount || 0,
            otherAmount: fallbackEntry.otherAmount || 0,
            status: fallbackEntry.status || 'IN_PROGRESS',
            epicSequence: fallbackEntry.epicSequence
          },
          include: { sme: true, payments: true, documents: true }
        });
      } catch (upsertErr) {
        console.warn('Prisma upsert fallback during self-heal in Core:', upsertErr);
      }

      if (!workEntry) {
        workEntry = {
          ...fallbackEntry,
          sme: fallbackEntry.sme || (REAL_PM_EVIDYA_SMES as any[]).find((s: any) => s.id === fallbackEntry.smeId),
          documents: fallbackEntry.documents || []
        };
      }
    }

    if (!workEntry) {
      return { success: false, error: 'SME Work Entry not found for the selected Epic ID.' };
    }

    const actualWorkEntryId = workEntry.id;
    const epicIdStr = getEpicId(workEntry.epicSequence || 1);

    let savedDocument: any = null;
    let companionDoc: any = null;

    if (stage === 'STAGE_A') {
      const docType = 'STAGE_A_APPROVAL_LETTER';
      const companionType = 'APPROVAL_LETTER';
      try {
        const existingDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: docType },
          orderBy: { updatedAt: 'desc' }
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
              workEntryId: actualWorkEntryId,
              version: 1
            }
          });
        }
      } catch (docDbErr: any) {
        console.error('Prisma document save failed for Stage A:', docDbErr);
      }

      if (!savedDocument) {
        return {
          success: false,
          error: 'Failed to save Approval Letter parameters to the database.'
        };
      }

      try {
        const appDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: companionType },
          orderBy: { updatedAt: 'desc' }
        });
        if (appDoc) {
          companionDoc = await prisma.document.update({
            where: { id: appDoc.id },
            data: { filePath: JSON.stringify(parameters), status: 'SAVED' }
          });
        } else {
          companionDoc = await prisma.document.create({
            data: {
              name: `Approval Letter - ${epicIdStr}`,
              type: companionType,
              status: 'SAVED',
              filePath: JSON.stringify(parameters),
              workEntryId: actualWorkEntryId,
              version: 1
            }
          });
        }
      } catch {}

      try {
        await logAudit({
          action: 'SAVE_STAGE_A_APPROVAL_LETTER',
          entity: 'SMEWorkEntry',
          entityId: actualWorkEntryId,
          newData: `Saved Approval Letter parameters for ${epicIdStr} (${workEntry.sme?.name})`,
          userEmail: userEmail || undefined
        });
      } catch {}
    } else if (stage === 'STAGE_B') {
      const docType = 'STAGE_B_WORK_COMPLETION';
      const companionType = 'WORK_COMPLETION';
      try {
        const existingDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: docType },
          orderBy: { updatedAt: 'desc' }
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
              workEntryId: actualWorkEntryId,
              version: 1
            }
          });
        }
      } catch (docDbErr: any) {
        console.error('Prisma document save failed for Stage B:', docDbErr);
      }

      if (!savedDocument) {
        return {
          success: false,
          error: 'Failed to save Work Completion parameters to the database.'
        };
      }

      // Sync primary fields in SMEWorkEntry without overwriting Stage A or Stage C
      try {
        const smeWorkBUpdate: any = {
          topic: parameters.topicsCovered || workEntry.topic,
          attendanceFrom: parameters.startDate ? new Date(parameters.startDate) : workEntry.attendanceFrom,
          attendanceTo: parameters.endDate ? new Date(parameters.endDate) : workEntry.attendanceTo,
        };
        if (parameters.ratePerDay) {
          smeWorkBUpdate.ratePerDay = Number(parameters.ratePerDay);
        }
        await prisma.sMEWorkEntry.update({
          where: { id: actualWorkEntryId },
          data: smeWorkBUpdate
        });
      } catch {}

      try {
        const wcDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: companionType },
          orderBy: { updatedAt: 'desc' }
        });
        if (wcDoc) {
          companionDoc = await prisma.document.update({
            where: { id: wcDoc.id },
            data: { filePath: JSON.stringify(parameters), status: 'SAVED' }
          });
        } else {
          companionDoc = await prisma.document.create({
            data: {
              name: `Work Completion Certificate - ${epicIdStr}`,
              type: companionType,
              status: 'SAVED',
              filePath: JSON.stringify(parameters),
              workEntryId: actualWorkEntryId,
              version: 1
            }
          });
        }
      } catch {}

      try {
        await logAudit({
          action: 'SAVE_STAGE_B_WORK_COMPLETION',
          entity: 'SMEWorkEntry',
          entityId: actualWorkEntryId,
          newData: `Saved Work Completion parameters for ${epicIdStr} (${workEntry.sme?.name})`,
          userEmail: userEmail || undefined
        });
      } catch {}
    } else if (stage === 'STAGE_C') {
      const docType = 'STAGE_C_REMUNERATION';
      const companionType = 'PAYMENT_NOTE';
      try {
        const existingDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: docType },
          orderBy: { updatedAt: 'desc' }
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
              workEntryId: actualWorkEntryId,
              version: 1
            }
          });
        }
      } catch (docDbErr: any) {
        console.error('Prisma document save failed for Stage C:', docDbErr);
      }

      if (!savedDocument) {
        return {
          success: false,
          error: 'Failed to save Remuneration parameters to the database.'
        };
      }

      // Update primary SMEWorkEntry financial fields
      const days = Number(parameters.totalDays) || workEntry.days || 0;
      const ratePerDay = Number(parameters.ratePerDay) || workEntry.ratePerDay || 0;
      const grossAmount = days * ratePerDay;
      const totalAmount = grossAmount; // Pure Honorarium

      const smeWorkUpdate: any = {
        days,
        ratePerDay,
        taAmount: 0,
        otherAmount: 0,
      };

      if (parameters.trade && typeof parameters.trade === 'string' && parameters.trade.trim()) {
        smeWorkUpdate.trade = parameters.trade.trim();
      }

      if (Array.isArray(parameters.attendanceSlots) && parameters.attendanceSlots.length > 0) {
        const validSlots = parameters.attendanceSlots.filter((s: any) => s.startDate && s.endDate);
        if (validSlots.length > 0) {
          smeWorkUpdate.attendanceFrom = new Date(validSlots[0].startDate);
          smeWorkUpdate.attendanceTo = new Date(validSlots[validSlots.length - 1].endDate);
        }
      }

      try {
        await prisma.sMEWorkEntry.update({
          where: { id: actualWorkEntryId },
          data: smeWorkUpdate
        });
      } catch {}

      // Synchronize Payment record
      try {
        const payments = await prisma.payment.findMany({ where: { workEntryId: actualWorkEntryId } });
        if (payments.length > 0) {
          await prisma.payment.update({
            where: { id: payments[0].id },
            data: {
              grossAmount,
              taAmount: 0,
              otherAmount: 0,
              totalAmount,
            }
          });
        } else {
          await prisma.payment.create({
            data: {
              workEntryId: actualWorkEntryId,
              grossAmount,
              taAmount: 0,
              otherAmount: 0,
              totalAmount,
              status: 'PENDING'
            }
          });
        }
      } catch {}

      try {
        const pnDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: companionType },
          orderBy: { updatedAt: 'desc' }
        });
        if (pnDoc) {
          companionDoc = await prisma.document.update({
            where: { id: pnDoc.id },
            data: { filePath: JSON.stringify(parameters), status: 'SAVED' }
          });
        } else {
          companionDoc = await prisma.document.create({
            data: {
              name: `SME Remuneration Note - ${epicIdStr}`,
              type: companionType,
              status: 'SAVED',
              filePath: JSON.stringify(parameters),
              workEntryId: actualWorkEntryId,
              version: 1
            }
          });
        }
      } catch {}

      try {
        await logAudit({
          action: 'SAVE_STAGE_C_REMUNERATION',
          entity: 'SMEWorkEntry',
          entityId: actualWorkEntryId,
          newData: `Saved Remuneration parameters for ${epicIdStr}: ₹${totalAmount}`,
          userEmail: userEmail || undefined
        });
      } catch {}
    }

    // Also update in-memory fallbackData so subsequent lookups are immediate
    if (fallbackEntry) {
      if (stage === 'STAGE_B') {
        fallbackEntry.topic = parameters.topicsCovered || fallbackEntry.topic;
        if (parameters.startDate) fallbackEntry.attendanceFrom = new Date(parameters.startDate).toISOString();
        if (parameters.endDate) fallbackEntry.attendanceTo = new Date(parameters.endDate).toISOString();
        if (parameters.ratePerDay) fallbackEntry.ratePerDay = Number(parameters.ratePerDay);
      } else if (stage === 'STAGE_C') {
        fallbackEntry.trade = parameters.trade || fallbackEntry.trade;
        fallbackEntry.days = Number(parameters.totalDays) || fallbackEntry.days;
        fallbackEntry.ratePerDay = Number(parameters.ratePerDay) || fallbackEntry.ratePerDay;
      }
      if (!fallbackEntry.documents) fallbackEntry.documents = [];
      const docType = stage === 'STAGE_A' ? 'STAGE_A_APPROVAL_LETTER' : stage === 'STAGE_B' ? 'STAGE_B_WORK_COMPLETION' : 'STAGE_C_REMUNERATION';
      const companionType = stage === 'STAGE_A' ? 'APPROVAL_LETTER' : stage === 'STAGE_B' ? 'WORK_COMPLETION' : 'PAYMENT_NOTE';

      const docIdx = fallbackEntry.documents.findIndex((d: any) => d.type === docType);
      if (docIdx !== -1) {
        fallbackEntry.documents[docIdx] = savedDocument;
      } else {
        fallbackEntry.documents.push(savedDocument);
      }

      if (companionDoc) {
        const compIdx = fallbackEntry.documents.findIndex((d: any) => d.type === companionType);
        if (compIdx !== -1) {
          fallbackEntry.documents[compIdx] = companionDoc;
        } else {
          fallbackEntry.documents.push(companionDoc);
        }
      }
    }

    try {
      const { invalidateSmeAndDocumentCaches } = await import('@/lib/dataCache');
      invalidateSmeAndDocumentCaches(workEntry.smeId);
      revalidatePath('/generator/deputation');
      revalidatePath('/communications');
    } catch {}

    return {
      success: true,
      stage,
      document: savedDocument,
      companionDocument: companionDoc,
      message: `Stage ${stage.replace('STAGE_', '')} parameters saved successfully!`
    };
  } catch (error: any) {
    console.error(`Error in saveCommunicationsStageCore for ${stage}:`, error);
    return {
      success: false,
      error: error?.message || `Failed to save ${stage} parameters`
    };
  }
}
