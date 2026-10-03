import React from 'react';
import { prisma } from '@/lib/prisma';
import AccountsClient from './AccountsClient';

import { requireAuth } from '@/lib/auth';

export default async function AccountsPage() {
  await requireAuth(['ADMIN']);
  const data = await prisma.sMEWorkEntry.findMany({
    include: {
      sme: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const hrSalaries = await prisma.hRSalary.findMany({
    include: { hr: true },
    orderBy: { createdAt: 'desc' }
  });

  return <AccountsClient initialData={data} initialHrSalaries={hrSalaries} />;
}
