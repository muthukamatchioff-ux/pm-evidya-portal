import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveSMERecordCore(smeData: any, trades: any[]) {
  try {
    // 1. Create or find SME
    let sme = await prisma.sME.findFirst({
      where: {
        name: smeData.name,
      }
    });

    if (!sme) {
      sme = await prisma.sME.create({
        data: {
          name: smeData.name,
          designation: smeData.designation,
          institute: smeData.institution,
        }
      });
    }

    // 2. Create or reuse Work Entries for each trade (prevent duplicates)
    for (const trade of trades) {
      if (!trade.tradeName) continue;
      const existing = await prisma.sMEWorkEntry.findFirst({
        where: {
          smeId: sme.id,
          trade: trade.tradeName
        }
      });

      if (!existing) {
        await prisma.sMEWorkEntry.create({
          data: {
            smeId: sme.id,
            trade: trade.tradeName,
            topic: trade.topics || 'Not Specified',
            attendanceFrom: trade.startDate ? new Date(trade.startDate) : null,
            attendanceTo: trade.endDate ? new Date(trade.endDate) : null,
            days: trade.totalDays,
            ratePerDay: trade.remunerationPerDay,
            status: "PENDING"
          }
        });
      }
    }

    try {
      revalidatePath('/sme-management');
      revalidatePath('/generator/sme-engagement');
      revalidatePath('/generator/completion');
    } catch {}

    return { success: true, message: 'SME record saved successfully!' };
  } catch (error: any) {
    console.error('Error in saveSMERecordCore:', error);
    return { success: false, message: error?.message || 'Failed to save SME record' };
  }
}
