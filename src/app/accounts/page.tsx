import React from 'react';
import { prisma } from '@/lib/prisma';
import AccountsClient from './AccountsClient';

export default async function AccountsPage() {
  const data = await prisma.sMEWorkEntry.findMany({
    include: {
      sme: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return <AccountsClient initialData={data} />;
}
