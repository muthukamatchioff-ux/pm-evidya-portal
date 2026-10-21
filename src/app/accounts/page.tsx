import React from 'react';
import { prisma } from '@/lib/prisma';
import AccountsClient from './AccountsClient';

import { requireAuth, getRole } from '@/lib/auth';

export const metadata = {
  title: 'Document Upload | PM e-Vidya Portal',
  description: 'Upload and manage mandatory SME compliance documents',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountsPage() {
  await requireAuth(['ADMIN', 'HIGHER_OFFICIAL_VIEWER']);
  const role = await getRole();
  const data = await prisma.sMEWorkEntry.findMany({
    include: {
      sme: true,
      payments: true,
      documents: {
        orderBy: { createdAt: 'desc' }
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  return <AccountsClient initialData={data} role={role} />;
}
