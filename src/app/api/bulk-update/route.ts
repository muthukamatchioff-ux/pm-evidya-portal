import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 1. Update PRIYA.S record in Annexure II
    const priyaRecords = await prisma.annexureII.findMany({
      where: {
        participant: { contains: 'PRIYA.S' }
      }
    });

    let updatedPriyaCount = 0;
    for (const r of priyaRecords) {
      await prisma.annexureII.update({
        where: { id: r.id },
        data: {
          trainingType: 'Hybrid',
          trainingDays: 2,
          trainingDates: '30.07.2026 - 31.07.2026',
          venue: 'NIMI Chennai'
        }
      });
      updatedPriyaCount++;
    }

    // 2. Update ALL Annexure II records' trainingName
    const updatedAll = await prisma.annexureII.updateMany({
      data: {
        trainingName: 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.'
      }
    });

    return NextResponse.json({
      success: true,
      updatedPriyaCount,
      allAnnexureIITrainingNameUpdatedCount: updatedAll.count
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
