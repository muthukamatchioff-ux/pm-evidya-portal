import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const updateResult = await prisma.annexureII.updateMany({
      data: {
        trainingType: 'Hybrid',
        venue: 'NIMI Chennai',
        trainingDays: 2,
        trainingDates: '30.07.2026 - 31.07.2026'
      }
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count
    });
  } catch (error) {
    console.error('Error updating records:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
