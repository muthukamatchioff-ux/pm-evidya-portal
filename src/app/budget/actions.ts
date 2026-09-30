'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';

export async function updateBudgetHead(id: string, approvedBudget: number, utilizedAmount: number) {
  try {
    await requireAuth(['ADMIN', 'ACCOUNTS']);
    const previous = await prisma.budgetHead.findUnique({ where: { id } });
    if (!previous) throw new Error('Budget Head not found');

    await prisma.budgetHead.update({
      where: { id },
      data: {
        approvedBudget,
        utilizedAmount,
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'BudgetHead',
        entityId: id,
        previousData: JSON.stringify(previous),
        newData: JSON.stringify({ approvedBudget, utilizedAmount }),
      }
    });

    revalidatePath('/budget');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to update budget:', error);
    return { success: false, error: 'Failed to update budget head' };
  }
}

export async function createBudgetHead(name: string, approvedBudget: number, utilizedAmount: number) {
  try {
    await requireAuth(['ADMIN', 'ACCOUNTS']);
    const existing = await prisma.budgetHead.findUnique({ where: { name } });
    if (existing) {
      return { success: false, error: 'Budget Head with this name already exists' };
    }

    const created = await prisma.budgetHead.create({
      data: {
        name,
        approvedBudget,
        utilizedAmount
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'BudgetHead',
        entityId: created.id,
        newData: JSON.stringify(created),
      }
    });

    revalidatePath('/budget');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to create budget head:', error);
    return { success: false, error: 'Failed to create budget head' };
  }
}
