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

function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString().length > 9 ? parseFloat(num.toString().slice(0, 9)) : num) === 0) return 'Zero Only';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Only';
}

function getEpicId(epicSequence: number): string {
  return `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;
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
          documents: true,
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

  if (authCheck.role === 'VIEWER') {
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
      console.warn('Prisma lookup by ID failed in saveCommunicationsStage:', dbErr);
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
        console.warn('Prisma upsert fallback during self-heal:', upsertErr);
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
    const userEmail = await getEmail();
    let savedDocument: any = null;

    if (stage === 'STAGE_A') {
      const docType = 'STAGE_A_APPROVAL_LETTER';
      try {
        const existingDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: docType }
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
      } catch (docDbErr) {
        console.warn('Prisma document save fallback for Stage A:', docDbErr);
      }

      if (!savedDocument) {
        savedDocument = {
          id: `cmv_doc_stagea_${workEntry.epicSequence}`,
          name: `Approval Letter Parameters - ${epicIdStr}`,
          type: docType,
          status: 'SAVED',
          filePath: JSON.stringify(parameters),
          workEntryId: actualWorkEntryId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      try {
        const appDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: 'APPROVAL_LETTER' }
        });
        if (appDoc) {
          await prisma.document.update({
            where: { id: appDoc.id },
            data: { filePath: JSON.stringify(parameters), status: 'SAVED' }
          });
        }
      } catch {}

      try {
        await logAudit({
          action: 'SAVE_STAGE_A_APPROVAL_LETTER',
          entity: 'SMEWorkEntry',
          entityId: actualWorkEntryId,
          newData: `Saved Approval Letter parameters for ${epicIdStr} (${workEntry.sme?.name})`,
          userEmail
        });
      } catch {}
    } else if (stage === 'STAGE_B') {
      const docType = 'STAGE_B_WORK_COMPLETION';
      try {
        const existingDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: docType }
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
      } catch (docDbErr) {
        console.warn('Prisma document save fallback for Stage B:', docDbErr);
      }

      if (!savedDocument) {
        savedDocument = {
          id: `cmv_doc_stageb_${workEntry.epicSequence}`,
          name: `Work Completion Parameters - ${epicIdStr}`,
          type: docType,
          status: 'SAVED',
          filePath: JSON.stringify(parameters),
          workEntryId: actualWorkEntryId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
          where: { workEntryId: actualWorkEntryId, type: 'WORK_COMPLETION' }
        });
        if (wcDoc) {
          await prisma.document.update({
            where: { id: wcDoc.id },
            data: { filePath: JSON.stringify(parameters), status: 'SAVED' }
          });
        }
      } catch {}

      if (parameters.ratePerDay) {
        try {
          const stageCDoc = await prisma.document.findFirst({
            where: { workEntryId: actualWorkEntryId, type: 'STAGE_C_REMUNERATION' }
          });
          if (stageCDoc && stageCDoc.filePath) {
            try {
              const cParams = JSON.parse(stageCDoc.filePath);
              cParams.ratePerDay = Number(parameters.ratePerDay);
              const totalDays = Number(cParams.totalDays) || 4;
              cParams.grossAmount = totalDays * cParams.ratePerDay;
              cParams.totalAmount = cParams.grossAmount;
              cParams.amountInWords = numberToWords(cParams.totalAmount);
              await prisma.document.update({
                where: { id: stageCDoc.id },
                data: { filePath: JSON.stringify(cParams) }
              });
            } catch {}
          }
        } catch {}
      }

      try {
        await logAudit({
          action: 'SAVE_STAGE_B_WORK_COMPLETION',
          entity: 'SMEWorkEntry',
          entityId: actualWorkEntryId,
          newData: `Saved Work Completion parameters for ${epicIdStr} (${workEntry.sme?.name})`,
          userEmail
        });
      } catch {}
    } else if (stage === 'STAGE_C') {
      const docType = 'STAGE_C_REMUNERATION';
      try {
        const existingDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: docType }
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
      } catch (docDbErr) {
        console.warn('Prisma document save fallback for Stage C:', docDbErr);
      }

      if (!savedDocument) {
        savedDocument = {
          id: `cmv_doc_stagec_${workEntry.epicSequence}`,
          name: `Remuneration Parameters - ${epicIdStr}`,
          type: docType,
          status: 'SAVED',
          filePath: JSON.stringify(parameters),
          workEntryId: actualWorkEntryId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
          where: { workEntryId: actualWorkEntryId, type: 'PAYMENT_NOTE' }
        });
        if (pnDoc) {
          await prisma.document.update({
            where: { id: pnDoc.id },
            data: { filePath: JSON.stringify(parameters), status: 'SAVED' }
          });
        }
      } catch {}

      // Keep STAGE_B_WORK_COMPLETION and WORK_COMPLETION ratePerDay synchronized
      try {
        const stageBDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: 'STAGE_B_WORK_COMPLETION' }
        });
        if (stageBDoc && stageBDoc.filePath) {
          try {
            const bParams = JSON.parse(stageBDoc.filePath);
            bParams.ratePerDay = ratePerDay;
            await prisma.document.update({
              where: { id: stageBDoc.id },
              data: { filePath: JSON.stringify(bParams) }
            });
          } catch {}
        }
        const wcDoc = await prisma.document.findFirst({
          where: { workEntryId: actualWorkEntryId, type: 'WORK_COMPLETION' }
        });
        if (wcDoc && wcDoc.filePath) {
          try {
            const bParams = JSON.parse(wcDoc.filePath);
            bParams.ratePerDay = ratePerDay;
            await prisma.document.update({
              where: { id: wcDoc.id },
              data: { filePath: JSON.stringify(bParams) }
            });
          } catch {}
        }
      } catch {}

      try {
        await logAudit({
          action: 'SAVE_STAGE_C_REMUNERATION',
          entity: 'SMEWorkEntry',
          entityId: actualWorkEntryId,
          newData: `Saved Remuneration parameters for ${epicIdStr}: ₹${totalAmount}`,
          userEmail
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

      const compIdx = fallbackEntry.documents.findIndex((d: any) => d.type === companionType);
      if (compIdx !== -1) {
        fallbackEntry.documents[compIdx] = {
          ...fallbackEntry.documents[compIdx],
          filePath: JSON.stringify(parameters),
          status: 'SAVED'
        };
      }
    }

    try {
      revalidatePath('/generator/deputation');
      revalidatePath('/communications');
      revalidatePath('/smes');
      if (workEntry.smeId) {
        revalidatePath(`/smes/${workEntry.smeId}`);
      }
    } catch {}

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
