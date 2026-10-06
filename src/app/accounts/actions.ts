'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth } from '@/lib/auth';

export async function updatePaymentStatus(paymentId: string, status: string, utrNumber?: string, remarks?: string) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
    const previous = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!previous) throw new Error('Payment not found');

    const updateData: any = { status };
    if (utrNumber !== undefined) updateData.utrNumber = utrNumber;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (status === 'PAID' && !previous.paymentDate) {
      updateData.paymentDate = new Date();
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Payment',
        entityId: paymentId,
        previousData: JSON.stringify(previous),
        newData: JSON.stringify(updateData),
      }
    });

    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to update payment:', error);
    return { success: false, error: 'Failed to update payment status' };
  }
}
