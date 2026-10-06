import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'read-only') {
    // AnnexureII Data
    const annexureII = await prisma.annexureII.findMany({
      include: { budgetComponent: true }
    });

    const annexureIII = await prisma.annexureIII.findMany({
      include: { budgetComponent: true }
    });

    return NextResponse.json({
      success: true,
      annexureII: annexureII.map(a => ({
        id: a.id,
        trainingName: a.trainingName,
        travelAllowance: a.travelAllowance,
        trainerFee: a.trainerFee,
        trainingCost: a.trainingCost,
        totalExpenditure: a.totalExpenditure,
        isProbablyTADA: (a.travelAllowance > 0 && a.trainerFee === 0 && a.trainingCost === 0) || a.trainingName?.toLowerCase().includes('ta')
      })),
      annexureIII: annexureIII.map(a => ({
        id: a.id,
        personnelName: a.personnelName,
        designation: a.designation,
        workPeriod: a.workPeriod,
        remuneration: a.remuneration,
        totalExpenditure: a.totalExpenditure
      }))
    });
  }

  return NextResponse.json({ error: 'invalid action' });
}
