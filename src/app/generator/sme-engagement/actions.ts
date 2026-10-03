"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function saveSMERecord(smeData: any, trades: any[]) {
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

    // 2. Create Work Entries for each trade
    for (const trade of trades) {
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

    revalidatePath('/sme-management');
    return { success: true, message: 'SME record saved successfully!' };
  } catch (error) {
    console.error('Error saving SME record:', error);
    return { success: false, message: 'Failed to save SME record' };
  }
}
