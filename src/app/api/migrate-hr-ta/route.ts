import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const comp2 = await prisma.budgetComponent.findUnique({ where: { componentNo: 2 } });
    const comp3 = await prisma.budgetComponent.findUnique({ where: { componentNo: 3 } });

    if (!comp2 || !comp3) {
      return NextResponse.json({ error: 'Components not found' });
    }

    const annexure3Records = await prisma.annexureIII.findMany({
      where: { budgetComponentId: comp3.id }
    });

    const totalToMove = annexure3Records.reduce((sum, r) => sum + r.totalExpenditure, 0);

    if (action === 'dry-run') {
      return NextResponse.json({
        success: true,
        dryRun: true,
        component2: comp2,
        component3: comp3,
        recordsToMoveCount: annexure3Records.length,
        totalExpenditureToMove: totalToMove,
        recordsToMove: annexure3Records.map(r => ({
          id: r.id,
          personnelName: r.personnelName,
          taDa: r.taDa,
          totalExpenditure: r.totalExpenditure,
          remarks: r.remarks
        }))
      });
    }

    if (action === 'migrate') {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Rename Component 3
        await tx.budgetComponent.update({
          where: { id: comp3.id },
          data: { name: 'Human Resource Support' }
        });

        let movedCount = 0;

        // 2. Move records
        for (const r of annexure3Records) {
          const legacyInfo = ` | Legacy Import: tranType=${r.tranType}, voucherNo=${r.voucherNo}, transactionDate=${r.transactionDate}, narration=${r.narration}`;
          const newRemarks = (r.remarks || '') + legacyInfo;

          await tx.annexureII.create({
            data: {
              budgetComponentId: comp2.id,
              datePeriod: r.datePeriod || '-',
              trainingName: r.supportType || 'Capacity Building - TA/DA',
              trainingType: r.department || '-',
              participant: r.personnelName || '-',
              venue: r.designation || '-',
              trainingDays: parseFloat(r.workPeriod) || 0,
              travelAllowance: r.taDa || 0,
              otherExpenses: (r.otherCharges || 0) + (r.remuneration || 0),
              totalExpenditure: r.totalExpenditure || 0,
              utrNumber: r.utrNumber,
              approvalRef: r.approvalRef,
              remarks: newRemarks,
              supportingDoc: r.supportingDoc,
              verificationStatus: r.verificationStatus || 'DRAFT',
              createdAt: r.createdAt
            }
          });
          
          await tx.annexureIII.delete({
            where: { id: r.id }
          });

          movedCount++;
        }

        return { movedCount };
      });

      // Verify final state
      const finalComp2Ann = await prisma.annexureII.count({ where: { budgetComponentId: comp2.id } });
      const finalComp3Ann = await prisma.annexureIII.count({ where: { budgetComponentId: comp3.id } });
      const finalComp3 = await prisma.budgetComponent.findUnique({ where: { id: comp3.id } });

      return NextResponse.json({
        success: true,
        dryRun: false,
        movedCount: result.movedCount,
        totalMovedAmount: totalToMove,
        finalComp2Count: finalComp2Ann,
        finalComp3Count: finalComp3Ann,
        finalComp3Name: finalComp3?.name
      });
    }

    return NextResponse.json({ error: 'invalid action' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
