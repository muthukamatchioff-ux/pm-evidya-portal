import React from 'react';
import { prisma } from '@/lib/prisma';
import BudgetClient from './BudgetClient';

export default async function BudgetPage() {
  const budgetHeads = await prisma.budgetHead.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return <BudgetClient initialData={budgetHeads} />;
}
