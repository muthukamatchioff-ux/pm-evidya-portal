import { prisma as defaultPrisma } from './prisma';
import { REAL_PM_EVIDYA_BUDGET_COMPONENTS } from './fallbackData';
import { revalidatePath } from 'next/cache';

export async function syncAnnexuresIfNeeded(customPrisma?: any, force: boolean = false) {
  const p = customPrisma || defaultPrisma;

  try {
    const comp1 = await p.budgetComponent.findUnique({
      where: { componentNo: 1 },
      include: { annexureI: true }
    });

    const comp2 = await p.budgetComponent.findUnique({
      where: { componentNo: 2 },
      include: { annexureII: true }
    });

    const comp3 = await p.budgetComponent.findUnique({
      where: { componentNo: 3 },
      include: { annexureIII: true }
    });

    if (!comp1 || !comp2 || !comp3) {
      console.warn('[SyncAnnexures] Budget components 1, 2 or 3 not found in database.');
      return { success: false, reason: 'Components not found' };
    }

    // Check if Component 1 has old stale records
    const comp1NeedsSync = force ||
      (comp1.annexureI.length !== 8) ||
      comp1.annexureI.some((r: any) =>
        r.expertName?.includes('CANTEEN') ||
        r.expertName?.includes('Migrated') ||
        r.voucherNo === 'CN2/001756/26-27'
      ) ||
      (comp1.annexureI.reduce((sum: number, r: any) => sum + (r.totalExpenditure || 0), 0) !== 155735);

    // Check if Component 2 has old stale records
    const comp2NeedsSync = force ||
      (comp2.annexureII.length !== 23) ||
      comp2.annexureII.some((r: any) =>
        r.remarks?.includes('Legacy Import') ||
        (r.participant?.includes('PRIYA.S') && r.travelAllowance === 29245)
      ) ||
      (comp2.annexureII.reduce((sum: number, r: any) => sum + (r.totalExpenditure || 0), 0) !== 159479);

    // Check if Component 3 has old stale records (must have exactly 1 record: JV20000062/26-27, ₹1,45,000)
    const comp3NeedsSync = force ||
      (comp3.annexureIII.length !== 1) ||
      comp3.annexureIII.some((r: any) =>
        r.voucherNo !== 'JV20000062/26-27' ||
        r.totalExpenditure !== 145000 ||
        r.personnelName?.includes('PRIYA')
      );

    if (!comp1NeedsSync && !comp2NeedsSync && !comp3NeedsSync) {
      return {
        success: true,
        synced: false,
        message: 'Annexures I, II, and III are already in sync with verified data.',
        comp1Count: comp1.annexureI.length,
        comp2Count: comp2.annexureII.length,
        comp3Count: comp3.annexureIII.length
      };
    }

    const fallbackComp1 = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find(c => c.componentNo === 1);
    const fallbackComp2 = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find(c => c.componentNo === 2);
    const fallbackComp3 = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find(c => c.componentNo === 3);

    if (!fallbackComp1 || !fallbackComp2 || !fallbackComp3) {
      throw new Error('Fallback data for components missing');
    }

    await p.$transaction(async (tx: any) => {
      // 1. Sync Component 1 if needed
      if (comp1NeedsSync) {
        console.log('[SyncAnnexures] Synchronizing Annexure I (8 records, ₹1,55,735)...');
        await tx.annexureI.deleteMany({
          where: { budgetComponentId: comp1.id }
        });

        for (const item of fallbackComp1.annexureI) {
          await tx.annexureI.create({
            data: {
              id: item.id,
              budgetComponentId: comp1.id,
              datePeriod: item.datePeriod || '',
              expertName: item.expertName || '',
              designation: item.designation || '',
              activity: item.activity || 'Digital Content Development',
              workingDays: Number(item.workingDays) || 0,
              honorarium: Number(item.honorarium) || 0,
              travelAllowance: Number(item.travelAllowance) || 0,
              otherCharges: Number(item.otherCharges) || 0,
              totalExpenditure: Number(item.totalExpenditure) || 0,
              utrNumber: item.utrNumber || '',
              contentDuration: item.contentDuration || '-',
              approvalRef: item.approvalRef || null,
              remarks: item.remarks || '',
              supportingDoc: item.supportingDoc || null,
              verificationStatus: item.verificationStatus || 'DRAFT',
              tranType: item.tranType || null,
              voucherNo: item.voucherNo || null,
              transactionDate: item.transactionDate ? new Date(item.transactionDate) : null,
              commitmentNo: item.commitmentNo || null,
              commitmentDate: item.commitmentDate ? new Date(item.commitmentDate) : null,
              narration: item.narration || null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
            }
          });
        }
      }

      // 2. Sync Component 2 if needed
      if (comp2NeedsSync) {
        console.log('[SyncAnnexures] Synchronizing Annexure II (23 records, ₹1,59,479)...');
        await tx.annexureII.deleteMany({
          where: { budgetComponentId: comp2.id }
        });

        for (const item of fallbackComp2.annexureII) {
          await tx.annexureII.create({
            data: {
              id: item.id,
              budgetComponentId: comp2.id,
              datePeriod: item.datePeriod || '',
              trainingName: item.trainingName || 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.',
              trainingType: item.trainingType || 'Hybrid',
              participant: item.participant || '',
              venue: item.venue || 'NIMI Chennai',
              noOfParticipants: Number(item.noOfParticipants) || 0,
              trainingDays: Number(item.trainingDays) || 2,
              trainerFee: Number(item.trainerFee) || 0,
              trainingCost: Number(item.trainingCost) || 0,
              travelAllowance: Number(item.travelAllowance) || 0,
              accommodation: Number(item.accommodation) || 0,
              otherExpenses: Number(item.otherExpenses) || 0,
              totalExpenditure: Number(item.totalExpenditure) || 0,
              utrNumber: item.utrNumber || '',
              approvalRef: item.approvalRef || null,
              remarks: item.remarks || '',
              supportingDoc: item.supportingDoc || null,
              verificationStatus: item.verificationStatus || 'DRAFT',
              trainingDates: item.trainingDates || '30:07:2026 & 31:07:2026',
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
            }
          });
        }
      }

      // 3. Sync Component 3 if needed
      if (comp3NeedsSync) {
        console.log('[SyncAnnexures] Synchronizing Annexure III (1 record, ₹1,45,000)...');
        await tx.annexureIII.deleteMany({
          where: { budgetComponentId: comp3.id }
        });

        for (const item of fallbackComp3.annexureIII) {
          await tx.annexureIII.create({
            data: {
              id: item.id,
              budgetComponentId: comp3.id,
              datePeriod: item.datePeriod || '07-Oct-2026',
              personnelName: item.personnelName || 'Consultant Salary',
              designation: item.designation || 'Contract Staff',
              supportType: item.supportType || 'Sal (GSAL)',
              department: item.department || 'PM e-Vidya Project',
              workPeriod: item.workPeriod || '1 Month (September 2026)',
              remuneration: Number(item.remuneration) || 145000,
              taDa: Number(item.taDa) || 0,
              otherCharges: Number(item.otherCharges) || 0,
              totalExpenditure: Number(item.totalExpenditure) || 145000,
              utrNumber: item.utrNumber || 'JV20000062/26-27',
              voucherNo: item.voucherNo || 'JV20000062/26-27',
              commitmentNo: item.commitmentNo || '00454/0001/26-2026/1',
              tranType: item.tranType || 'Sal (GSAL)',
              transactionDate: item.transactionDate ? new Date(item.transactionDate) : new Date('2026-10-07T00:00:00.000Z'),
              commitmentDate: item.commitmentDate ? new Date(item.commitmentDate) : new Date('2026-10-07T00:00:00.000Z'),
              approvalRef: item.approvalRef || '00454/0001/26-2026/1',
              remarks: item.remarks || 'Contract Staff Chennai eVidya Salary payable during the month of September 2026 for project 0001/16-2026',
              narration: item.narration || 'Contract Staff Chennai eVidya Salary payable during the month of September 2026 for project 0001/16-2026',
              supportingDoc: item.supportingDoc || null,
              verificationStatus: item.verificationStatus || 'VERIFIED',
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date('2026-10-07T00:00:00.000Z'),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date('2026-10-07T00:00:00.000Z')
            }
          });
        }
      }
    });

    try {
      revalidatePath('/dashboard');
      revalidatePath('/budget');
      revalidatePath('/budget/annexure-1');
      revalidatePath('/budget/annexure-2');
      revalidatePath('/budget/annexure-3');
      revalidatePath('/reports');
    } catch {}

    const updatedComp1 = await p.budgetComponent.findUnique({
      where: { componentNo: 1 },
      include: { annexureI: true }
    });
    const updatedComp2 = await p.budgetComponent.findUnique({
      where: { componentNo: 2 },
      include: { annexureII: true }
    });
    const updatedComp3 = await p.budgetComponent.findUnique({
      where: { componentNo: 3 },
      include: { annexureIII: true }
    });

    const comp1Total = updatedComp1?.annexureI.reduce((s: number, r: any) => s + r.totalExpenditure, 0) || 0;
    const comp2Total = updatedComp2?.annexureII.reduce((s: number, r: any) => s + r.totalExpenditure, 0) || 0;
    const comp3Total = updatedComp3?.annexureIII.reduce((s: number, r: any) => s + r.totalExpenditure, 0) || 0;

    return {
      success: true,
      synced: true,
      comp1Count: updatedComp1?.annexureI.length || 0,
      comp1Expenditure: comp1Total,
      comp2Count: updatedComp2?.annexureII.length || 0,
      comp2Expenditure: comp2Total,
      comp3Count: updatedComp3?.annexureIII.length || 0,
      comp3Expenditure: comp3Total,
      totalExpenditure: comp1Total + comp2Total + comp3Total
    };
  } catch (error: any) {
    console.error('[SyncAnnexures Error]:', error);
    return { success: false, error: error.message };
  }
}
